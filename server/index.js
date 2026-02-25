const crypto = require('crypto');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const nodemailer = require('nodemailer');
const PDFDocument = require('pdfkit');
const { isGcsConfigured, uploadToGcs, getSignedReadUrl } = require('./gcs');
const OpenAI = require('openai');
const { GoogleGenAI, RawReferenceImage, MaskReferenceImage, MaskReferenceMode, EditMode } = require('@google/genai');
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const https = require('https');
const axios = require('axios');
const { runPrintPipeline } = require('./printPipeline');
const generationsRouter = require('./generations');
const { getPool, initializeDatabase, closePool } = require('./db');

const app = express();

// Trust proxy for Cloud Run / reverse proxies.
app.set('trust proxy', 1);

// Security headers
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP for API server
  crossOriginEmbedderPolicy: false,
}));

// Compression for responses
app.use(compression());

const DEFAULT_CORS_ORIGINS = [
  'https://apps-in-toss.toss.im',
  'https://appsintoss.toss.im',
  'https://service.toss.im',
  'https://developers.toss.im',
  'https://docs.tosspayments.com',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
];
const configuredCorsOrigins = String(process.env.CORS_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const ALLOWED_CORS_ORIGINS = new Set(
  configuredCorsOrigins.length ? configuredCorsOrigins : DEFAULT_CORS_ORIGINS,
);

// CORS (restricted by allowlist; override with CORS_ORIGINS)
app.use(
  cors({
    origin(origin, callback) {
      // Allow non-browser clients (no Origin header) such as server-to-server callbacks.
      if (!origin) return callback(null, true);
      if (ALLOWED_CORS_ORIGINS.has(origin)) return callback(null, true);
      return callback(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Request-Id',
      'x-request-id',
      'X-Toss-User-Key',
      'x-toss-user-key',
    ],
    optionsSuccessStatus: 204,
  }),
);

// Body parser with size limit
app.use(express.json({ limit: '15mb' }));

app.use((error, _req, res, next) => {
  if (error && String(error.message || '').includes('Not allowed by CORS')) {
    return res.status(403).json({ error: 'CORS origin not allowed.' });
  }
  return next(error);
});

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
const IMAGE_PREFIX = process.env.GCS_IMAGE_PREFIX || 'uploads';
const PDF_PREFIX = process.env.GCS_PDF_PREFIX || 'orders';
const GCS_UPLOAD_BUCKET = process.env.GCS_UPLOAD_BUCKET || '';
const GCS_ORDER_BUCKET = process.env.GCS_ORDER_BUCKET || '';
const SIGNED_URL_TTL_SECONDS = Number(process.env.SIGNED_URL_TTL_SECONDS) || 60 * 60 * 24 * 7; // 7 days (v4 max)
const OPENAI_IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1';
const OPENAI_IMAGE_QUALITY = process.env.OPENAI_IMAGE_QUALITY || 'medium';
const IMAGEN_MODEL = process.env.IMAGEN_MODEL || 'imagen-4.0-generate-001';
const IMAGEN_EDIT_MODEL = process.env.IMAGEN_EDIT_MODEL || 'imagen-3.0-capability-001';
const VERTEX_PROJECT_ID = process.env.VERTEX_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || '';
const VERTEX_LOCATION = process.env.VERTEX_LOCATION || process.env.GOOGLE_CLOUD_LOCATION || 'us-central1';
const VERTEX_API_KEY = process.env.VERTEX_API_KEY || process.env.GOOGLE_API_KEY || '';
const REMOVE_BG_PROVIDER = process.env.REMOVE_BG_PROVIDER || (VERTEX_PROJECT_ID ? 'vertex_imagen' : 'clipdrop');
const ORDER_OUTPUT_DIR = process.env.ORDER_OUTPUT_DIR || path.join('/tmp', 'order-output');
const DEFAULT_ORDER_EMAIL_TO = '98dy@naver.com';
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

    console.log('[mTLS] Decoded key length:', key.length, 'chars');
    console.log('[mTLS] Decoded cert length:', cert.length, 'chars');
    console.log('[mTLS] Key header:', key.substring(0, 60));
    console.log('[mTLS] Cert header:', cert.substring(0, 60));

    // Verify key and cert format
    if (!key.includes('BEGIN') || (!key.includes('PRIVATE KEY') && !key.includes('RSA PRIVATE KEY'))) {
      throw new Error('Invalid private key format - must contain BEGIN PRIVATE KEY or BEGIN RSA PRIVATE KEY');
    }
    if (!cert.includes('BEGIN CERTIFICATE')) {
      throw new Error('Invalid certificate format - must contain BEGIN CERTIFICATE');
    }

    // Check if key might be encrypted (has ENCRYPTED in header)
    if (key.includes('ENCRYPTED')) {
      console.warn('[mTLS] WARNING: Private key appears to be encrypted but no passphrase provided');
    }

    httpsAgent = new https.Agent({
      key,
      cert,
      rejectUnauthorized: true,
    });

    console.log('[mTLS] HTTPS Agent configured successfully');
    return httpsAgent;
  } catch (error) {
    console.error('[mTLS] Failed to configure HTTPS Agent');
    console.error('[mTLS] Error message:', error.message);
    console.error('[mTLS] Error code:', error.code);
    console.error('[mTLS] Error stack:', error.stack);
    return null;
  }
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

let imagenClient;
function getImagenClient() {
  if (imagenClient) return imagenClient;
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error('GOOGLE_API_KEY is required for Imagen image generation.');
  }
  imagenClient = new GoogleGenAI({ apiKey });
  return imagenClient;
}

let vertexClient;
function getVertexClient() {
  if (vertexClient) return vertexClient;

  if (!VERTEX_PROJECT_ID || !VERTEX_LOCATION) {
    throw new Error('VERTEX_PROJECT_ID and VERTEX_LOCATION are required for Vertex AI image editing.');
  }

  const apiKey = VERTEX_API_KEY;
  const serviceAccountJson =
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON ||
    '';
  const serviceAccountBase64 =
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64 ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS_BASE64 ||
    '';

  let googleAuthOptions;
  const rawCreds = serviceAccountJson || (serviceAccountBase64 ? Buffer.from(serviceAccountBase64, 'base64').toString('utf8') : '');
  if (!apiKey && rawCreds) {
    try {
      googleAuthOptions = { credentials: JSON.parse(rawCreds) };
    } catch (error) {
      throw new Error(`Invalid service account JSON for Vertex auth: ${error?.message || 'unknown_error'}`);
    }
  }

  vertexClient = new GoogleGenAI({
    vertexai: true,
    project: VERTEX_PROJECT_ID,
    location: VERTEX_LOCATION,
    ...(apiKey ? { apiKey } : {}),
    ...(googleAuthOptions ? { googleAuthOptions } : {}),
  });

  return vertexClient;
}

function isGcsEnabled() {
  return isGcsConfigured();
}

function resolveGcsBucket(kind) {
  if (kind === 'pdf') return GCS_ORDER_BUCKET;
  return GCS_UPLOAD_BUCKET;
}

async function uploadToStorage({ kind, key, body, contentType }) {
  if (!isGcsEnabled()) {
    throw new Error('GCS is not configured. Set GCS_UPLOAD_BUCKET/GCS_ORDER_BUCKET.');
  }

  const bucketName = resolveGcsBucket(kind);
  if (!bucketName) {
    throw new Error(`GCS bucket for kind "${kind}" is not configured.`);
  }

  try {
    await uploadToGcs({ bucketName, key, body, contentType });
    return await getSignedReadUrl({
      bucketName,
      key,
      ttlSeconds: SIGNED_URL_TTL_SECONDS,
    });
  } catch (error) {
    logEvent('error', 'gcs_upload_failed', {
      bucketName,
      key,
      ...formatError(error),
    });
    throw error;
  }
}

async function safeUnlink(filePath) {
  if (!filePath) return;
  try {
    await fsp.unlink(filePath);
  } catch (error) {
    if (error && error.code !== 'ENOENT') {
      logEvent('warn', 'temp_file_cleanup_failed', {
        filePath,
        ...formatError(error),
      });
    }
  }
}

async function safeRemoveDir(dirPath) {
  if (!dirPath) return;
  try {
    await fsp.rm(dirPath, { recursive: true, force: true });
  } catch (error) {
    logEvent('warn', 'temp_dir_cleanup_failed', {
      dirPath,
      ...formatError(error),
    });
  }
}

function buildPipelineArtifactKey(orderId, filename) {
  const safeOrder = String(orderId || 'unknown-order').replace(/[^a-zA-Z0-9-_]/g, '');
  const safeName = String(filename || 'artifact').replace(/[^a-zA-Z0-9-_.]/g, '');
  return `${IMAGE_PREFIX}/pipeline/${safeOrder}/${safeName}`;
}

function derivePipelineWorkDir(pipelineResult) {
  if (!pipelineResult) return null;
  const candidates = [
    pipelineResult?.paths?.print_ready_png,
    pipelineResult?.paths?.upscaled_raw,
    pipelineResult?.paths?.qc_report_json,
    pipelineResult?.output_path,
  ].filter(Boolean);
  if (!candidates.length) return null;
  return path.dirname(candidates[0]);
}

function isPathInTmp(targetPath) {
  if (!targetPath) return false;
  const resolvedTarget = path.resolve(targetPath);
  const resolvedTmp = path.resolve('/tmp');
  return resolvedTarget === resolvedTmp || resolvedTarget.startsWith(`${resolvedTmp}${path.sep}`);
}

async function persistPipelineArtifacts({ orderId, pipelineResult }) {
  if (!pipelineResult || !pipelineResult.paths || !isGcsEnabled()) {
    return pipelineResult;
  }

  const artifactUrls = {};

  const printReadyPath = pipelineResult.paths.print_ready_png;
  if (printReadyPath && fs.existsSync(printReadyPath)) {
    const printReadyBuffer = await fsp.readFile(printReadyPath);
    const key = buildPipelineArtifactKey(orderId, 'print_ready.png');
    artifactUrls.print_ready_png = await uploadToStorage({
      kind: 'image',
      key,
      body: printReadyBuffer,
      contentType: 'image/png',
    });
  }

  const qcPath = pipelineResult.paths.qc_report_json;
  if (qcPath && fs.existsSync(qcPath)) {
    const qcBuffer = await fsp.readFile(qcPath);
    const key = buildPipelineArtifactKey(orderId, 'qc_report.json');
    artifactUrls.qc_report_json = await uploadToStorage({
      kind: 'image',
      key,
      body: qcBuffer,
      contentType: 'application/json',
    });
  }

  return {
    ...pipelineResult,
    artifact_urls: artifactUrls,
  };
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
  if (!url) return null;
  if (typeof url === 'string' && url.startsWith('data:')) {
    const decoded = decodeDataUrl(url);
    return decoded ? decoded.buffer : null;
  }
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

function clampNumber(value, min, max) {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

function medianNumber(values) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid];
  return Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

async function estimateBackgroundKeyColorRgb(inputBuffer) {
  const sharp = require('sharp');
  const { data, info } = await sharp(inputBuffer)
    .resize(64, 64, { fit: 'fill' })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const w = info.width;
  const h = info.height;
  const ch = info.channels;
  const coords = [
    [0, 0],
    [w - 1, 0],
    [0, h - 1],
    [w - 1, h - 1],
    [Math.floor(w / 2), 0],
    [Math.floor(w / 2), h - 1],
    [0, Math.floor(h / 2)],
    [w - 1, Math.floor(h / 2)],
  ];

  const rs = [];
  const gs = [];
  const bs = [];
  for (const [x, y] of coords) {
    const idx = (y * w + x) * ch;
    rs.push(data[idx]);
    gs.push(data[idx + 1]);
    bs.push(data[idx + 2]);
  }

  return {
    r: medianNumber(rs),
    g: medianNumber(gs),
    b: medianNumber(bs),
  };
}

async function chromaKeyToTransparentPng(inputBuffer, options) {
  const sharp = require('sharp');
  const keyColor = options?.keyColor || { r: 0, g: 255, b: 0 };
  const low = Number.isFinite(options?.low) ? options.low : 40;
  const high = Number.isFinite(options?.high) ? options.high : 140;
  if (high <= low) {
    throw new Error('invalid_chroma_key_thresholds');
  }

  const { data, info } = await sharp(inputBuffer).raw().toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;
  const ch = info.channels;
  const pxCount = w * h;
  const out = Buffer.alloc(pxCount * 4);

  for (let i = 0; i < pxCount; i++) {
    const base = i * ch;
    const r = data[base];
    const g = data[base + 1];
    const b = data[base + 2];
    const a = ch >= 4 ? data[base + 3] : 255;

    const dr = r - keyColor.r;
    const dg = g - keyColor.g;
    const db = b - keyColor.b;
    const dist = Math.sqrt(dr * dr + dg * dg + db * db);

    let keep = 0;
    if (dist <= low) keep = 0;
    else if (dist >= high) keep = 1;
    else keep = (dist - low) / (high - low);

    const outBase = i * 4;
    out[outBase] = r;
    out[outBase + 1] = g;
    out[outBase + 2] = b;
    out[outBase + 3] = Math.round(a * clampNumber(keep, 0, 1));
  }

  return sharp(out, { raw: { width: w, height: h, channels: 4 } }).png().toBuffer();
}

async function removeBackgroundVertexImagen({ inputBuffer, inputMimeType, requestId }) {
  const ai = getVertexClient();

  const raw = new RawReferenceImage();
  raw.referenceId = 1;
  raw.referenceImage = { imageBytes: inputBuffer.toString('base64'), mimeType: inputMimeType };

  const mask = new MaskReferenceImage();
  mask.referenceId = 2;
  // Let the model infer the mask: we want the background only.
  mask.config = { maskMode: MaskReferenceMode.MASK_MODE_BACKGROUND };

  // We intentionally force a chroma-key background to deterministically create a transparent PNG.
  const prompt = 'Replace the background with a uniform solid neon green (#00FF00). No gradients, no shadows. Keep the subject unchanged.';

  const response = await ai.models.editImage({
    model: IMAGEN_EDIT_MODEL,
    prompt,
    referenceImages: [raw, mask],
    config: {
      numberOfImages: 1,
      editMode: EditMode.EDIT_MODE_BGSWAP,
      outputMimeType: 'image/png',
      addWatermark: false,
    },
  });

  const imageBytes = response?.generatedImages?.[0]?.image?.imageBytes;
  if (!imageBytes) {
    throw new Error('vertex_remove_bg_empty');
  }

  const bgswapBuffer = Buffer.from(imageBytes, 'base64');
  const keyColor = await estimateBackgroundKeyColorRgb(bgswapBuffer);

  logEvent('info', 'remove_background_vertex_keycolor', {
    requestId,
    provider: 'vertex_imagen',
    model: IMAGEN_EDIT_MODEL,
    keyColor,
  });

  // Thresholds tuned for typical "solid-ish" backgrounds that still include some compression / model variance.
  return chromaKeyToTransparentPng(bgswapBuffer, { keyColor, low: 40, high: 140 });
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
        doc.fontSize(18).text('주문서', { align: 'left' });
        doc.moveDown(0.5);
        doc.fontSize(11).fillColor('#333');

        const createdAt = order.createdAt || new Date().toISOString();
        doc.text(`주문번호: ${order.orderId || 'N/A'}`);
        doc.text(`주문일시: ${createdAt}`);
        doc.text(`채널: ${order.channel || 'Toss Miniapp'}`);
        doc.moveDown();

        // Customer Info
        doc.fontSize(13).text('주문자 정보');
        doc.fontSize(11);
        if (order.customer) {
          doc.text(`이름: ${order.customer.name || ''}`);
          doc.text(`연락처: ${order.customer.phone || ''}`);
          doc.text(`이메일: ${order.customer.email || ''}`);
        }
        doc.moveDown();

        // Shipping Info
        doc.fontSize(13).text('배송 정보');
        doc.fontSize(11);
        if (order.shipping) {
          doc.text(`수령인: ${order.shipping.name || order.customer?.name || ''}`);
          doc.text(`연락처: ${order.shipping.phone || order.customer?.phone || ''}`);
          doc.text(`주소: ${order.shipping.address1 || ''}`);
          doc.text(`상세주소: ${order.shipping.address2 || ''}`);
          doc.text(`시/군/구: ${order.shipping.city || ''}`);
          doc.text(`시/도: ${order.shipping.state || ''}`);
          doc.text(`우편번호: ${order.shipping.zip || ''}`);
          doc.text(`국가: ${order.shipping.country || ''}`);
          doc.text(`배송 메모: ${order.shipping.memo || ''}`);
        }
        doc.moveDown();

        // Items with images
        doc.fontSize(13).text('주문 상품');
        doc.fontSize(11);
        const items = Array.isArray(order.items) ? order.items : [];

        for (let index = 0; index < items.length; index++) {
          const item = items[index];

          // Check if we need a new page
          if (doc.y > 650) {
            doc.addPage();
          }

          doc.fontSize(12).fillColor('#000').text(`상품 ${index + 1}`, { underline: true });
          doc.fontSize(10).fillColor('#333');
          doc.text(`- 제품: ${item.productName || ''}`);
          doc.text(`- 모델: ${item.modelName || ''}`);
          doc.text(`- 색상: ${item.color || ''}`);
          doc.text(`- 사이즈: ${item.size || ''}`);
          doc.text(`- 수량: ${item.quantity || ''}`);
          doc.text(`- 인쇄 방식: ${item.print?.method || ''}`);
          doc.text(`- 인쇄 위치: ${item.print?.placement || ''}`);
          doc.text(`- 인쇄 사이즈: ${item.print?.sizeLabel || ''}`);
          doc.text(`- 인쇄 크기: ${item.print?.sizeCm || ''}`);

          if (item.text?.text) {
            doc.text(
              `- 텍스트 레이어: "${item.text.text}" (${item.text.fontWeight || ''}, ${item.text.fontSize || ''}px)`
            );
          }
          doc.moveDown(0.5);

          // Design Image
          if (item.designUrl) {
            const designBuffer = await downloadToBuffer(item.designUrl);
            if (designBuffer) {
              try {
                doc.fontSize(11).fillColor('#1E40AF').text('디자인 이미지:', { continued: false });
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
            doc.fontSize(11).fillColor('#1E40AF').text('목업 이미지:', { continued: false });
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

                  doc.fontSize(9).fillColor('#6B7280').text(`목업 ${mi + 1}:`, { continued: false });
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
                  doc.fontSize(9).fillColor('#DC2626').text(`목업 ${mi + 1} URL: ${mockupUrl}`);
                }
              } else {
                doc.fontSize(9).fillColor('#6B7280').text(`목업 ${mi + 1} URL: ${mockupUrl}`);
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
        doc.fontSize(13).fillColor('#000').text('가격 정보');
        doc.fontSize(11).fillColor('#333');
        if (order.pricing) {
          doc.text(`소계: ${order.pricing.subtotal || order.pricing.unitPrice || ''}`);
          doc.text(`수량: ${order.pricing.quantity || ''}`);
          doc.text(`배송비: ${order.pricing.shipping || ''}`);
          doc.text(`합계: ${order.pricing.total || ''}`);
        }

        // Footer note
        doc.moveDown();
        doc.fontSize(11).fillColor('#6B7280');
        doc.text(
          '※ 출력 이미지에 대한 최종 판단은 주문자가 해요. 주문서 메일을 꼭 확인해 주세요.'
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

// Serve static mockup images.
// Helmet sets `Cross-Origin-Resource-Policy: same-origin` by default, which can block
// images from being rendered in cross-origin contexts (e.g. Apps in Toss preview/webview).
// Allow these public mockups to be embedded cross-origin.
const MOCKUPS_DIR = path.join(process.cwd(), 'server-public/mockups');
app.use(
  '/mockups',
  (_req, res, next) => {
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    next();
  },
  (req, _res, next) => {
    if (!req.path.toLowerCase().endsWith('.png')) return next();
    const relPath = req.path.replace(/^\/+/, '');
    const pngPath = path.join(MOCKUPS_DIR, relPath);
    if (fs.existsSync(pngPath)) return next();
    const jpgPath = pngPath.replace(/\.png$/i, '.jpg');
    if (fs.existsSync(jpgPath)) {
      req.url = req.url.replace(/\.png(\?.*)?$/i, '.jpg$1');
    }
    return next();
  },
  express.static(MOCKUPS_DIR),
);

app.get('/health', async (_req, res) => {
  const databaseConfigured = Boolean(process.env.DATABASE_URL);
  let databaseHealthy = true;
  let databaseError = '';

  if (databaseConfigured) {
    try {
      const pool = getPool();
      if (!pool) {
        databaseHealthy = false;
        databaseError = 'database_pool_unavailable';
      } else {
        await pool.query('SELECT 1');
      }
    } catch (error) {
      databaseHealthy = false;
      databaseError = error?.message || 'database_connection_failed';
    }
  }

  const health = {
    ok: databaseConfigured ? databaseHealthy : true,
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
      gcs: Boolean(isGcsEnabled()),
      openai: Boolean(process.env.OPENAI_API_KEY),
      smtp: Boolean(process.env.SMTP_USER && process.env.SMTP_PASS),
      clipdrop: Boolean(CLIPDROP_API_KEY),
      db: databaseConfigured ? databaseHealthy : true,
      databaseConfigured,
      vertex: Boolean(VERTEX_PROJECT_ID && VERTEX_LOCATION && (VERTEX_API_KEY || process.env.GOOGLE_SERVICE_ACCOUNT_JSON || process.env.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64)),
    },
  };
  if (databaseError) {
    health.services.dbError = databaseError;
  }
  res.status(health.ok ? 200 : 503).json(health);
});

// Job-based generation API
app.use('/api/generations', strictLimiter, generationsRouter);

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
    const url = await uploadToStorage({ kind: 'image', key, body: buffer, contentType: mimeType });
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

    // Add white background instruction to prompt for easier background removal
    const enhancedPrompt = `${prompt}, on a plain white background`;
    const size =
      aspectRatio === '3:4'
        ? '1024x1536'
        : aspectRatio === '4:3'
          ? '1536x1024'
          : '1024x1024';

    const client = getOpenAIClient();
    logEvent('info', 'image_generate_request', {
      requestId: req.requestId,
      provider: 'openai',
      model: OPENAI_IMAGE_MODEL,
      quality: OPENAI_IMAGE_QUALITY,
      aspectRatio,
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
      n: count,
      size,
      quality: OPENAI_IMAGE_QUALITY,
      background: 'opaque',
      output_format: 'png',
    });

    const results = [];
    const generated = response?.data || [];
    for (const item of generated) {
      let buffer = null;
      if (item?.b64_json) {
        buffer = Buffer.from(item.b64_json, 'base64');
      } else if (item?.url) {
        const imgRes = await fetch(item.url);
        if (!imgRes.ok) continue;
        buffer = Buffer.from(await imgRes.arrayBuffer());
      }
      if (!buffer) continue;

      const mimeType = 'image/png';
      const key = `${IMAGE_PREFIX}/openai-${Date.now()}-${Math.random().toString(36).slice(2)}.png`;
      const url = await uploadToStorage({ kind: 'image', key, body: buffer, contentType: mimeType });
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
    res.json({ images: results, aspectRatio, requestId: req.requestId });
  } catch (error) {
    logEvent('error', 'image_generate_failed', {
      requestId: req.requestId,
      status: error.status,
      ...formatError(error),
    });
    res.status(500).json({ error: error.message || 'Image generation failed.', requestId: req.requestId });
  }
});

app.post('/v1/images/remove-background', strictLimiter, async (req, res) => {
  let clipdropTempDir = '';
  try {
    const { imageUrl, dataUrl, filename, returnBase64 } = req.body || {};
    if (!imageUrl && !dataUrl) {
      return res.status(400).json({ error: 'imageUrl or dataUrl is required.' });
    }
    const baseName = filename || `remove-bg-${Date.now()}`;
    const safeBaseName = String(baseName).replace(/[^a-zA-Z0-9-_]/g, '_');
    logEvent('info', 'remove_background_request', {
      requestId: req.requestId,
      sourceType: imageUrl ? 'url' : 'dataUrl',
      imageHost: imageUrl ? new URL(imageUrl).host : '',
      filename: filename || '',
      returnBase64: !!returnBase64,
      provider: REMOVE_BG_PROVIDER,
    });

    let inputBuffer;
    let inputMimeType = 'image/png';
    if (dataUrl) {
      const decoded = decodeDataUrl(dataUrl);
      if (!decoded) return res.status(400).json({ error: 'Invalid dataUrl.' });
      inputBuffer = decoded.buffer;
      inputMimeType = decoded.mimeType || inputMimeType;
    } else {
      inputBuffer = await downloadToBuffer(imageUrl);
      if (!inputBuffer) return res.status(400).json({ error: 'Failed to download imageUrl.' });
    }

    let outputBuffer;
    if (REMOVE_BG_PROVIDER === 'clipdrop') {
      if (!CLIPDROP_API_KEY) {
        return res.status(500).json({ error: 'CLIPDROP_API_KEY is required when REMOVE_BG_PROVIDER=clipdrop.' });
      }
      clipdropTempDir = await fsp.mkdtemp(path.join('/tmp', 'clipdrop-'));
      const inputPath = path.join(clipdropTempDir, `${safeBaseName}.png`);
      await fsp.writeFile(inputPath, inputBuffer);
      const outputPath = path.join(clipdropTempDir, `${safeBaseName}-nobg.png`);
      await removeBackgroundClipdrop({ sourcePath: inputPath, apiKey: CLIPDROP_API_KEY, outputPath });
      outputBuffer = await fsp.readFile(outputPath);
    } else if (REMOVE_BG_PROVIDER === 'vertex_imagen') {
      outputBuffer = await removeBackgroundVertexImagen({
        inputBuffer,
        inputMimeType,
        requestId: req.requestId,
      });
    } else {
      return res.status(400).json({ error: `Unsupported REMOVE_BG_PROVIDER: ${REMOVE_BG_PROVIDER}` });
    }

    const key = `${IMAGE_PREFIX}/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}-${baseName}.png`;
    const url = await uploadToStorage({ kind: 'image', key, body: outputBuffer, contentType: 'image/png' });
    logEvent('info', 'remove_background_result', {
      requestId: req.requestId,
      url,
      bytes: outputBuffer.length,
      provider: REMOVE_BG_PROVIDER,
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
  } finally {
    if (clipdropTempDir && isPathInTmp(clipdropTempDir)) {
      await safeRemoveDir(clipdropTempDir);
    }
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

    // Upload to storage
    const key = `${IMAGE_PREFIX}/${Date.now()}-${Math.random().toString(36).slice(2)}-cropped.png`;
    const url = await uploadToStorage({ kind: 'image', key, body: croppedBuffer, contentType: 'image/png' });

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

    if (!dataUrl) {
      return res.status(400).json({ error: 'dataUrl is required.' });
    }
    if (!style) {
      return res.status(400).json({ error: 'style is required.' });
    }
    const decoded = decodeDataUrl(dataUrl);
    if (!decoded) {
      return res.status(400).json({ error: 'Invalid dataUrl.' });
    }

    logEvent('info', 'style_transfer_request', {
      requestId: req.requestId,
      style,
      returnBase64: !!returnBase64,
      dataUrlLength: dataUrl.length,
    });

    const stylePrompts = {
      'watercolor': 'watercolor painting style, soft and flowing watercolor textures, gentle color blending, artistic brush strokes, on white background',
      'sketch': 'pencil sketch style, hand-drawn lines, black and white illustration, artistic sketching, on white background',
      'cartoon': 'cartoon illustration style, bold outlines, vibrant colors, comic book art style, on white background',
      'pixel': '8-bit pixel art style, retro video game graphics, pixelated design, digital pixel aesthetic, on white background',
      'oil': 'oil painting style, thick paint texture, visible brush strokes, classical painting technique, on white background',
      'minimal': 'minimal line art style, simple clean lines, minimalist design, elegant simplicity, on white background',
    };

    const styleDescription = stylePrompts[style] || stylePrompts['watercolor'];
    const enhancedPrompt = `Transform this image into ${styleDescription}. IMPORTANT: Keep the exact same subject, shape, composition, and layout as the original image. Only change the artistic style and rendering technique. Do not add, remove, or modify any elements from the original image.`;

    const client = getOpenAIClient();
    const inputFile = await OpenAI.toFile(decoded.buffer, 'input.png', {
      type: decoded.mimeType || 'image/png',
    });
    const response = await client.images.edit({
      model: OPENAI_IMAGE_MODEL,
      image: inputFile,
      prompt: enhancedPrompt,
      n: 1,
      size: '1024x1024',
      quality: OPENAI_IMAGE_QUALITY,
      background: 'opaque',
    });

    const b64 = response?.data?.[0]?.b64_json;
    if (!b64) {
      throw new Error('style_transfer_empty');
    }

    const styledBuffer = Buffer.from(b64, 'base64');

    const key = `${IMAGE_PREFIX}/${Date.now()}-${Math.random().toString(36).slice(2)}-styled.png`;
    const url = await uploadToStorage({
      kind: 'image',
      key,
      body: styledBuffer,
      contentType: 'image/png',
    });

    logEvent('info', 'style_transfer_result', {
      requestId: req.requestId,
      style,
      url,
      bytes: styledBuffer.length,
    });

    const result = { url, requestId: req.requestId };
    if (returnBase64) {
      result.dataUrl = `data:image/png;base64,${styledBuffer.toString('base64')}`;
    }

    res.json(result);
  } catch (error) {
    logEvent('error', 'style_transfer_failed', {
      requestId: req.requestId,
      ...formatError(error),
    });
    res.status(500).json({ error: error.message || 'Style transfer failed.', requestId: req.requestId });
  }
});

app.post('/v1/print-files/process', strictLimiter, async (req, res) => {
  let workDirToCleanup = null;
  try {
    const payload = req.body || {};
    const orderId = payload.order_id || `manual-${Date.now()}`;
    logEvent('info', 'print_pipeline_request', {
      requestId: req.requestId,
      orderId,
      targetWidth: payload.target_width_px,
      targetHeight: payload.target_height_px,
    });
    const result = await runPrintPipeline({
      master_png_path: payload.master_png_path,
      order_id: orderId,
      target_width_px: payload.target_width_px,
      target_height_px: payload.target_height_px,
      gcp_project_id: payload.gcp_project_id || process.env.GCP_PROJECT_ID,
      gcp_location: payload.gcp_location || process.env.GCP_LOCATION,
      output_dir: payload.output_dir || ORDER_OUTPUT_DIR,
      allow_warn_to_pass: false,
      text_layer: payload.text_layer || null,
      image_transform: payload.image_transform || null,
      text_transform: payload.text_transform || null,
    });
    const persisted = await persistPipelineArtifacts({ orderId, pipelineResult: result });
    workDirToCleanup = derivePipelineWorkDir(result);
    res.json({ ...persisted, requestId: req.requestId });
  } catch (error) {
    logEvent('error', 'print_pipeline_failed', {
      requestId: req.requestId,
      ...formatError(error),
    });
    res.status(500).json({ error: error.message || 'pipeline_failed', requestId: req.requestId });
  } finally {
    if (workDirToCleanup && isPathInTmp(workDirToCleanup)) {
      await safeRemoveDir(workDirToCleanup);
    }
  }
});

app.post('/v1/orders/submit', strictLimiter, async (req, res) => {
  let pipelineWorkDir = null;
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
      pipelineWorkDir = workDir;
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
            gcp_project_id: process.env.GCP_PROJECT_ID,
            gcp_location: process.env.GCP_LOCATION,
            output_dir: ORDER_OUTPUT_DIR,
            allow_warn_to_pass: true, // Allow warnings to pass, only fail on errors
            text_layer: order.pipeline?.textLayer || order.items?.[0]?.text || null,
            image_transform: order.pipeline?.imageTransform || null,
            text_transform: order.pipeline?.textTransform || null,
          });
          pipelineResult = await persistPipelineArtifacts({ orderId, pipelineResult });

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
      pdfUrl = await uploadToStorage({ kind: 'pdf', key, body: pdfBuffer, contentType: 'application/pdf' });
    }

    const adminTo = process.env.ORDER_EMAIL_TO || DEFAULT_ORDER_EMAIL_TO;

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

새로운 주문이 들어왔어요.

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
⚠️ 확인해 주세요
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
출력 이미지에 대한 최종 판단은 주문자가 해요.
첨부된 주문서를 꼭 확인해 주세요.

※ 제작 완료 예정일과 발송 방법을 회신해 주세요.

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

주문이 정상적으로 접수됐어요.

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
주문 내역서 PDF가 첨부되어 있어요.
${pdfUrl ? `\n📄 PDF 다운로드: ${pdfUrl}` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ 안내
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
제작 완료 예정일은 거래처에서 회신해 드릴 예정이에요.
문의 사항이 있으면 이 메일에 답장해 주세요.

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
  } finally {
    if (pipelineWorkDir && isPathInTmp(pipelineWorkDir)) {
      await safeRemoveDir(pipelineWorkDir);
    }
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
  { id: 'logo', label: '로고 (10cm 미만)', description: '작은 로고, 심플해요', price: 2500, designScale: 0.35 },
  { id: 'a5', label: 'A5 (10~15cm)', description: '적당한 크기예요', price: 5500, designScale: 0.5 },
  { id: 'a4', label: 'A4 (15~28cm)', description: '일반 포스터 크기예요', price: 7500, designScale: 0.7 },
  { id: 'a3', label: 'A3 (최대)', description: '크게 전면 인쇄해요', price: 9500, designScale: 0.9 },
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
    warnings.push('프린팅 영역이 최대 크기에 가까워요.');
  }

  if (widthCm < 8) {
    warnings.push('프린팅이 너무 작아 세부 사항이 흐릿할 수 있어요.');
  }

  if (placement === 'back') {
    warnings.push('뒷면 인쇄는 앞면보다 위치 조정이 제한적일 수 있어요.');
  }

  const description = `${label} 크기로 ${garmentMeasurements.size} 사이즈에 프린팅하면 약 ${widthCm}cm × ${heightCm}cm 크기로 인쇄돼요.`;

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
      warnings.push('프린팅 영역이 최대 크기에 가까워요.');
    }

    if (widthCm < 8) {
      warnings.push('프린팅이 너무 작아 세부 사항이 흐릿할 수 있어요.');
    }

    if (placement === 'back') {
      warnings.push('뒷면 인쇄는 앞면보다 위치 조정이 제한적일 수 있어요.');
    }

    const description = `${printOptionLabel} 크기로 ${garmentMeasurements.size} 사이즈에 프린팅하면 약 ${widthCm}cm × ${heightCm}cm 크기로 인쇄돼요.`;

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

function parseBasicAuthCredentials(rawHeaderValue) {
  const queue = [String(rawHeaderValue || '').trim()];
  const seen = new Set();
  const maxHops = 12;
  const isLikelyBase64 = (value) =>
    value.length >= 4 &&
    value.length <= 2048 &&
    value.length % 4 === 0 &&
    /^[A-Za-z0-9+/=]+$/.test(value);

  const pushCandidate = (value) => {
    const normalized = String(value || '').trim().replace(/^["']|["']$/g, '');
    if (!normalized || seen.has(normalized)) return;
    queue.push(normalized);
  };

  while (queue.length > 0 && seen.size < maxHops) {
    const current = queue.shift();
    if (!current || seen.has(current)) continue;
    seen.add(current);

    if (current.includes(':')) {
      const separatorIndex = current.indexOf(':');
      const username = current.slice(0, separatorIndex).trim();
      const password = current.slice(separatorIndex + 1).trim();
      if (username && password) {
        return { username, password };
      }
    }

    if (current.toLowerCase().startsWith('basic ')) {
      pushCandidate(current.slice(6));
    }

    if (current.includes(' ')) {
      const segments = current.split(/\s+/).filter(Boolean);
      if (segments.length >= 2) {
        pushCandidate(segments[segments.length - 1]);
      }
    }

    try {
      const decodedUri = decodeURIComponent(current);
      if (decodedUri !== current) {
        pushCandidate(decodedUri);
      }
    } catch (error) {
      // Ignore malformed URI encoding and continue.
    }

    if (isLikelyBase64(current)) {
      try {
        const decodedBase64 = Buffer.from(current, 'base64').toString('utf-8').trim();
        if (decodedBase64 && decodedBase64 !== current) {
          pushCandidate(decodedBase64);
        }
      } catch (error) {
        // Ignore invalid base64 and continue.
      }
    }
  }

  return null;
}

// Middleware to verify Basic Auth for Toss disconnect callback
function verifyTossCallbackAuth(req, res, next) {
  const TOSS_CALLBACK_USERNAME = process.env.TOSS_CALLBACK_USERNAME;
  const TOSS_CALLBACK_PASSWORD = process.env.TOSS_CALLBACK_PASSWORD;

  // If credentials not configured, skip auth check (for testing)
  if (!TOSS_CALLBACK_USERNAME || !TOSS_CALLBACK_PASSWORD) {
    console.warn('TOSS_CALLBACK_USERNAME/PASSWORD not set - skipping Basic Auth');
    return next();
  }

  const authHeader =
    req.headers.authorization ||
    req.headers['x-authorization'] ||
    req.headers['x-basic-auth'] ||
    req.headers['basic-auth'] ||
    '';

  logEvent('info', 'toss_callback_auth_received', {
    requestId: req.requestId,
    method: req.method,
    path: req.path,
    hasAuthHeader: Boolean(authHeader),
    authLength: typeof authHeader === 'string' ? authHeader.length : 0,
    authPrefix:
      typeof authHeader === 'string' && authHeader.trim().length > 0
        ? authHeader.trim().split(/\s+/)[0]
        : '',
    origin: req.headers.origin || '',
    userAgent: req.headers['user-agent'] || '',
  });

  if (!authHeader) {
    logEvent('warn', 'toss_callback_auth_missing', {
      requestId: req.requestId,
      method: req.method,
      path: req.path,
    });
    return res.status(401).json({ error: 'Unauthorized - Basic Auth required' });
  }

  const parsed = parseBasicAuthCredentials(authHeader);
  if (parsed && parsed.username === TOSS_CALLBACK_USERNAME && parsed.password === TOSS_CALLBACK_PASSWORD) {
    next();
  } else {
    logEvent('warn', 'toss_callback_auth_invalid', {
      requestId: req.requestId,
      method: req.method,
      path: req.path,
      parsedUsername: parsed?.username || '',
    });
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
// Toss OAuth Login Endpoints
// ========================================
// Use same base URL as payment API - the OAuth endpoints are on the same server
const TOSS_OAUTH_API_URL = process.env.TOSS_OAUTH_API_URL || 'https://pay-apps-in-toss-api.toss.im';

// Exchange authorization code for access token and get user info
app.post('/v1/auth/login', strictLimiter, async (req, res) => {
  try {
    const { authorizationCode, referrer } = req.body || {};

    if (!authorizationCode) {
      return res.status(400).json({ error: 'authorizationCode is required.' });
    }

    logEvent('info', 'toss_login_request', {
      requestId: req.requestId,
      referrer,
    });

    // Get mTLS agent
    const agent = getHttpsAgent();
    if (!agent) {
      console.error('[Toss Login] mTLS agent not available');
      return res.status(500).json({
        error: 'Authentication service configuration error.',
        details: 'mTLS certificates not configured',
      });
    }

    // Step 1: Exchange authorization code for access token
    // Using generate-token endpoint as per Toss documentation
    let tokenResponse;
    try {
      tokenResponse = await axios({
        method: 'POST',
        url: `${TOSS_OAUTH_API_URL}/api-partner/v1/apps-in-toss/user/oauth2/generate-token`,
        headers: {
          'Content-Type': 'application/json',
        },
        data: {
          authorizationCode,
          referrer: referrer || 'DEFAULT',
        },
        httpsAgent: agent,
        timeout: 15000,
      });
    } catch (tokenError) {
      console.error('[Toss Login] Token exchange failed:', {
        error: tokenError.message,
        status: tokenError.response?.status,
        data: tokenError.response?.data,
      });
      return res.status(401).json({
        error: 'Failed to authenticate with Toss.',
        details: tokenError.response?.data || tokenError.message,
      });
    }

    const accessToken = tokenResponse.data?.success?.accessToken || tokenResponse.data?.accessToken;
    if (!accessToken) {
      console.error('[Toss Login] No access token in response:', tokenResponse.data);
      return res.status(401).json({
        error: 'Failed to get access token from Toss.',
        details: tokenResponse.data,
      });
    }

    // Step 2: Get user info including userKey
    let userInfoResponse;
    try {
      userInfoResponse = await axios({
        method: 'GET',
        url: `${TOSS_OAUTH_API_URL}/api-partner/v1/apps-in-toss/user/oauth2/login-me`,
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
        httpsAgent: agent,
        timeout: 15000,
      });
    } catch (userError) {
      console.error('[Toss Login] User info fetch failed:', {
        error: userError.message,
        status: userError.response?.status,
        data: userError.response?.data,
      });
      return res.status(401).json({
        error: 'Failed to get user info from Toss.',
        details: userError.response?.data || userError.message,
      });
    }

    const userInfo = userInfoResponse.data?.success;
    if (!userInfo?.userKey) {
      console.error('[Toss Login] No userKey in response:', userInfoResponse.data);
      return res.status(401).json({
        error: 'Failed to get userKey from Toss.',
        details: userInfoResponse.data,
      });
    }

    logEvent('info', 'toss_login_success', {
      requestId: req.requestId,
      userKey: userInfo.userKey,
      scope: userInfo.scope,
    });

    // Return userKey and other user info to client
    res.json({
      userKey: String(userInfo.userKey), // Convert to string for header use
      scope: userInfo.scope,
      agreedTerms: userInfo.agreedTerms,
      // Note: Encrypted personal info is not sent to client
      requestId: req.requestId,
    });
  } catch (error) {
    logEvent('error', 'toss_login_error', {
      requestId: req.requestId,
      ...formatError(error),
    });
    res.status(500).json({ error: error.message || 'Login failed.', requestId: req.requestId });
  }
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

    // Get mTLS agent for Toss API authentication
    const agent = getHttpsAgent();
    if (!agent) {
      console.error('[Payment Execute] mTLS agent not available');
      return res.status(500).json({
        error: 'Payment service configuration error.',
        details: 'mTLS certificates not configured',
      });
    }

    let response;
    try {
      response = await axios({
        method: 'POST',
        url: `${TOSSPAY_API_URL}/api-partner/v1/apps-in-toss/pay/execute-payment`,
        headers: {
          'Content-Type': 'application/json',
          'x-toss-user-key': userKey,
        },
        data: {
          payToken,
          orderNo,
          isTestPayment: IS_TEST_PAYMENT,
        },
        httpsAgent: agent,
        timeout: 30000,
      });
    } catch (axiosError) {
      console.error('[Payment Execute] Request failed:', {
        error: axiosError.message,
        code: axiosError.code,
        status: axiosError.response?.status,
        data: axiosError.response?.data,
      });
      return res.status(503).json({
        error: 'Failed to execute payment. Please try again.',
        details: axiosError.message,
        responseData: axiosError.response?.data,
      });
    }

    const data = response.data;

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
      let orderPipelineWorkDir = null;
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

        const mailer = getMailer();
        if (mailer) {
          if (Array.isArray(orderData.items)) {
            for (const item of orderData.items) {
              if (item.print?.scale !== undefined && item.productName && item.size) {
                const category = getGarmentCategory(item.productName);
                const measurements = getGarmentMeasurements(category, item.size);

                if (measurements) {
                  const scale = Math.max(0, Math.min(1, Number(item.print.scale)));
                  const widthCm = Math.round(measurements.printableWidth * scale * 10) / 10;
                  const heightCm = Math.round(measurements.printableHeight * scale * 10) / 10;
                  item.print.sizeCm = `${widthCm}cm × ${heightCm}cm`;
                  item.print.calculatedWidth = widthCm;
                  item.print.calculatedHeight = heightCm;
                }
              }
            }
          }

          let pipelineResult = null;
          if (orderData.pipeline?.enabled !== false) {
            const orderId = orderData.orderId || String(Date.now());
            const workDir = path.join(ORDER_OUTPUT_DIR, orderId);
            orderPipelineWorkDir = workDir;
            await fsp.mkdir(workDir, { recursive: true });

            let masterPath = orderData.pipeline?.masterPngPath || null;
            if (!masterPath) {
              const sourceUrl =
                orderData.pipeline?.masterPngUrl ||
                orderData.masterPngUrl ||
                orderData.items?.[0]?.designUrl ||
                '';
              if (sourceUrl) {
                const downloadPath = path.join(workDir, 'master_input.png');
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
                const targetWidth = orderData.pipeline?.targetWidthPx || 2480;
                const targetHeight = orderData.pipeline?.targetHeightPx || 3508;
                pipelineResult = await runPrintPipeline({
                  master_png_path: masterPath,
                  order_id: orderId,
                  target_width_px: targetWidth,
                  target_height_px: targetHeight,
                  gcp_project_id: process.env.GCP_PROJECT_ID,
                  gcp_location: process.env.GCP_LOCATION,
                  output_dir: ORDER_OUTPUT_DIR,
                  allow_warn_to_pass: true,
                  text_layer: orderData.pipeline?.textLayer || orderData.items?.[0]?.text || null,
                  image_transform: orderData.pipeline?.imageTransform || null,
                  text_transform: orderData.pipeline?.textTransform || null,
                });
                pipelineResult = await persistPipelineArtifacts({ orderId, pipelineResult });

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
              }
            }
          }

          const pdfBuffer = await buildOrderPdf(orderData);
          const pdfName = `order-${orderData.orderId}.pdf`;

          let pdfUrl = '';
          if (orderData.storePdf !== false) {
            const key = `${PDF_PREFIX}/${pdfName}`;
            pdfUrl = await uploadToStorage({ kind: 'pdf', key, body: pdfBuffer, contentType: 'application/pdf' });
          }

          const adminTo = process.env.ORDER_EMAIL_TO || DEFAULT_ORDER_EMAIL_TO;
          const customerEmail = orderData.customer?.email || '';
          const customerName = orderData.customer?.name || '주문자';

          const attachments = [{ filename: pdfName, content: pdfBuffer }];
          if (pipelineResult?.output_path && fs.existsSync(pipelineResult.output_path)) {
            try {
              const pngBuffer = await fsp.readFile(pipelineResult.output_path);
              const pngName = `print-ready-${orderData.orderId}.png`;
              attachments.push({ filename: pngName, content: pngBuffer });
            } catch (pngErr) {
              logEvent('warn', 'png_attachment_failed', {
                orderId: orderData.orderId,
                error: pngErr.message,
              });
            }
          }

          if (adminTo) {
            await mailer.sendMail({
              from: process.env.SMTP_FROM || process.env.SMTP_USER,
              to: adminTo,
              subject: `🎽 결제 완료: ${orderData.orderId} - ${customerName}`,
              text: `주문번호: ${orderData.orderId}\n결제금액: ${data.success?.paidAmount}원\n결제수단: ${data.success?.payMethod}`,
              attachments,
            });
          }

          if (customerEmail) {
            await mailer.sendMail({
              from: process.env.SMTP_FROM || process.env.SMTP_USER,
              to: customerEmail,
              subject: `[티셔츠메이커] 주문이 완료되었습니다 - ${orderData.orderId}`,
              text: `안녕하세요 ${customerName}님,\n\n주문이 완료되었습니다.\n주문번호: ${orderData.orderId}\n결제금액: ${data.success?.paidAmount}원\n\n주문서를 첨부해 드립니다.`,
              attachments,
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
      } finally {
        if (orderPipelineWorkDir && isPathInTmp(orderPipelineWorkDir)) {
          await safeRemoveDir(orderPipelineWorkDir);
        }
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

// ========================================
// Refund Policy Page
// ========================================
app.get('/refund-policy', (req, res) => {
  const html = `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>환불 약관 - Merchandise GPT</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      line-height: 1.6;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      color: #333;
    }
    h1 {
      color: #1a1a1a;
      border-bottom: 2px solid #4a90e2;
      padding-bottom: 10px;
    }
    h2 {
      color: #2c3e50;
      margin-top: 30px;
    }
    .article {
      margin: 20px 0;
      padding: 15px;
      background: #f8f9fa;
      border-left: 4px solid #4a90e2;
    }
    .contact {
      margin-top: 40px;
      padding: 20px;
      background: #e8f4f8;
      border-radius: 8px;
    }
    ul {
      padding-left: 20px;
    }
    li {
      margin: 10px 0;
    }
  </style>
</head>
<body>
  <h1>환불 약관</h1>
  <p><strong>서비스명:</strong> Merchandise GPT (굿즈 GPT)</p>
  <p><strong>시행일:</strong> 2026년 2월 4일</p>

  <div class="article">
    <h2>제1조 (청약철회)</h2>
    <p>「전자상거래 등에서의 소비자 보호에 관한 법률」 제17조에 따라, 구매자는 상품을 배송받은 날로부터 7일 이내에 청약철회(환불)를 요청할 수 있습니다.</p>
  </div>

  <div class="article">
    <h2>제2조 (청약철회 제한)</h2>
    <p>다음의 경우에는 청약철회가 제한됩니다:</p>
    <ul>
      <li>구매자의 요청에 따라 개별적으로 제작된 맞춤형 상품의 경우</li>
      <li>구매자의 책임 있는 사유로 상품이 훼손된 경우</li>
      <li>상품의 포장을 개봉하여 상품 가치가 현저히 감소한 경우</li>
    </ul>
    <p><strong>※ 본 서비스는 주문 즉시 제작(POD) 방식으로, 고객이 선택한 디자인으로 개별 제작되는 맞춤형 상품입니다.</strong></p>
  </div>

  <div class="article">
    <h2>제3조 (환불 가능 사유)</h2>
    <p>다음의 경우 배송 완료일로부터 7일 이내 환불이 가능합니다:</p>
    <ul>
      <li>배송된 상품이 주문한 상품과 다른 경우</li>
      <li>상품에 하자(불량, 파손 등)가 있는 경우</li>
      <li>배송 중 상품이 훼손된 경우</li>
    </ul>
  </div>

  <div class="article">
    <h2>제4조 (환불 절차)</h2>
    <ol>
      <li>고객센터로 환불 요청 (이메일 또는 채널톡)</li>
      <li>환불 사유 확인 및 상품 회수</li>
      <li>환불 승인 후 3~5영업일 내 환불 처리</li>
    </ol>
    <p><strong>※ 환불은 원 결제수단으로 환불됩니다 (토스페이 결제 → 토스페이 환불)</strong></p>
  </div>

  <div class="article">
    <h2>제5조 (환불 비용)</h2>
    <ul>
      <li>판매자 귀책사유(상품 하자, 오배송 등): 왕복 배송비 판매자 부담</li>
      <li>구매자 단순 변심: 왕복 배송비 구매자 부담 (단, 맞춤 제작 상품은 환불 불가)</li>
    </ul>
  </div>

  <div class="contact">
    <h2>고객센터</h2>
    <p><strong>이메일:</strong> support@merchandisegpt.com</p>
    <p><strong>운영시간:</strong> 평일 10:00 - 18:00 (주말 및 공휴일 제외)</p>
    <p><strong>상호:</strong> Merchandise GPT</p>
  </div>

  <p style="margin-top: 40px; color: #666; font-size: 14px;">
    본 약관은 「전자상거래 등에서의 소비자 보호에 관한 법률」, 「소비자기본법」 등 관련 법령을 준수합니다.
  </p>
</body>
</html>
  `;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
});

// Initialize database and start server
let serverInstance = null;
let isShuttingDown = false;

async function startServer() {
  try {
    await initializeDatabase();
  } catch (error) {
    console.error('Database initialization failed, but continuing:', error.message);
  }

  serverInstance = app.listen(PORT, () => {
    logEvent('info', 'server_config', {
      port: PORT,
      gcsEnabled: isGcsEnabled(),
      gcsUploadBucket: GCS_UPLOAD_BUCKET || '',
      gcsOrderBucket: GCS_ORDER_BUCKET || '',
      imagePrefix: IMAGE_PREFIX,
      pdfPrefix: PDF_PREFIX,
      signedUrlTtlSeconds: SIGNED_URL_TTL_SECONDS,
      openaiModel: OPENAI_IMAGE_MODEL,
      openaiQuality: OPENAI_IMAGE_QUALITY,
      imagenModel: IMAGEN_MODEL,
      imagenEnabled: Boolean(process.env.GOOGLE_API_KEY),
      vertexEnabled: Boolean(VERTEX_PROJECT_ID),
      vertexLocation: VERTEX_LOCATION,
      clipdropEnabled: Boolean(CLIPDROP_API_KEY),
      databaseEnabled: Boolean(process.env.DATABASE_URL),
      kakaoApiEnabled: Boolean(process.env.KAKAO_REST_API_KEY),
      orderOutputDir: ORDER_OUTPUT_DIR,
    });
    console.log(`server listening on ${PORT}`);
  });
}

async function gracefulShutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logEvent('info', 'shutdown_started', { signal });

  try {
    if (serverInstance) {
      await Promise.race([
        new Promise((resolve) => serverInstance.close(() => resolve())),
        new Promise((resolve) => setTimeout(resolve, 10000)),
      ]);
    }
    await closePool();
    logEvent('info', 'shutdown_completed', { signal });
    process.exit(0);
  } catch (error) {
    logEvent('error', 'shutdown_failed', {
      signal,
      ...formatError(error),
    });
    process.exit(1);
  }
}

process.on('SIGTERM', () => {
  void gracefulShutdown('SIGTERM');
});

process.on('SIGINT', () => {
  void gracefulShutdown('SIGINT');
});

startServer();
