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
const { runPrintPipeline } = require('./printPipeline');

const app = express();

// Security headers
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP for API server
  crossOriginEmbedderPolicy: false,
}));

// Compression for responses
app.use(compression());

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

const PORT = process.env.PORT || 3000;
const REQUEST_TIMEOUT_MS = Number(process.env.REQUEST_TIMEOUT_MS) || 120000; // 2 minutes default
const IMAGE_BUCKET = process.env.S3_BUCKET || '';
const IMAGE_BASE_URL = process.env.S3_PUBLIC_BASE_URL || '';
const IMAGE_PREFIX = process.env.S3_IMAGE_PREFIX || 'uploads';
const PDF_PREFIX = process.env.S3_PDF_PREFIX || 'orders';
const OPENAI_IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1';
const OPENAI_IMAGE_QUALITY = process.env.OPENAI_IMAGE_QUALITY || 'auto';
const ORDER_OUTPUT_DIR = process.env.ORDER_OUTPUT_DIR || path.join(process.cwd(), 'order-output');
const CLIPDROP_API_KEY = process.env.CLIPDROP_API_KEY || '';
const KAKAO_WEBHOOK_URL = process.env.KAKAO_WEBHOOK_URL || '';
const KAKAO_WEBHOOK_TOKEN = process.env.KAKAO_WEBHOOK_TOKEN || '';

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

function buildOrderPdf(order) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 48 });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(18).text('Order Summary', { align: 'left' });
    doc.moveDown(0.5);
    doc.fontSize(11).fillColor('#333');

    const createdAt = order.createdAt || new Date().toISOString();
    doc.text(`Order ID: ${order.orderId || 'N/A'}`);
    doc.text(`Created At: ${createdAt}`);
    doc.text(`Channel: ${order.channel || 'Toss Miniapp'}`);
    doc.moveDown();

    doc.fontSize(13).text('Customer');
    doc.fontSize(11);
    if (order.customer) {
      doc.text(`Name: ${order.customer.name || ''}`);
      doc.text(`Phone: ${order.customer.phone || ''}`);
      doc.text(`Email: ${order.customer.email || ''}`);
    }
    doc.moveDown();

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

    doc.fontSize(13).text('Items');
    doc.fontSize(11);
    const items = Array.isArray(order.items) ? order.items : [];
    items.forEach((item, index) => {
      doc.text(`Item ${index + 1}`);
      doc.text(`- Product: ${item.productName || ''}`);
      doc.text(`- Model: ${item.modelName || ''}`);
      doc.text(`- Color: ${item.color || ''}`);
      doc.text(`- Size: ${item.size || ''}`);
      doc.text(`- Quantity: ${item.quantity || ''}`);
      doc.text(`- Print Method: ${item.print?.method || ''}`);
      doc.text(`- Print Placement: ${item.print?.placement || ''}`);
      doc.text(`- Print Size: ${item.print?.sizeLabel || ''}`);
      doc.text(`- Print Dimension: ${item.print?.sizeCm || ''}`);
      doc.text(`- Design URL: ${item.designUrl || ''}`);
      if (item.text?.text) {
        doc.text(
          `- Text Layer: "${item.text.text}" (${item.text.fontWeight || ''}, ${item.text.fontSize || ''}px)`
        );
      }
      if (Array.isArray(item.mockupUrls) && item.mockupUrls.length > 0) {
        doc.text(`- Mockups: ${item.mockupUrls.join(', ')}`);
      }
      doc.moveDown(0.5);
    });

    doc.moveDown();
    doc.fontSize(13).text('Pricing');
    doc.fontSize(11);
    if (order.pricing) {
      doc.text(`Unit Price: ${order.pricing.unitPrice || ''}`);
      doc.text(`Quantity: ${order.pricing.quantity || ''}`);
      doc.text(`Shipping: ${order.pricing.shipping || ''}`);
      doc.text(`Total: ${order.pricing.total || ''}`);
    }

    doc.moveDown();
    doc.fontSize(11).fillColor('#6B7280');
    doc.text(
      '※ 출력 이미지에 대한 최종 판단은 주문자가 진행합니다. 주문서 메일을 꼭 확인해 주세요.'
    );

    doc.end();
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
    const { filename, dataUrl, base64, contentType } = req.body || {};
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
    });
    res.json({ url, requestId: req.requestId });
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
    const { prompt, numberOfImages = 1, aspectRatio = '1:1' } = req.body || {};
    if (!prompt) return res.status(400).json({ error: 'Prompt is required.' });
    const count = Math.max(1, Math.min(4, Number(numberOfImages) || 1));
    const sizeMap = {
      '1:1': '1024x1024',
      '4:3': '1536x1024',
      '3:4': '1024x1536',
    };
    const size = sizeMap[aspectRatio] || '1024x1024';

    const client = getOpenAIClient();
    logEvent('info', 'image_generate_request', {
      requestId: req.requestId,
      model: OPENAI_IMAGE_MODEL,
      quality: OPENAI_IMAGE_QUALITY,
      size,
      count,
      promptLength: prompt.length,
      promptSnippet: prompt.slice(0, 120),
    });

    const response = await client.images.generate({
      model: OPENAI_IMAGE_MODEL,
      prompt,
      size,
      n: count,
      ...(OPENAI_IMAGE_QUALITY ? { quality: OPENAI_IMAGE_QUALITY } : {}),
    });

    const results = [];
    const generated = response?.data || [];
    for (const item of generated) {
      let buffer = null;
      let mimeType = 'image/png';
      if (item.b64_json) {
        buffer = Buffer.from(item.b64_json, 'base64');
      } else if (item.url) {
        const imageResponse = await fetch(item.url);
        if (!imageResponse.ok) continue;
        mimeType = imageResponse.headers.get('content-type') || mimeType;
        buffer = Buffer.from(await imageResponse.arrayBuffer());
      }
      if (!buffer) continue;
      const key = `${IMAGE_PREFIX}/openai-${Date.now()}-${Math.random().toString(36).slice(2)}.png`;
      const url = await uploadToS3({ key, body: buffer, contentType: mimeType });
      results.push({ url, mimeType });
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
    const { imageUrl, dataUrl, filename } = req.body || {};
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
    res.json({ url, requestId: req.requestId });
  } catch (error) {
    logEvent('error', 'remove_background_failed', {
      requestId: req.requestId,
      ...formatError(error),
    });
    res.status(500).json({ error: error.message || 'Remove background failed.', requestId: req.requestId });
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

    let pipelineResult = null;
    if (order.pipeline?.enabled) {
      const orderId = order.orderId || String(Date.now());
      const workDir = path.join(ORDER_OUTPUT_DIR, orderId);
      await fsp.mkdir(workDir, { recursive: true });
      let masterPath = order.pipeline.masterPngPath || null;
      if (!masterPath) {
        const sourceUrl =
          order.pipeline.masterPngUrl ||
          order.masterPngUrl ||
          order.items?.[0]?.designUrl ||
          '';
        if (sourceUrl) {
          const downloadPath = path.join(workDir, 'master_input.png');
          await downloadToFile(sourceUrl, downloadPath);
          masterPath = downloadPath;
        }
      }
      if (masterPath) {
        pipelineResult = await runPrintPipeline({
          master_png_path: masterPath,
          order_id: orderId,
          target_width_px: order.pipeline.targetWidthPx,
          target_height_px: order.pipeline.targetHeightPx,
          clipdrop_api_key: CLIPDROP_API_KEY,
          output_dir: ORDER_OUTPUT_DIR,
          allow_warn_to_pass: false,
        });
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
    const baseSubject = `Order ${order.orderId || ''} - ${order.customer?.name || ''}`;
    const note =
      '출력 이미지에 대한 최종 판단은 주문자가 진행합니다. 주문서 메일을 꼭 확인해 주세요.';
    const pipelineLine = pipelineResult
      ? `Pipeline: ${pipelineResult.status} (QC: ${pipelineResult.qc?.status || ''})`
      : 'Pipeline: not run';
    const bodyText = `New order submitted.\n${note}\n${pipelineLine}\nPDF attached.\n${
      pdfUrl ? `PDF URL: ${pdfUrl}` : ''
    }`;

    await mailer.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: adminTo,
      subject: baseSubject,
      text: bodyText,
      attachments: [
        {
          filename: pdfName,
          content: pdfBuffer,
        },
      ],
    });

    if (customerEmail) {
      await mailer.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: customerEmail,
        subject: `[고객용] ${baseSubject}`,
        text: bodyText,
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
  });
  console.log(`server listening on ${PORT}`);
});
