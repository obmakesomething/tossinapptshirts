const crypto = require('crypto');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const nodemailer = require('nodemailer');
const PDFDocument = require('pdfkit');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const OpenAI = require('openai');
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const https = require('https');
const axios = require('axios');
const { runPrintPipeline } = require('./printPipeline');
const { getPool, initializeDatabase } = require('./db');

const app = express();

// Trust proxy - required for Railway/reverse proxy environments
app.set('trust proxy', true);

// Security headers
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP for API server
  crossOriginEmbedderPolicy: false,
}));

// Compression for responses
app.use(compression());

// Trust proxy - Required for Railway deployment to get correct client IPs
app.set('trust proxy', 1);

// CORS
app.use(cors({ origin: true }));

// Body parser with size limit
app.use(express.json({ limit: '15mb' }));

// Global rate limiter: 100 requests per 15 minutes per IP
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(globalLimiter);

// Strict rate limiter for expensive operations
const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 requests per 15 minutes
  message: { error: 'Rate limit exceeded for this operation.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const logEvent = (level, event, payload) => {
  const entry = {
    ts: new Date().toISOString(),
    level,
    event,
    ...payload,
  };
  console.log(JSON.stringify(entry));
};

const formatError = (error) => ({
  message: error?.message || 'unknown_error',
  stack: error?.stack ? String(error.stack).split('\n').slice(0, 4).join(' | ') : undefined,
  name: error?.name,
  code: error?.code,
});
// Configuration constants (must be defined before middleware)
const PORT = process.env.PORT || 3000;
const REQUEST_TIMEOUT_MS = Number(process.env.REQUEST_TIMEOUT_MS) || 120000; // 2 minutes default

// Request timeout middleware
app.use((req, res, next) => {
  req.setTimeout(REQUEST_TIMEOUT_MS, () => {
    logEvent('error', 'request_timeout', {
      requestId: req.requestId,
      method: req.method,
      path: req.path,
      timeout: REQUEST_TIMEOUT_MS,
    });
    if (!res.headersSent) {
      res.status(408).json({ error: 'Request timeout' });
    }
  });
  next();
});

// Request ID and logging middleware
app.use((req, res, next) => {
  const incomingId = req.headers['x-request-id'];
  const requestId =
    typeof incomingId === 'string' && incomingId.trim().length > 0
      ? incomingId
      : crypto.randomUUID();
  req.requestId = requestId;
  res.setHeader('x-request-id', requestId);
  req._startAt = process.hrtime.bigint();
  logEvent('info', 'request_in', {
    requestId,
    method: req.method,
    path: req.path,
    userAgent: req.headers['user-agent'] || '',
  });
  res.on('finish', () => {
    const durationNs = process.hrtime.bigint() - req._startAt;
    logEvent('info', 'request_out', {
      requestId,
      method: req.method,
      path: req.path,
      status: res.statusCode,
      durationMs: Number(durationNs / BigInt(1e6)),
    });
  });
  next();
});
const IMAGE_BUCKET = process.env.S3_BUCKET || '';
const IMAGE_BASE_URL = process.env.S3_PUBLIC_BASE_URL || '';
const IMAGE_PREFIX = process.env.S3_IMAGE_PREFIX || 'uploads';
const PDF_PREFIX = process.env.S3_PDF_PREFIX || 'orders';
const OPENAI_IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1';
const OPENAI_IMAGE_QUALITY = process.env.OPENAI_IMAGE_QUALITY || 'medium';
const ORDER_OUTPUT_DIR = process.env.ORDER_OUTPUT_DIR || path.join(process.cwd(), 'order-output');
const CLIPDROP_API_KEY = process.env.CLIPDROP_API_KEY || '';
const KAKAO_WEBHOOK_URL = process.env.KAKAO_WEBHOOK_URL || '';
const KAKAO_WEBHOOK_TOKEN = process.env.KAKAO_WEBHOOK_TOKEN || '';

// mTLS configuration for Toss API
let httpsAgent;
function getHttpsAgent() {
  if (httpsAgent) return httpsAgent;

  const mtlsKeyBase64 = process.env.MTLS_KEY_BASE64;
  const mtlsCertBase64 = process.env.MTLS_CERT_BASE64;

  if (!mtlsKeyBase64 || !mtlsCertBase64) {
    console.warn('[mTLS] MTLS_KEY_BASE64 or MTLS_CERT_BASE64 not found in environment variables');
    return null;
  }

  try {
    const key = Buffer.from(mtlsKeyBase64, 'base64').toString('utf-8');
    const cert = Buffer.from(mtlsCertBase64, 'base64').toString('utf-8');

    httpsAgent = new https.Agent({
      key,
      cert,
      rejectUnauthorized: true, // Verify server certificate
    });

    console.log('[mTLS] HTTPS Agent configured successfully');
    return httpsAgent;
  } catch (error) {
    console.error('[mTLS] Failed to configure HTTPS Agent:', error);
    return null;
  }
}

let s3Client;
function resolveS3Endpoint() {
  let endpoint = process.env.S3_ENDPOINT || '';
  if (!endpoint) {
    const baseUrl = IMAGE_BASE_URL.replace(/\/$/, '');
    if (baseUrl.includes('storage.railway.app')) {
      endpoint = 'https://storage.railway.app';
    }
  }
  return endpoint;
}

let cachedS3Endpoint;
function getS3Client() {
  if (s3Client) return s3Client;
  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    return null;
  }
  const region = process.env.AWS_REGION || process.env.S3_REGION || 'us-east-1';
  const endpoint = resolveS3Endpoint();
  cachedS3Endpoint = endpoint;
  const forcePathStyle = String(process.env.S3_FORCE_PATH_STYLE || 'false') === 'true';
  s3Client = new S3Client({
    region,
    ...(endpoint ? { endpoint } : {}),
    forcePathStyle,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });
  return s3Client;
}

let openaiClient;
function getOpenAIClient() {
  if (openaiClient) return openaiClient;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is required for image generation.');
  }
  openaiClient = new OpenAI({ apiKey });
  return openaiClient;
}

function resolveBaseUrl() {
  if (IMAGE_BASE_URL) {
    const trimmed = IMAGE_BASE_URL.replace(/\/$/, '');
    if (
      trimmed === 'https://storage.railway.app' ||
      trimmed === 'http://storage.railway.app'
    ) {
      return IMAGE_BUCKET ? `https://${IMAGE_BUCKET}.storage.railway.app` : trimmed;
    }
    return trimmed;
  }
  const endpoint = process.env.S3_ENDPOINT || '';
  if (IMAGE_BUCKET && endpoint.includes('storage.railway.app')) {
    return `https://${IMAGE_BUCKET}.storage.railway.app`;
  }
  return '';
}

function buildPublicUrl(key) {
  const baseUrl = resolveBaseUrl();
  if (!baseUrl) return '';
  return `${baseUrl}/${key}`;
}

async function uploadToS3({ key, body, contentType }) {
  const client = getS3Client();
  if (!client || !IMAGE_BUCKET || !resolveBaseUrl()) {
    throw new Error('S3 configuration is missing. Check S3_BUCKET, S3_ENDPOINT, S3_PUBLIC_BASE_URL.');
  }
  try {
    await client.send(
      new PutObjectCommand({
        Bucket: IMAGE_BUCKET,
        Key: key,
        Body: body,
        ContentType: contentType,
      })
    );
  } catch (error) {
    logEvent('error', 's3_upload_failed', {
      bucket: IMAGE_BUCKET,
      key,
      endpoint: cachedS3Endpoint || process.env.S3_ENDPOINT || resolveS3Endpoint() || '',
      baseUrl: resolveBaseUrl(),
      forcePathStyle: String(process.env.S3_FORCE_PATH_STYLE || 'false'),
      region: process.env.AWS_REGION || process.env.S3_REGION || 'us-east-1',
      ...formatError(error),
    });
    throw error;
  }
  return buildPublicUrl(key);
}

function decodeDataUrl(dataUrl) {
  const match = dataUrl.match(/^data:(.+);base64,(.*)$/);
  if (!match) return null;
  return { mimeType: match[1], buffer: Buffer.from(match[2], 'base64') };
}

async function downloadToFile(url, destPath) {
  const response = await fetch(url);
  if (!response.ok) {
    logEvent('error', 'download_failed', {
      url,
      status: response.status,
      statusText: response.statusText,
    });
    throw new Error('download_failed');
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  await fsp.writeFile(destPath, buffer);
  return destPath;
}

async function downloadToBuffer(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      logEvent('warn', 'download_to_buffer_failed', {
        url,
        status: response.status,
      });
      return null;
    }
    return Buffer.from(await response.arrayBuffer());
  } catch (error) {
    logEvent('warn', 'download_to_buffer_error', {
      url,
      error: error.message,
    });
    return null;
  }
}

async function sendKakaoNotification(payload) {
  if (!KAKAO_WEBHOOK_URL) return;
  await fetch(KAKAO_WEBHOOK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(KAKAO_WEBHOOK_TOKEN ? { Authorization: `Bearer ${KAKAO_WEBHOOK_TOKEN}` } : {}),
    },
    body: JSON.stringify(payload),
  });
}

async function removeBackgroundClipdrop({ sourcePath, apiKey, outputPath }) {
  const endpoint = 'https://clipdrop-api.co/remove-background/v1';
  const form = new FormData();
  const buffer = await fsp.readFile(sourcePath);
  form.append('image_file', new Blob([buffer]), path.basename(sourcePath));
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
    },
    body: form,
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`clipdrop_remove_bg_failed: ${text}`);
  }
  const result = Buffer.from(await response.arrayBuffer());
  await fsp.writeFile(outputPath, result);
  return outputPath;
}

async function buildOrderPdf(order) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 48 });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Async processing wrapper
    (async () => {
      try {

      // Header
      doc.fontSize(18).text('Order Summary', { align: 'left' });
      doc.moveDown(0.5);
      doc.fontSize(11).fillColor('#333');

      const createdAt = order.createdAt || new Date().toISOString();
      doc.text(`Order ID: ${order.orderId || 'N/A'}`);
      doc.text(`Created At: ${createdAt}`);
      doc.text(`Channel: ${order.channel || 'Toss Miniapp'}`);
      doc.moveDown();

      // Customer Info
      doc.fontSize(13).text('Customer');
      doc.fontSize(11);
      if (order.customer) {
        doc.text(`Name: ${order.customer.name || ''}`);
        doc.text(`Phone: ${order.customer.phone || ''}`);
        doc.text(`Email: ${order.customer.email || ''}`);
      }
      doc.moveDown();

      // Shipping Info
      doc.fontSize(13).text('Shipping');
      doc.fontSize(11);
      if (order.shipping) {
        doc.text(`Recipient: ${order.shipping.name || order.customer?.name || ''}`);
        doc.text(`Phone: ${order.shipping.phone || order.customer?.phone || ''}`);
        doc.text(`Address1: ${order.shipping.address1 || ''}`);
        doc.text(`Address2: ${order.shipping.address2 || ''}`);
        doc.text(`City: ${order.shipping.city || ''}`);
        doc.text(`State: ${order.shipping.state || ''}`);
        doc.text(`Zip: ${order.shipping.zip || ''}`);
        doc.text(`Country: ${order.shipping.country || ''}`);
        doc.text(`Memo: ${order.shipping.memo || ''}`);
      }
      doc.moveDown();

      // Items with images
      doc.fontSize(13).text('Items');
      doc.fontSize(11);
      const items = Array.isArray(order.items) ? order.items : [];

      for (let index = 0; index < items.length; index++) {
        const item = items[index];

        // Check if we need a new page
        if (doc.y > 650) {
          doc.addPage();
        }

        doc.fontSize(12).fillColor('#000').text(`Item ${index + 1}`, { underline: true });
        doc.fontSize(10).fillColor('#333');
        doc.text(`- Product: ${item.productName || ''}`);
        doc.text(`- Model: ${item.modelName || ''}`);
        doc.text(`- Color: ${item.color || ''}`);
        doc.text(`- Size: ${item.size || ''}`);
        doc.text(`- Quantity: ${item.quantity || ''}`);
        doc.text(`- Print Method: ${item.print?.method || ''}`);
        doc.text(`- Print Placement: ${item.print?.placement || ''}`);
        doc.text(`- Print Size: ${item.print?.sizeLabel || ''}`);
        doc.text(`- Print Dimension: ${item.print?.sizeCm || ''}`);

        if (item.text?.text) {
          doc.text(
            `- Text Layer: "${item.text.text}" (${item.text.fontWeight || ''}, ${item.text.fontSize || ''}px)`
          );
        }
        doc.moveDown(0.5);

        // Design Image
        if (item.designUrl) {
          const designBuffer = await downloadToBuffer(item.designUrl);
          if (designBuffer) {
            try {
              doc.fontSize(11).fillColor('#1E40AF').text('Design Image:', { continued: false });
              doc.moveDown(0.3);

              const maxWidth = 250;
              const maxHeight = 250;

              if (doc.y + maxHeight > 750) {
                doc.addPage();
              }

              doc.image(designBuffer, {
                fit: [maxWidth, maxHeight],
                align: 'left',
              });
              doc.moveDown(0.5);
            } catch (err) {
              logEvent('warn', 'pdf_image_embed_failed', {
                orderId: order.orderId,
                itemIndex: index,
                type: 'design',
                error: err.message,
              });
              doc.fontSize(10).fillColor('#DC2626').text(`Design URL: ${item.designUrl}`);
            }
          } else {
            doc.fontSize(10).fillColor('#6B7280').text(`Design URL: ${item.designUrl}`);
          }
          doc.moveDown(0.5);
        }

        // Mockup Images
        if (Array.isArray(item.mockupUrls) && item.mockupUrls.length > 0) {
          doc.fontSize(11).fillColor('#1E40AF').text('Mockup Images:', { continued: false });
          doc.moveDown(0.3);

          for (let mi = 0; mi < item.mockupUrls.length; mi++) {
            const mockupUrl = item.mockupUrls[mi];
            const mockupBuffer = await downloadToBuffer(mockupUrl);

            if (mockupBuffer) {
              try {
                const maxWidth = 200;
                const maxHeight = 200;

                if (doc.y + maxHeight > 750) {
                  doc.addPage();
                }

                doc.fontSize(9).fillColor('#6B7280').text(`Mockup ${mi + 1}:`, { continued: false });
                doc.moveDown(0.2);
                doc.image(mockupBuffer, {
                  fit: [maxWidth, maxHeight],
                  align: 'left',
                });
                doc.moveDown(0.5);
              } catch (err) {
                logEvent('warn', 'pdf_mockup_embed_failed', {
                  orderId: order.orderId,
                  itemIndex: index,
                  mockupIndex: mi,
                  error: err.message,
                });
                doc.fontSize(9).fillColor('#DC2626').text(`Mockup ${mi + 1} URL: ${mockupUrl}`);
              }
            } else {
              doc.fontSize(9).fillColor('#6B7280').text(`Mockup ${mi + 1} URL: ${mockupUrl}`);
            }
          }
          doc.moveDown(0.5);
        }

        doc.moveDown(1);
      }

      // Pricing
      if (doc.y > 700) {
        doc.addPage();
      }
      doc.fontSize(13).fillColor('#000').text('Pricing');
      doc.fontSize(11).fillColor('#333');
      if (order.pricing) {
        doc.text(`Unit Price: ${order.pricing.unitPrice || ''}`);
        doc.text(`Quantity: ${order.pricing.quantity || ''}`);
        doc.text(`Shipping: ${order.pricing.shipping || ''}`);
        doc.text(`Total: ${order.pricing.total || ''}`);
      }

      // Footer note
      doc.moveDown();
      doc.fontSize(11).fillColor('#6B7280');
      doc.text(
        '※ 출력 이미지에 대한 최종 판단은 주문자가 진행합니다. 주문서 메일을 꼭 확인해 주세요.'
      );

        doc.end();
      } catch (error) {
        doc.end();
        reject(error);
      }
    })();
  });
}

function getMailer() {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!user || !pass) return null;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT || 465),
    secure: String(process.env.SMTP_SECURE || 'true') === 'true',
    auth: { user, pass },
  });
}

// Serve static mockup images
app.use('/mockups', express.static(path.join(process.cwd(), 'server-public/mockups')));

app.get('/health', (_req, res) => {
  const health = {
    ok: true,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
    },
    environment: {
      nodeVersion: process.version,
      platform: process.platform,
      pid: process.pid,
    },
    services: {
      s3: Boolean(getS3Client() && IMAGE_BUCKET),
      openai: Boolean(process.env.OPENAI_API_KEY),
      smtp: Boolean(process.env.SMTP_USER && process.env.SMTP_PASS),
      clipdrop: Boolean(CLIPDROP_API_KEY),
    },
  };
  res.json(health);
});

app.post('/v1/images/upload', strictLimiter, async (req, res) => {
  try {
    const { filename, dataUrl, base64, contentType, returnBase64 } = req.body || {};
    let buffer = null;
    let mimeType = contentType || 'image/jpeg';

    if (dataUrl) {
      const decoded = decodeDataUrl(dataUrl);
      if (!decoded) return res.status(400).json({ error: 'Invalid dataUrl.' });
      buffer = decoded.buffer;
      mimeType = decoded.mimeType || mimeType;
    } else if (base64) {
      buffer = Buffer.from(base64, 'base64');
    } else {
      return res.status(400).json({ error: 'No image payload provided.' });
    }

    const safeName = path
      .parse(filename || 'upload')
      .name.replace(/[^a-zA-Z0-9-_]/g, '');
    const extension = mimeType.includes('png')
      ? 'png'
      : mimeType.includes('webp')
      ? 'webp'
      : 'jpg';
    const key = `${IMAGE_PREFIX}/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}-${safeName || 'upload'}.${extension}`;
    const url = await uploadToS3({ key, body: buffer, contentType: mimeType });
    logEvent('info', 'image_upload_result', {
      requestId: req.requestId,
      url,
      bytes: buffer.length,
      mimeType,
      returnBase64: !!returnBase64,
    });

    const result = { url, requestId: req.requestId };
    if (returnBase64) {
      result.dataUrl = `data:${mimeType};base64,${buffer.toString('base64')}`;
    }
    res.json(result);
  } catch (error) {
    logEvent('error', 'image_upload_failed', {
      requestId: req.requestId,
      ...formatError(error),
    });
    res.status(500).json({ error: error.message || 'Upload failed.', requestId: req.requestId });
  }
});

app.post('/v1/images/generate', strictLimiter, async (req, res) => {
  try {
    const { prompt, numberOfImages = 1, aspectRatio = '1:1', returnBase64 } = req.body || {};
    if (!prompt) return res.status(400).json({ error: 'Prompt is required.' });
    const count = Math.max(1, Math.min(4, Number(numberOfImages) || 1));
    const sizeMap = {
      '1:1': '1024x1024',
      '4:3': '1536x1024',
      '3:4': '1024x1536',
    };
    const size = sizeMap[aspectRatio] || '1024x1024';

    // Add white background instruction to prompt for easier background removal
    const enhancedPrompt = `${prompt}, on a plain white background`;

    const client = getOpenAIClient();
    logEvent('info', 'image_generate_request', {
      requestId: req.requestId,
      model: OPENAI_IMAGE_MODEL,
      quality: OPENAI_IMAGE_QUALITY,
      size,
      count,
      originalPrompt: prompt,
      enhancedPrompt: enhancedPrompt,
      promptLength: enhancedPrompt.length,
      promptSnippet: enhancedPrompt.slice(0, 120),
      returnBase64: !!returnBase64,
    });

    const response = await client.images.generate({
      model: OPENAI_IMAGE_MODEL,
      prompt: enhancedPrompt,
      size,
      n: count,
      ...(OPENAI_IMAGE_QUALITY ? { quality: OPENAI_IMAGE_QUALITY } : {}),
    });

    const results = [];
    const generated = response?.data || [];
    for (const item of generated) {
      let buffer = null;
      let actualMimeType = 'unknown';
      if (item.b64_json) {
        buffer = Buffer.from(item.b64_json, 'base64');
      } else if (item.url) {
        const imageResponse = await fetch(item.url);
        if (!imageResponse.ok) continue;
        actualMimeType = imageResponse.headers.get('content-type') || 'unknown';
        buffer = Buffer.from(await imageResponse.arrayBuffer());
      }
      if (!buffer) continue;

      // Check actual format from buffer signature
      const isPNG = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47;
      const isJPEG = buffer[0] === 0xFF && buffer[1] === 0xD8;
      const detectedFormat = isPNG ? 'PNG' : isJPEG ? 'JPEG' : 'unknown';

      logEvent('info', 'openai_image_format', {
        requestId: req.requestId,
        actualMimeType,
        detectedFormat,
        isPNG,
        bufferHeader: buffer.slice(0, 4).toString('hex'),
      });

      // Force PNG mime type for storage
      const mimeType = 'image/png';

      const key = `${IMAGE_PREFIX}/openai-${Date.now()}-${Math.random().toString(36).slice(2)}.png`;
      const url = await uploadToS3({ key, body: buffer, contentType: mimeType });
      const result = { url, mimeType };
      if (returnBase64) {
        result.dataUrl = `data:${mimeType};base64,${buffer.toString('base64')}`;
      }
      results.push(result);
    }
    if (!results.length) {
      throw new Error('image_generate_empty');
    }

    logEvent('info', 'image_generate_result', {
      requestId: req.requestId,
      imageCount: results.length,
      firstUrl: results[0]?.url || '',
    });
    res.json({ images: results, size, requestId: req.requestId });
  } catch (error) {
    logEvent('error', 'image_generate_failed', {
      requestId: req.requestId,
      status: error.status,
      param: error.param,
      type: error.type,
      ...formatError(error),
    });
    res.status(500).json({ error: error.message || 'OpenAI image failed.', requestId: req.requestId });
  }
});

app.post('/v1/images/remove-background', strictLimiter, async (req, res) => {
  try {
    const { imageUrl, dataUrl, filename, returnBase64 } = req.body || {};
    if (!CLIPDROP_API_KEY) {
      return res.status(500).json({ error: 'CLIPDROP_API_KEY is required.' });
    }
    if (!imageUrl && !dataUrl) {
      return res.status(400).json({ error: 'imageUrl or dataUrl is required.' });
    }
    logEvent('info', 'remove_background_request', {
      requestId: req.requestId,
      sourceType: imageUrl ? 'url' : 'dataUrl',
      imageHost: imageUrl ? new URL(imageUrl).host : '',
      filename: filename || '',
      returnBase64: !!returnBase64,
    });
    const tempDir = path.join(ORDER_OUTPUT_DIR, 'temp');
    await fsp.mkdir(tempDir, { recursive: true });
    const baseName = filename || `remove-bg-${Date.now()}`;
    const inputPath = path.join(tempDir, `${baseName}.png`);
    if (dataUrl) {
      const decoded = decodeDataUrl(dataUrl);
      if (!decoded) {
        return res.status(400).json({ error: 'Invalid dataUrl.' });
      }
      await fsp.writeFile(inputPath, decoded.buffer);
    } else {
      await downloadToFile(imageUrl, inputPath);
    }

    const outputPath = path.join(tempDir, `${baseName}-nobg.png`);
    await removeBackgroundClipdrop({
      sourcePath: inputPath,
      apiKey: CLIPDROP_API_KEY,
      outputPath,
    });
    const outputBuffer = await fsp.readFile(outputPath);
    const key = `${IMAGE_PREFIX}/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}-${baseName}.png`;
    const url = await uploadToS3({ key, body: outputBuffer, contentType: 'image/png' });
    logEvent('info', 'remove_background_result', {
      requestId: req.requestId,
      url,
      bytes: outputBuffer.length,
    });

    const result = { url, requestId: req.requestId };
    if (returnBase64) {
      result.dataUrl = `data:image/png;base64,${outputBuffer.toString('base64')}`;
    }
    res.json(result);
  } catch (error) {
    logEvent('error', 'remove_background_failed', {
      requestId: req.requestId,
      ...formatError(error),
    });
    res.status(500).json({ error: error.message || 'Remove background failed.', requestId: req.requestId });
  }
});

// Image crop endpoint
app.post('/v1/images/crop', strictLimiter, async (req, res) => {
  try {
    const { dataUrl, crop, returnBase64 } = req.body || {};

    if (!dataUrl) {
      return res.status(400).json({ error: 'dataUrl is required.' });
    }
    if (!crop || typeof crop.x !== 'number' || typeof crop.y !== 'number' ||
        typeof crop.width !== 'number' || typeof crop.height !== 'number') {
      return res.status(400).json({ error: 'crop object with x, y, width, height is required.' });
    }

    logEvent('info', 'crop_request', {
      requestId: req.requestId,
      crop,
      returnBase64: !!returnBase64,
    });

    const decoded = decodeDataUrl(dataUrl);
    if (!decoded) {
      return res.status(400).json({ error: 'Invalid dataUrl.' });
    }

    const sharp = require('sharp');

    // Crop the image
    const croppedBuffer = await sharp(decoded.buffer)
      .extract({
        left: Math.round(crop.x),
        top: Math.round(crop.y),
        width: Math.round(crop.width),
        height: Math.round(crop.height),
      })
      .png()
      .toBuffer();

    // Upload to S3
    const key = `${IMAGE_PREFIX}/${Date.now()}-${Math.random().toString(36).slice(2)}-cropped.png`;
    const url = await uploadToS3({ key, body: croppedBuffer, contentType: 'image/png' });

    logEvent('info', 'crop_result', {
      requestId: req.requestId,
      url,
      bytes: croppedBuffer.length,
    });

    const result = { url, requestId: req.requestId };
    if (returnBase64) {
      result.dataUrl = `data:image/png;base64,${croppedBuffer.toString('base64')}`;
    }
    res.json(result);
  } catch (error) {
    logEvent('error', 'crop_failed', {
      requestId: req.requestId,
      ...formatError(error),
    });
    res.status(500).json({ error: error.message || 'Crop failed.', requestId: req.requestId });
  }
});

// Style transfer endpoint using OpenAI DALL-E
app.post('/v1/images/style-transfer', strictLimiter, async (req, res) => {
  try {
    const { dataUrl, style, returnBase64 } = req.body || {};

    console.log('[StyleTransfer] Request received:', {
      hasDataUrl: !!dataUrl,
      dataUrlLength: dataUrl?.length || 0,
      style,
      returnBase64,
    });

    if (!dataUrl) {
      console.error('[StyleTransfer] Missing dataUrl');
      return res.status(400).json({ error: 'dataUrl is required.' });
    }
    if (!style) {
      console.error('[StyleTransfer] Missing style');
      return res.status(400).json({ error: 'style is required.' });
    }
    if (!process.env.OPENAI_API_KEY) {
      console.error('[StyleTransfer] Missing OPENAI_API_KEY');
      return res.status(500).json({ error: 'OPENAI_API_KEY is required.' });
    }

    logEvent('info', 'style_transfer_request', {
      requestId: req.requestId,
      style,
      returnBase64: !!returnBase64,
      dataUrlLength: dataUrl.length,
    });

    const client = getOpenAIClient();

    // Style-specific prompts with CRITICAL instruction to preserve original image structure
    // IMPORTANT: Tell the model to ONLY change the style, NOT the content/shape/form
    const stylePrompts = {
      'watercolor': 'watercolor painting style, soft and flowing watercolor textures, gentle color blending, artistic brush strokes, on white background',
      'sketch': 'pencil sketch style, hand-drawn lines, black and white illustration, artistic sketching, on white background',
      'cartoon': 'cartoon illustration style, bold outlines, vibrant colors, comic book art style, on white background',
      'pixel': '8-bit pixel art style, retro video game graphics, pixelated design, digital pixel aesthetic, on white background',
      'oil': 'oil painting style, thick paint texture, visible brush strokes, classical painting technique, on white background',
      'minimal': 'minimal line art style, simple clean lines, minimalist design, elegant simplicity, on white background',
    };

    const styleDescription = stylePrompts[style] || stylePrompts['watercolor'];
    // CRITICAL: Add explicit instruction to preserve the original image's shape, form, and composition
    // Only change the artistic style, not the content itself
    const enhancedPrompt = `Convert the original image to ${styleDescription}. IMPORTANT: Keep the exact same subject, shape, composition, and layout as the original image. Only change the artistic style and rendering technique. Do not add, remove, or modify any elements from the original image.`;

    logEvent('info', 'style_transfer_generate', {
      requestId: req.requestId,
      style,
      model: OPENAI_IMAGE_MODEL,
      prompt: enhancedPrompt,
    });

    console.log('[StyleTransfer] Calling OpenAI with prompt:', enhancedPrompt);

    // Call OpenAI DALL-E for style transfer (using generate endpoint like existing code)
    const response = await client.images.generate({
      model: OPENAI_IMAGE_MODEL,
      prompt: enhancedPrompt,
      size: '1024x1024',
      n: 1,
      ...(OPENAI_IMAGE_QUALITY ? { quality: OPENAI_IMAGE_QUALITY } : {}),
    });

    console.log('[StyleTransfer] OpenAI response received');
    console.log('[StyleTransfer] Response data keys:', Object.keys(response.data[0] || {}));

    const generatedUrl = response.data[0]?.url;
    const generatedB64 = response.data[0]?.b64_json;

    let styledBuffer;

    if (generatedUrl) {
      console.log('[StyleTransfer] Generated URL:', generatedUrl.substring(0, 50) + '...');

      // Download the generated image
      const tempDir = path.join(ORDER_OUTPUT_DIR, 'temp');
      await fsp.mkdir(tempDir, { recursive: true });
      const tempPath = path.join(tempDir, `style-${Date.now()}.png`);

      console.log('[StyleTransfer] Downloading image to:', tempPath);
      await downloadToFile(generatedUrl, tempPath);
      styledBuffer = await fsp.readFile(tempPath);
    } else if (generatedB64) {
      console.log('[StyleTransfer] Received base64 image from OpenAI');
      styledBuffer = Buffer.from(generatedB64, 'base64');
    } else {
      console.error('[StyleTransfer] No URL or b64_json in OpenAI response');
      console.error('[StyleTransfer] Response data:', JSON.stringify(response.data[0]));
      throw new Error('No image generated from OpenAI.');
    }

    console.log('[StyleTransfer] Image downloaded, size:', styledBuffer.length, 'bytes');

    // Upload to S3
    const key = `${IMAGE_PREFIX}/${Date.now()}-${Math.random().toString(36).slice(2)}-styled.png`;
    console.log('[StyleTransfer] Uploading to S3:', key);
    const url = await uploadToS3({ key, body: styledBuffer, contentType: 'image/png' });

    console.log('[StyleTransfer] S3 URL:', url);

    logEvent('info', 'style_transfer_result', {
      requestId: req.requestId,
      style,
      url,
      bytes: styledBuffer.length,
    });

    const result = { url, requestId: req.requestId };
    if (returnBase64) {
      result.dataUrl = `data:image/png;base64,${styledBuffer.toString('base64')}`;
      console.log('[StyleTransfer] Added base64 data, length:', result.dataUrl.length);
    }

    console.log('[StyleTransfer] Sending response with keys:', Object.keys(result));
    res.json(result);
  } catch (error) {
    console.error('[StyleTransfer] Error occurred:', error.message);
    console.error('[StyleTransfer] Stack trace:', error.stack);
    logEvent('error', 'style_transfer_failed', {
      requestId: req.requestId,
      ...formatError(error),
    });
    res.status(500).json({ error: error.message || 'Style transfer failed.', requestId: req.requestId });
  }
});

app.post('/v1/print-files/process', strictLimiter, async (req, res) => {
  try {
    const payload = req.body || {};
    logEvent('info', 'print_pipeline_request', {
      requestId: req.requestId,
      orderId: payload.order_id || '',
      targetWidth: payload.target_width_px,
      targetHeight: payload.target_height_px,
    });
    const result = await runPrintPipeline({
      master_png_path: payload.master_png_path,
      order_id: payload.order_id,
      target_width_px: payload.target_width_px,
      target_height_px: payload.target_height_px,
      clipdrop_api_key: payload.clipdrop_api_key || CLIPDROP_API_KEY,
      output_dir: payload.output_dir || ORDER_OUTPUT_DIR,
      allow_warn_to_pass: false,
    });
    res.json({ ...result, requestId: req.requestId });
  } catch (error) {
    logEvent('error', 'print_pipeline_failed', {
      requestId: req.requestId,
      ...formatError(error),
    });
    res.status(500).json({ error: error.message || 'pipeline_failed', requestId: req.requestId });
  }
});

app.post('/v1/orders/submit', strictLimiter, async (req, res) => {
  try {
    const order = req.body || {};
    logEvent('info', 'order_submit_request', {
      requestId: req.requestId,
      orderId: order.orderId || '',
      totalQuantity: order.pricing?.quantity || 0,
      pipelineEnabled: Boolean(order.pipeline?.enabled),
    });
    const mailer = getMailer();
    if (!mailer) {
      return res.status(500).json({ error: 'SMTP configuration is missing.' });
    }

    // Calculate actual print sizes for all items
    if (Array.isArray(order.items)) {
      for (const item of order.items) {
        // If item has scale value, calculate actual print size in cm
        if (item.print?.scale !== undefined && item.productName && item.size) {
          const category = getGarmentCategory(item.productName);
          const measurements = getGarmentMeasurements(category, item.size);

          if (measurements) {
            const scale = Math.max(0, Math.min(1, Number(item.print.scale)));
            const widthCm = Math.round(measurements.printableWidth * scale * 10) / 10;
            const heightCm = Math.round(measurements.printableHeight * scale * 10) / 10;

            // Add calculated size to item
            item.print.sizeCm = `${widthCm}cm × ${heightCm}cm`;
            item.print.calculatedWidth = widthCm;
            item.print.calculatedHeight = heightCm;

            logEvent('info', 'print_size_calculated', {
              orderId: order.orderId,
              itemProduct: item.productName,
              scale,
              sizeCm: item.print.sizeCm,
            });
          }
        }
      }
    }

    // Auto-enable pipeline for print-ready PNG generation and upscaling
    const pipelineEnabled = order.pipeline?.enabled !== false; // Default: true
    let pipelineResult = null;

    if (pipelineEnabled) {
      const orderId = order.orderId || String(Date.now());
      const workDir = path.join(ORDER_OUTPUT_DIR, orderId);
      await fsp.mkdir(workDir, { recursive: true });

      // Get source image URL (design with text embedded)
      let masterPath = order.pipeline?.masterPngPath || null;
      if (!masterPath) {
        const sourceUrl =
          order.pipeline?.masterPngUrl ||
          order.masterPngUrl ||
          order.items?.[0]?.designUrl ||
          '';
        if (sourceUrl) {
          const downloadPath = path.join(workDir, 'master_input.png');
          // Handle both HTTP URLs and data URLs
          if (sourceUrl.startsWith('data:')) {
            const decoded = decodeDataUrl(sourceUrl);
            if (decoded) {
              await fsp.writeFile(downloadPath, decoded.buffer);
            } else {
              throw new Error('Invalid dataUrl for pipeline master image.');
            }
          } else {
            await downloadToFile(sourceUrl, downloadPath);
          }
          masterPath = downloadPath;
        }
      }

      if (masterPath) {
        try {
          // Default upscaling dimensions for apparel printing (A4-sized print)
          const targetWidth = order.pipeline?.targetWidthPx || 2480; // A4 width at 300 DPI
          const targetHeight = order.pipeline?.targetHeightPx || 3508; // A4 height at 300 DPI

          pipelineResult = await runPrintPipeline({
            master_png_path: masterPath,
            order_id: orderId,
            target_width_px: targetWidth,
            target_height_px: targetHeight,
            clipdrop_api_key: CLIPDROP_API_KEY,
            output_dir: ORDER_OUTPUT_DIR,
            allow_warn_to_pass: true, // Allow warnings to pass, only fail on errors
          });

          logEvent('info', 'pipeline_completed', {
            orderId,
            status: pipelineResult.status,
            qcStatus: pipelineResult.qc?.status,
            outputPath: pipelineResult.output_path,
          });
        } catch (pipelineError) {
          logEvent('error', 'pipeline_failed', {
            orderId,
            error: pipelineError.message,
          });
          // Continue with order even if pipeline fails
        }
      }
    }

    const pdfBuffer = await buildOrderPdf(order);
    const pdfName = `order-${order.orderId || Date.now()}.pdf`;

    let pdfUrl = '';
    if (order.storePdf) {
      const key = `${PDF_PREFIX}/${pdfName}`;
      pdfUrl = await uploadToS3({ key, body: pdfBuffer, contentType: 'application/pdf' });
    }

    const adminTo = process.env.ORDER_EMAIL_TO;
    if (!adminTo) return res.status(500).json({ error: 'ORDER_EMAIL_TO is required.' });

    const customerEmail = order.customer?.email || '';
    const customerName = order.customer?.name || '주문자';
    const baseSubject = `🎽 새 주문: ${order.orderId || ''} - ${customerName}`;

    // Build detailed email body for manufacturer
    const shippingAddress = order.shipping
      ? `${order.shipping.address1 || ''} ${order.shipping.address2 || ''}, ${order.shipping.city || ''} ${order.shipping.state || ''} ${order.shipping.zip || ''} ${order.shipping.country || ''}`
      : '배송 주소 정보 없음';

    const shippingRecipient = order.shipping?.name || customerName;
    const shippingPhone = order.shipping?.phone || order.customer?.phone || '';
    const shippingMemo = order.shipping?.memo || '';

    const itemsSummary = (order.items || [])
      .map((item, idx) => {
        let line = `${idx + 1}. ${item.productName || '제품'} - ${item.modelName || ''} / ${item.color || ''} / ${item.size || ''} / ${item.quantity || 0}개`;

        // Add print size if available
        if (item.print?.sizeCm) {
          line += `\n   프린팅 크기: ${item.print.sizeCm}`;
        }
        if (item.print?.placement) {
          line += ` (${item.print.placement === 'front' ? '앞면' : '뒷면'})`;
        }

        return line;
      })
      .join('\n');

    const pipelineInfo = pipelineResult
      ? `\n인쇄 파일 처리: ${pipelineResult.status} (QC: ${pipelineResult.qc?.status || 'N/A'})`
      : '';

    const bodyText = `안녕하세요,

새로운 주문이 접수되었습니다.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📦 주문 정보
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
주문번호: ${order.orderId || 'N/A'}
주문일시: ${order.createdAt || new Date().toISOString()}
주문자: ${customerName}
연락처: ${order.customer?.phone || ''}
이메일: ${customerEmail || ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 배송 정보
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
수령인: ${shippingRecipient}
전화번호: ${shippingPhone}
주소: ${shippingAddress}
배송 메모: ${shippingMemo || '없음'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🛍️ 주문 상품
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${itemsSummary}

총 수량: ${order.pricing?.quantity || 0}개
총 금액: ${order.pricing?.total || ''}원
${pipelineInfo}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📎 첨부 파일
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- 주문서 PDF (상세 정보, 디자인 이미지, 목업 이미지 포함)${pipelineResult?.output_path ? '\n- 인쇄용 PNG 파일 (업스케일링 완료)' : ''}
${pdfUrl ? `\n📄 PDF 다운로드: ${pdfUrl}` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ 중요 안내
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
출력 이미지에 대한 최종 판단은 주문자가 진행합니다.
첨부된 주문서를 꼭 확인해 주세요.

※ 제작 완료 예정일과 발송 방법을 회신해 주시기 바랍니다.

감사합니다.`;

    // Prepare attachments
    const attachments = [
      {
        filename: pdfName,
        content: pdfBuffer,
      },
    ];

    // Attach print-ready PNG if pipeline generated it
    if (pipelineResult?.output_path && fs.existsSync(pipelineResult.output_path)) {
      try {
        const pngBuffer = await fsp.readFile(pipelineResult.output_path);
        const pngName = `print-ready-${order.orderId || Date.now()}.png`;
        attachments.push({
          filename: pngName,
          content: pngBuffer,
        });
      } catch (pngErr) {
        logEvent('warn', 'png_attachment_failed', {
          orderId: order.orderId,
          error: pngErr.message,
        });
      }
    }

    await mailer.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: adminTo,
      subject: baseSubject,
      text: bodyText,
      attachments,
    });

    if (customerEmail) {
      const customerBodyText = `${customerName}님, 안녕하세요.

주문이 정상적으로 접수되었습니다.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📦 주문 정보
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
주문번호: ${order.orderId || 'N/A'}
주문일시: ${order.createdAt || new Date().toISOString()}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 배송 정보
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
수령인: ${shippingRecipient}
전화번호: ${shippingPhone}
주소: ${shippingAddress}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🛍️ 주문 상품
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${itemsSummary}

총 수량: ${order.pricing?.quantity || 0}개
총 금액: ${order.pricing?.total || ''}원

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📎 첨부 파일
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
주문 내역서 PDF가 첨부되어 있습니다.
${pdfUrl ? `\n📄 PDF 다운로드: ${pdfUrl}` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ 안내사항
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
제작 완료 예정일은 거래처에서 회신 예정입니다.
추가 문의사항이 있으시면 답장해 주세요.

감사합니다.`;

      await mailer.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: customerEmail,
        subject: `✅ 주문 접수 완료: ${order.orderId || ''}`,
        text: customerBodyText,
        attachments: [
          {
            filename: pdfName,
            content: pdfBuffer,
          },
        ],
      });
    }

    await sendKakaoNotification({
      order_id: order.orderId || '',
      customer: order.customer?.name || '',
      total: order.pricing?.total || '',
      status: 'submitted',
    });

    res.json({ ok: true, pdfUrl, pipeline: pipelineResult, requestId: req.requestId });
  } catch (error) {
    logEvent('error', 'order_submit_failed', {
      requestId: req.requestId,
      ...formatError(error),
    });
    res.status(500).json({ error: error.message || 'Order submit failed.', requestId: req.requestId });
  }
});

// ============================================
// Print Size Calculator Data & Functions
// ============================================

const garmentSizesData = {
  tshirt: [
    { size: 'XS', chestWidth: 44, bodyLength: 63, printableWidth: 28, printableHeight: 35 },
    { size: 'S', chestWidth: 47, bodyLength: 66, printableWidth: 30, printableHeight: 37 },
    { size: 'M', chestWidth: 50, bodyLength: 69, printableWidth: 32, printableHeight: 40 },
    { size: 'L', chestWidth: 53, bodyLength: 72, printableWidth: 34, printableHeight: 42 },
    { size: 'XL', chestWidth: 56, bodyLength: 75, printableWidth: 36, printableHeight: 44 },
    { size: '2XL', chestWidth: 59, bodyLength: 78, printableWidth: 38, printableHeight: 46 },
    { size: '3XL', chestWidth: 62, bodyLength: 81, printableWidth: 40, printableHeight: 48 },
    { size: '4XL', chestWidth: 65, bodyLength: 84, printableWidth: 42, printableHeight: 50 },
  ],
  hoodie: [
    { size: 'S', chestWidth: 52, bodyLength: 68, printableWidth: 32, printableHeight: 38 },
    { size: 'M', chestWidth: 55, bodyLength: 71, printableWidth: 34, printableHeight: 41 },
    { size: 'L', chestWidth: 58, bodyLength: 74, printableWidth: 36, printableHeight: 43 },
    { size: 'XL', chestWidth: 61, bodyLength: 77, printableWidth: 38, printableHeight: 45 },
    { size: '2XL', chestWidth: 64, bodyLength: 80, printableWidth: 40, printableHeight: 47 },
    { size: '3XL', chestWidth: 67, bodyLength: 83, printableWidth: 42, printableHeight: 49 },
    { size: '4XL', chestWidth: 70, bodyLength: 86, printableWidth: 44, printableHeight: 51 },
  ],
  sweatshirt: [
    { size: 'S', chestWidth: 52, bodyLength: 68, printableWidth: 32, printableHeight: 38 },
    { size: 'M', chestWidth: 55, bodyLength: 71, printableWidth: 34, printableHeight: 41 },
    { size: 'L', chestWidth: 58, bodyLength: 74, printableWidth: 36, printableHeight: 43 },
    { size: 'XL', chestWidth: 61, bodyLength: 77, printableWidth: 38, printableHeight: 45 },
    { size: '2XL', chestWidth: 64, bodyLength: 80, printableWidth: 40, printableHeight: 47 },
    { size: '3XL', chestWidth: 67, bodyLength: 83, printableWidth: 42, printableHeight: 49 },
    { size: '4XL', chestWidth: 70, bodyLength: 86, printableWidth: 44, printableHeight: 51 },
  ],
  ecobag: [
    { size: 'ONE SIZE', chestWidth: 35, bodyLength: 40, printableWidth: 28, printableHeight: 32 },
  ],
};

const printOptionsData = [
  { id: 'logo', label: '로고 (10cm 미만)', description: '작은 로고·심플', price: 2500, designScale: 0.35 },
  { id: 'a5', label: 'A5 (10~15cm)', description: '중간 크기', price: 5500, designScale: 0.5 },
  { id: 'a4', label: 'A4 (15~28cm)', description: '일반 포스터 크기', price: 7500, designScale: 0.7 },
  { id: 'a3', label: 'A3 (최대)', description: '큰 전면 인쇄', price: 9500, designScale: 0.9 },
];

function getGarmentCategory(productName) {
  const name = (productName || '').toLowerCase();
  if (name.includes('후드') || name.includes('hoodie')) return 'hoodie';
  if (name.includes('맨투맨') || name.includes('sweatshirt')) return 'sweatshirt';
  if (name.includes('에코백') || name.includes('ecobag') || name.includes('bag')) return 'ecobag';
  return 'tshirt';
}

function getGarmentMeasurements(category, size) {
  const sizeList = garmentSizesData[category];
  if (!sizeList) return null;
  return sizeList.find((s) => s.size === size) || null;
}

function calculatePrintSize(garmentMeasurements, printOption, placement = 'front') {
  const { printableWidth, printableHeight } = garmentMeasurements;
  const { designScale, label } = printOption;

  const widthCm = Math.round(printableWidth * designScale * 10) / 10;
  const heightCm = Math.round(printableHeight * designScale * 10) / 10;

  const warnings = [];

  if (widthCm > printableWidth - 2) {
    warnings.push('프린팅 영역이 최대 크기에 가깝습니다.');
  }

  if (widthCm < 8) {
    warnings.push('프린팅이 너무 작아 세부 사항이 흐릿할 수 있습니다.');
  }

  if (placement === 'back') {
    warnings.push('뒷면 인쇄는 앞면보다 위치 조정이 제한적일 수 있습니다.');
  }

  const description = `${label} 크기로 ${garmentMeasurements.size} 사이즈에 프린팅 시 약 ${widthCm}cm × ${heightCm}cm 크기로 인쇄됩니다.`;

  return {
    widthCm,
    heightCm,
    description,
    warnings,
    printableArea: {
      maxWidthCm: printableWidth,
      maxHeightCm: printableHeight,
    },
  };
}

// ============================================
// Print Size Calculation API
// ============================================

app.post('/v1/print/calculate-size', (req, res) => {
  try {
    const { productName, garmentSize, printOptionId, scale, placement } = req.body || {};

    logEvent('info', 'print_size_calc_request', {
      requestId: req.requestId,
      productName,
      garmentSize,
      printOptionId,
      scale,
      placement,
    });

    // Validate required fields
    if (!productName || !garmentSize) {
      return res.status(400).json({
        error: 'Missing required fields: productName, garmentSize',
      });
    }

    if (!printOptionId && (scale === undefined || scale === null)) {
      return res.status(400).json({
        error: 'Either printOptionId or scale (0.0-1.0) is required',
      });
    }

    // Get garment category and measurements
    const category = getGarmentCategory(productName);
    const garmentMeasurements = getGarmentMeasurements(category, garmentSize);

    if (!garmentMeasurements) {
      return res.status(404).json({
        error: `Size '${garmentSize}' not found for category '${category}'`,
        availableSizes: (garmentSizesData[category] || []).map((s) => s.size),
      });
    }

    let designScale;
    let printOptionLabel = '';
    let printOptionPrice = 0;

    // Use scale directly if provided (free scaling mode)
    if (scale !== undefined && scale !== null) {
      designScale = Math.max(0, Math.min(1, Number(scale))); // Clamp to 0-1
      printOptionLabel = `사용자 지정 (${Math.round(designScale * 100)}%)`;

      // Calculate price based on scale (approximate)
      if (designScale <= 0.4) {
        printOptionPrice = 2500; // logo price
      } else if (designScale <= 0.6) {
        printOptionPrice = 5500; // a5 price
      } else if (designScale <= 0.8) {
        printOptionPrice = 7500; // a4 price
      } else {
        printOptionPrice = 9500; // a3 price
      }
    } else {
      // Use print option (backward compatibility)
      const printOption = printOptionsData.find((opt) => opt.id === printOptionId);

      if (!printOption) {
        return res.status(404).json({
          error: `Print option '${printOptionId}' not found`,
          availableOptions: printOptionsData.map((opt) => opt.id),
        });
      }

      designScale = printOption.designScale;
      printOptionLabel = printOption.label;
      printOptionPrice = printOption.price;
    }

    // Calculate print size
    const { printableWidth, printableHeight } = garmentMeasurements;
    const widthCm = Math.round(printableWidth * designScale * 10) / 10;
    const heightCm = Math.round(printableHeight * designScale * 10) / 10;

    const warnings = [];

    if (widthCm > printableWidth - 2) {
      warnings.push('프린팅 영역이 최대 크기에 가깝습니다.');
    }

    if (widthCm < 8) {
      warnings.push('프린팅이 너무 작아 세부 사항이 흐릿할 수 있습니다.');
    }

    if (placement === 'back') {
      warnings.push('뒷면 인쇄는 앞면보다 위치 조정이 제한적일 수 있습니다.');
    }

    const description = `${printOptionLabel} 크기로 ${garmentMeasurements.size} 사이즈에 프린팅 시 약 ${widthCm}cm × ${heightCm}cm 크기로 인쇄됩니다.`;

    logEvent('info', 'print_size_calc_result', {
      requestId: req.requestId,
      widthCm,
      heightCm,
      scale: designScale,
    });

    res.json({
      widthCm,
      heightCm,
      description,
      warnings,
      printableArea: {
        maxWidthCm: printableWidth,
        maxHeightCm: printableHeight,
      },
      garmentCategory: category,
      garmentSize,
      scale: designScale,
      printOption: {
        id: printOptionId || 'custom',
        label: printOptionLabel,
        price: printOptionPrice,
      },
      garmentMeasurements: {
        chestWidth: garmentMeasurements.chestWidth,
        bodyLength: garmentMeasurements.bodyLength,
      },
      requestId: req.requestId,
    });
  } catch (error) {
    logEvent('error', 'print_size_calc_failed', {
      requestId: req.requestId,
      ...formatError(error),
    });
    res.status(500).json({ error: error.message || 'Print size calculation failed.' });
  }
});

// Get all available sizes for a product
app.get('/v1/print/sizes', (req, res) => {
  try {
    const { productName } = req.query;

    if (!productName) {
      return res.status(400).json({ error: 'Missing productName query parameter' });
    }

    const category = getGarmentCategory(productName);
    const sizes = garmentSizesData[category] || [];

    res.json({
      category,
      sizes: sizes.map((s) => ({
        size: s.size,
        chestWidth: s.chestWidth,
        bodyLength: s.bodyLength,
        printableWidth: s.printableWidth,
        printableHeight: s.printableHeight,
      })),
      printOptions: printOptionsData.map((opt) => ({
        id: opt.id,
        label: opt.label,
        description: opt.description,
        price: opt.price,
      })),
    });
  } catch (error) {
    logEvent('error', 'get_sizes_failed', {
      requestId: req.requestId,
      ...formatError(error),
    });
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// Inquiry API Endpoints
// ============================================================================

// Create a new inquiry
app.post('/v1/inquiries', async (req, res) => {
  try {
    const { userId, userName, title, content } = req.body || {};

    if (!userId || !title || !content) {
      return res.status(400).json({ error: 'userId, title, and content are required.' });
    }

    const pool = getPool();
    if (!pool) {
      return res.status(503).json({ error: 'Database not configured.' });
    }

    const result = await pool.query(
      `INSERT INTO inquiries (user_id, user_name, title, content, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, 'pending', NOW(), NOW())
       RETURNING id, user_id, user_name, title, content, status, created_at`,
      [userId, userName || null, title, content]
    );

    logEvent('info', 'inquiry_created', {
      requestId: req.requestId,
      inquiryId: result.rows[0].id,
      userId,
    });

    res.json({ inquiry: result.rows[0], requestId: req.requestId });
  } catch (error) {
    logEvent('error', 'inquiry_create_failed', {
      requestId: req.requestId,
      ...formatError(error),
    });
    res.status(500).json({ error: error.message || 'Failed to create inquiry.', requestId: req.requestId });
  }
});

// Get all inquiries for a user
app.get('/v1/inquiries', async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'userId query parameter is required.' });
    }

    const pool = getPool();
    if (!pool) {
      return res.status(503).json({ error: 'Database not configured.' });
    }

    const result = await pool.query(
      `SELECT id, user_id, user_name, title, content, status, created_at, updated_at
       FROM inquiries
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );

    res.json({ inquiries: result.rows, requestId: req.requestId });
  } catch (error) {
    logEvent('error', 'inquiries_fetch_failed', {
      requestId: req.requestId,
      ...formatError(error),
    });
    res.status(500).json({ error: error.message || 'Failed to fetch inquiries.', requestId: req.requestId });
  }
});

// Get a single inquiry with replies
app.get('/v1/inquiries/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'userId query parameter is required.' });
    }

    const pool = getPool();
    if (!pool) {
      return res.status(503).json({ error: 'Database not configured.' });
    }

    // Get inquiry
    const inquiryResult = await pool.query(
      `SELECT id, user_id, user_name, title, content, status, created_at, updated_at
       FROM inquiries
       WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );

    if (inquiryResult.rows.length === 0) {
      return res.status(404).json({ error: 'Inquiry not found.' });
    }

    // Get replies
    const repliesResult = await pool.query(
      `SELECT id, admin_name, content, created_at
       FROM inquiry_replies
       WHERE inquiry_id = $1
       ORDER BY created_at ASC`,
      [id]
    );

    res.json({
      inquiry: inquiryResult.rows[0],
      replies: repliesResult.rows,
      requestId: req.requestId,
    });
  } catch (error) {
    logEvent('error', 'inquiry_detail_fetch_failed', {
      requestId: req.requestId,
      ...formatError(error),
    });
    res.status(500).json({ error: error.message || 'Failed to fetch inquiry.', requestId: req.requestId });
  }
});

// Kakao Address Search API
app.get('/v1/address/search', async (req, res) => {
  try {
    const { query } = req.query;

    if (!query) {
      return res.status(400).json({ error: 'query parameter is required.' });
    }

    const KAKAO_REST_API_KEY = process.env.KAKAO_REST_API_KEY;
    if (!KAKAO_REST_API_KEY) {
      return res.status(503).json({ error: 'Kakao API key not configured.' });
    }

    const kakaoUrl = `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(query)}`;
    const response = await fetch(kakaoUrl, {
      headers: {
        Authorization: `KakaoAK ${KAKAO_REST_API_KEY}`,
      },
    });

    if (!response.ok) {
      throw new Error('Kakao API request failed.');
    }

    const data = await response.json();

    logEvent('info', 'address_search', {
      requestId: req.requestId,
      query,
      resultCount: data.documents?.length || 0,
    });

    res.json({ addresses: data.documents, meta: data.meta, requestId: req.requestId });
  } catch (error) {
    logEvent('error', 'address_search_failed', {
      requestId: req.requestId,
      ...formatError(error),
    });
    res.status(500).json({ error: error.message || 'Address search failed.', requestId: req.requestId });
  }
});

// Middleware to verify Basic Auth for Toss disconnect callback
function verifyTossCallbackAuth(req, res, next) {
  const TOSS_CALLBACK_USERNAME = process.env.TOSS_CALLBACK_USERNAME;
  const TOSS_CALLBACK_PASSWORD = process.env.TOSS_CALLBACK_PASSWORD;

  // If credentials not configured, skip auth check (for testing)
  if (!TOSS_CALLBACK_USERNAME || !TOSS_CALLBACK_PASSWORD) {
    console.warn('TOSS_CALLBACK_USERNAME/PASSWORD not set - skipping Basic Auth');
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    return res.status(401).json({ error: 'Unauthorized - Basic Auth required' });
  }

  const base64Credentials = authHeader.split(' ')[1];
  const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');
  const [username, password] = credentials.split(':');

  if (username === TOSS_CALLBACK_USERNAME && password === TOSS_CALLBACK_PASSWORD) {
    next();
  } else {
    res.status(401).json({ error: 'Unauthorized - Invalid credentials' });
  }
}

// Toss Apps-in-Toss - User disconnect callback endpoint
// This endpoint receives events when users disconnect/withdraw from the app
app.post('/v1/toss/disconnect', verifyTossCallbackAuth, express.json(), (req, res) => {
  const { userId, eventType } = req.body || {};

  logEvent('info', 'toss_user_disconnect', {
    userId,
    eventType,
    requestId: req.requestId,
  });

  // TODO: Handle user data deletion according to your privacy policy
  // - Remove user from database
  // - Delete user's saved designs
  // - Delete user's inquiries (or anonymize them)
  // - Delete user's personal information

  // For now, just log the event
  console.log(`Toss user ${userId} disconnected (event: ${eventType})`);

  // Always return success to Toss
  res.json({ success: true });
});

// Toss Apps-in-Toss - User disconnect callback (GET method)
app.get('/v1/toss/disconnect', verifyTossCallbackAuth, (req, res) => {
  const { userId, eventType } = req.query || {};

  logEvent('info', 'toss_user_disconnect_get', {
    userId,
    eventType,
    requestId: req.requestId,
  });

  console.log(`Toss user ${userId} disconnected via GET (event: ${eventType})`);

  res.json({ success: true });
});

// ========================================
// TossPay Payment Endpoints
// ========================================
const TOSSPAY_API_URL = process.env.TOSSPAY_API_URL || 'https://pay-apps-in-toss-api.toss.im';
const IS_TEST_PAYMENT = String(process.env.IS_TEST_PAYMENT || 'true') === 'true';

// Create payment - Step 1 of payment flow
app.post('/v1/payment/create', strictLimiter, async (req, res) => {
  try {
    const { orderNo, productDesc, amount, amountTaxFree = 0 } = req.body || {};
    const userKey = req.headers['x-toss-user-key'];

    if (!userKey) {
      return res.status(400).json({ error: 'x-toss-user-key header is required.' });
    }
    if (!orderNo || !productDesc || amount === undefined) {
      return res.status(400).json({ error: 'orderNo, productDesc, and amount are required.' });
    }

    logEvent('info', 'payment_create_request', {
      requestId: req.requestId,
      orderNo,
      amount,
      isTestPayment: IS_TEST_PAYMENT,
    });

    const paymentUrl = `${TOSSPAY_API_URL}/api-partner/v1/apps-in-toss/pay/make-payment`;
    const paymentBody = {
      orderNo,
      productDesc,
      amount: Number(amount),
      amountTaxFree: Number(amountTaxFree),
      isTestPayment: IS_TEST_PAYMENT,
    };

    console.log('[Payment] Creating payment:', {
      url: paymentUrl,
      userKey: userKey.substring(0, 10) + '...',
      body: paymentBody,
    });

    // Get mTLS agent
    const agent = getHttpsAgent();
    if (!agent) {
      console.error('[Payment] mTLS agent not available - check MTLS_KEY_BASE64 and MTLS_CERT_BASE64 environment variables');
      return res.status(500).json({
        error: 'Payment service configuration error.',
        details: 'mTLS certificates not configured',
      });
    }

    let response;
    try {
      response = await axios({
        method: 'POST',
        url: paymentUrl,
        headers: {
          'Content-Type': 'application/json',
          'x-toss-user-key': userKey,
        },
        data: paymentBody,
        httpsAgent: agent,
        timeout: 30000, // 30 seconds timeout
      });

      console.log('[Payment] Request successful, status:', response.status);
    } catch (axiosError) {
      console.error('[Payment] Request failed:', {
        url: paymentUrl,
        error: axiosError.message,
        code: axiosError.code,
        status: axiosError.response?.status,
        data: axiosError.response?.data,
      });

      logEvent('error', 'payment_create_request_failed', {
        requestId: req.requestId,
        orderNo,
        url: paymentUrl,
        error: axiosError.message,
        code: axiosError.code,
        status: axiosError.response?.status,
        stack: axiosError.stack,
      });
      return res.status(503).json({
        error: 'Failed to connect to payment service. Please try again.',
        details: axiosError.message,
        url: paymentUrl,
        responseStatus: axiosError.response?.status,
        responseData: axiosError.response?.data,
      });
    }

    const data = response.data;

    if (data.resultType !== 'SUCCESS' || !data.success?.payToken) {
      logEvent('error', 'payment_create_failed', {
        requestId: req.requestId,
        orderNo,
        response: data,
      });
      return res.status(400).json({ 
        error: data.error?.message || 'Payment creation failed.',
        details: data,
      });
    }

    logEvent('info', 'payment_create_success', {
      requestId: req.requestId,
      orderNo,
      payToken: data.success.payToken,
    });

    res.json({ 
      payToken: data.success.payToken,
      orderNo,
      requestId: req.requestId,
    });
  } catch (error) {
    logEvent('error', 'payment_create_error', {
      requestId: req.requestId,
      ...formatError(error),
    });
    res.status(500).json({ error: error.message || 'Payment creation failed.', requestId: req.requestId });
  }
});

// Execute payment - Step 3 of payment flow (after checkoutPayment SDK call)
app.post('/v1/payment/execute', strictLimiter, async (req, res) => {
  try {
    const { payToken, orderNo, orderData } = req.body || {};
    const userKey = req.headers['x-toss-user-key'];

    if (!userKey) {
      return res.status(400).json({ error: 'x-toss-user-key header is required.' });
    }
    if (!payToken) {
      return res.status(400).json({ error: 'payToken is required.' });
    }

    logEvent('info', 'payment_execute_request', {
      requestId: req.requestId,
      payToken,
      orderNo,
      isTestPayment: IS_TEST_PAYMENT,
    });

    const response = await fetch(`${TOSSPAY_API_URL}/api-partner/v1/apps-in-toss/pay/execute-payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-toss-user-key': userKey,
      },
      body: JSON.stringify({
        payToken,
        orderNo,
        isTestPayment: IS_TEST_PAYMENT,
      }),
    });

    const data = await response.json();

    if (data.resultType !== 'SUCCESS') {
      logEvent('error', 'payment_execute_failed', {
        requestId: req.requestId,
        payToken,
        response: data,
      });
      return res.status(400).json({ 
        error: data.error?.message || 'Payment execution failed.',
        details: data,
      });
    }

    logEvent('info', 'payment_execute_success', {
      requestId: req.requestId,
      payToken,
      orderNo: data.success?.orderNo,
      amount: data.success?.amount,
      paidAmount: data.success?.paidAmount,
      payMethod: data.success?.payMethod,
      transactionId: data.success?.transactionId,
    });

    // If orderData is provided, also process the order (send emails, PDF, etc.)
    if (orderData) {
      try {
        // Set the order ID from payment if not set
        orderData.orderId = orderData.orderId || orderNo || data.success?.orderNo;
        orderData.paymentInfo = {
          payToken,
          transactionId: data.success?.transactionId,
          amount: data.success?.amount,
          paidAmount: data.success?.paidAmount,
          payMethod: data.success?.payMethod,
          approvalTime: data.success?.approvalTime,
        };

        // Process order similar to /v1/orders/submit
        const mailer = getMailer();
        if (mailer) {
          const pdfBuffer = await buildOrderPdf(orderData);
          const pdfName = `order-${orderData.orderId}.pdf`;
          
          let pdfUrl = '';
          if (orderData.storePdf !== false) {
            const key = `${PDF_PREFIX}/${pdfName}`;
            pdfUrl = await uploadToS3({ key, body: pdfBuffer, contentType: 'application/pdf' });
          }

          const adminTo = process.env.ORDER_EMAIL_TO;
          const customerEmail = orderData.customer?.email || '';
          const customerName = orderData.customer?.name || '주문자';

          if (adminTo) {
            await mailer.sendMail({
              from: process.env.SMTP_FROM || process.env.SMTP_USER,
              to: adminTo,
              subject: `🎽 결제 완료: ${orderData.orderId} - ${customerName}`,
              text: `주문번호: ${orderData.orderId}\n결제금액: ${data.success?.paidAmount}원\n결제수단: ${data.success?.payMethod}`,
              attachments: [{ filename: pdfName, content: pdfBuffer }],
            });
          }

          if (customerEmail) {
            await mailer.sendMail({
              from: process.env.SMTP_FROM || process.env.SMTP_USER,
              to: customerEmail,
              subject: `[티셔츠메이커] 주문이 완료되었습니다 - ${orderData.orderId}`,
              text: `안녕하세요 ${customerName}님,\n\n주문이 완료되었습니다.\n주문번호: ${orderData.orderId}\n결제금액: ${data.success?.paidAmount}원\n\n주문서를 첨부해 드립니다.`,
              attachments: [{ filename: pdfName, content: pdfBuffer }],
            });
          }

          logEvent('info', 'order_emails_sent', {
            requestId: req.requestId,
            orderId: orderData.orderId,
          });
        }
      } catch (orderError) {
        logEvent('error', 'order_processing_failed', {
          requestId: req.requestId,
          ...formatError(orderError),
        });
        // Don't fail the payment response even if order processing fails
      }
    }

    res.json({ 
      success: true,
      payment: data.success,
      requestId: req.requestId,
    });
  } catch (error) {
    logEvent('error', 'payment_execute_error', {
      requestId: req.requestId,
      ...formatError(error),
    });
    res.status(500).json({ error: error.message || 'Payment execution failed.', requestId: req.requestId });
  }
});

// Get payment status
app.post('/v1/payment/status', async (req, res) => {
  try {
    const { payToken, orderNo } = req.body || {};
    const userKey = req.headers['x-toss-user-key'];

    if (!userKey) {
      return res.status(400).json({ error: 'x-toss-user-key header is required.' });
    }
    if (!payToken || !orderNo) {
      return res.status(400).json({ error: 'payToken and orderNo are required.' });
    }

    const response = await fetch(`${TOSSPAY_API_URL}/api-partner/v1/apps-in-toss/pay/get-payment-status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-toss-user-key': userKey,
      },
      body: JSON.stringify({
        payToken,
        orderNo,
        isTestPayment: IS_TEST_PAYMENT,
      }),
    });

    const data = await response.json();

    if (data.resultType !== 'SUCCESS') {
      return res.status(400).json({ 
        error: data.error?.message || 'Failed to get payment status.',
        details: data,
      });
    }

    res.json({ 
      status: data.success,
      requestId: req.requestId,
    });
  } catch (error) {
    logEvent('error', 'payment_status_error', {
      requestId: req.requestId,
      ...formatError(error),
    });
    res.status(500).json({ error: error.message || 'Failed to get payment status.', requestId: req.requestId });
  }
});

// Initialize database and start server
async function startServer() {
  try {
    await initializeDatabase();
  } catch (error) {
    console.error('Database initialization failed, but continuing:', error.message);
  }

  app.listen(PORT, () => {
    logEvent('info', 'server_config', {
      port: PORT,
      s3Bucket: IMAGE_BUCKET,
      s3Endpoint: cachedS3Endpoint || process.env.S3_ENDPOINT || resolveS3Endpoint() || '',
      s3BaseUrl: resolveBaseUrl(),
      s3ForcePathStyle: String(process.env.S3_FORCE_PATH_STYLE || 'false'),
      openaiModel: OPENAI_IMAGE_MODEL,
      openaiQuality: OPENAI_IMAGE_QUALITY,
      clipdropEnabled: Boolean(CLIPDROP_API_KEY),
      databaseEnabled: Boolean(process.env.DATABASE_URL),
      kakaoApiEnabled: Boolean(process.env.KAKAO_REST_API_KEY),
    });
    console.log(`server listening on ${PORT}`);
  });
}

startServer();
