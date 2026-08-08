const crypto = require('crypto');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const nodemailer = require('nodemailer');
const PDFDocument = require('pdfkit');
const { isBlobConfigured, uploadToBlob } = require('./blobStorage');
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const https = require('https');
const axios = require('axios');
const { runPrintPipeline, summarizeQcForOperator } = require('./printPipeline');
const {
  createAitSessionEnvelope,
  createDisconnectAuthVerifier,
} = require('./lib/aitPlatform');
const {
  getPool,
  initializeDatabase,
  closePool,
  describeConnectionTarget,
} = require('./db');
const {
  saveOrder,
  listOrdersByUser,
  getOrderForUser,
  deleteOrdersByUser,
} = require('./orders');

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

/**
 * Rate limiting.
 *
 * express-rate-limit's default MemoryStore counts per process. On a serverless
 * host each warm instance keeps its own tally, so the effective limit becomes
 * max x instances. With Redis credentials present the counters are shared and
 * the limit means what it says; without them we fall back to per-instance
 * counting and report that at boot.
 */
const { createRateLimitStore, rateLimitStoreKind } = require('./rateLimitStore');

const buildLimiter = ({ windowMs, max, message, prefix }) =>
  rateLimit({
    windowMs,
    max,
    message,
    standardHeaders: true,
    legacyHeaders: false,
    store: createRateLimitStore({ windowMs, prefix }),
  });

// Global rate limiter: 100 requests per 15 minutes per IP
const globalLimiter = buildLimiter({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please try again later.' },
  prefix: 'rl:global:',
});
app.use(globalLimiter);

// Strict rate limiter for expensive operations
const strictLimiter = buildLimiter({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Rate limit exceeded for this operation.' },
  prefix: 'rl:strict:',
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

/**
 * Kick off schema initialisation at module load and gate requests on it.
 *
 * A long-lived process gets this via startServer(), but a serverless host
 * imports this module and dispatches a request straight away, so the first
 * request could otherwise race table creation on a fresh database.
 * initializeDatabase() is CREATE TABLE IF NOT EXISTS throughout, so running it
 * once per cold start is harmless.
 */
let databaseReady = null;

function ensureDatabaseReady() {
  if (!databaseReady) {
    databaseReady = initializeDatabase().catch((error) => {
      console.error('Database initialization failed:', error?.message);
      // Clear the memo so the next request retries. Initialisation is
      // CREATE TABLE IF NOT EXISTS throughout, and a cold start that loses the
      // race would otherwise serve 500s until the instance is recycled.
      databaseReady = null;
      throw error;
    });
  }
  return databaseReady;
}

ensureDatabaseReady().catch(() => {});

app.use((_req, _res, next) => {
  ensureDatabaseReady().then(() => next(), () => next());
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
const IMAGE_PREFIX = process.env.BLOB_IMAGE_PREFIX || 'uploads';
const ORDER_OUTPUT_DIR = process.env.ORDER_OUTPUT_DIR || path.join('/tmp', 'order-output');
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


function isStorageEnabled() {
  return isBlobConfigured();
}

/**
 * Only design artwork reaches storage, and the app renders it directly, so the
 * store is public.
 *
 * Order PDFs are deliberately not stored. They are delivered as email
 * attachments and the order itself lives in the orders table, so keeping a copy
 * of the customer's name, phone and address in object storage would be data at
 * rest that nothing ever reads.
 */
async function uploadToStorage({ key, body, contentType }) {
  if (!isStorageEnabled()) {
    throw new Error('Blob storage is not configured. Set BLOB_READ_WRITE_TOKEN.');
  }

  try {
    const { url } = await uploadToBlob({ key, body, contentType, access: 'public' });
    return url;
  } catch (error) {
    logEvent('error', 'blob_upload_failed', { key, ...formatError(error) });
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
  if (!pipelineResult || !pipelineResult.paths || !isStorageEnabled()) {
    return pipelineResult;
  }

  const artifactUrls = {};

  const printReadyPath = pipelineResult.paths.print_ready_png;
  if (printReadyPath && fs.existsSync(printReadyPath)) {
    const printReadyBuffer = await fsp.readFile(printReadyPath);
    const key = buildPipelineArtifactKey(orderId, 'print_ready.png');
    artifactUrls.print_ready_png = await uploadToStorage({
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







async function buildOrderPdf(order) {
  return new Promise((resolve, reject) => {
    const fontRegular = path.join(__dirname, '..', 'assets', 'fonts', 'NotoSansKR-Regular.ttf');
    const fontBold = path.join(__dirname, '..', 'assets', 'fonts', 'NotoSansKR-Bold.ttf');
    const doc = new PDFDocument({ size: 'A4', margin: 48 });
    if (fs.existsSync(fontRegular)) doc.registerFont('NotoSansKR', fontRegular);
    if (fs.existsSync(fontBold)) doc.registerFont('NotoSansKR-Bold', fontBold);
    const defaultFont = fs.existsSync(fontRegular) ? 'NotoSansKR' : 'Helvetica';
    const boldFont = fs.existsSync(fontBold) ? 'NotoSansKR-Bold' : 'Helvetica-Bold';
    doc.font(defaultFont);
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Async processing wrapper
    (async () => {
      try {

        // Header
        doc.font(boldFont).fontSize(18).text('주문서', { align: 'left' });
        doc.moveDown(0.5);
        doc.font(defaultFont).fontSize(11).fillColor('#333');

        const createdAt = order.createdAt || new Date().toISOString();
        doc.text(`주문번호: ${order.orderId || 'N/A'}`);
        doc.text(`주문일시: ${createdAt}`);
        doc.text(`채널: ${order.channel || 'Toss Miniapp'}`);
        doc.moveDown();

        // Customer Info
        doc.font(boldFont).fontSize(13).text('주문자 정보');
        doc.font(defaultFont).fontSize(11);
        if (order.customer) {
          doc.text(`이름: ${order.customer.name || ''}`);
          doc.text(`연락처: ${order.customer.phone || ''}`);
          doc.text(`이메일: ${order.customer.email || ''}`);
        }
        doc.moveDown();

        // Shipping Info
        doc.font(boldFont).fontSize(13).text('배송 정보');
        doc.font(defaultFont).fontSize(11);
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
        doc.font(boldFont).fontSize(13).text('주문 상품');
        doc.font(defaultFont).fontSize(11);
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
        doc.font(boldFont).fontSize(13).fillColor('#000').text('가격 정보');
        doc.font(defaultFont).fontSize(11).fillColor('#333');
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
// Mockups live in public/ so a static host can serve them without waking a
// function; vercel.json routes /mockups/* straight to those files. This handler
// is the local-development path and the fallback when no static host is in
// front. The former .png -> .jpg fallback is gone: every .jpg now has a
// matching .png, so it never fired.
const MOCKUPS_DIR = path.join(process.cwd(), 'public/mockups');
app.use(
  '/mockups',
  (_req, res, next) => {
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    next();
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
      blob: Boolean(isStorageEnabled()),
      pdfFonts: fs.existsSync(
        path.join(__dirname, '..', 'assets', 'fonts', 'NotoSansKR-Regular.ttf'),
      ),
      smtp: Boolean(process.env.SMTP_USER && process.env.SMTP_PASS),
      db: databaseConfigured ? databaseHealthy : true,
      databaseConfigured,
    },
  };
  if (databaseError) {
    health.services.dbError = databaseError;
    // A bad DATABASE_URL only ever shows up as an opaque DNS failure, and the
    // stored value cannot be read back, so report where it actually points.
    // Host, port and database name only — no user, no password.
    health.services.dbTarget = describeConnectionTarget(process.env.DATABASE_URL);
  }
  res.status(health.ok ? 200 : 503).json(health);
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
      output_dir: payload.output_dir || ORDER_OUTPUT_DIR,
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
          // The print canvas is the garment's printable region at 300 DPI.
          // A t-shirt's 28x36cm is the fallback when the client did not say.
          const targetWidth = order.pipeline?.targetWidthPx || 3307;
          const targetHeight = order.pipeline?.targetHeightPx || 4252;

          pipelineResult = await runPrintPipeline({
            master_png_path: masterPath,
            order_id: orderId,
            target_width_px: targetWidth,
            target_height_px: targetHeight,
            output_dir: ORDER_OUTPUT_DIR,
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
- 주문서 PDF (상세 정보, 디자인 이미지, 목업 이미지 포함)${pipelineResult?.output_path ? '\n- 인쇄용 PNG 파일' : ''}

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

    // Best-effort persistence. The email above is what actually gets the order
    // fulfilled, so a database problem must not fail a paid order — but it does
    // need to be loud, because an unstored order is invisible to the customer's
    // history and to withdrawal erasure.
    try {
      const userId = req.headers['x-toss-user-key'] || order.userKey || null;
      const saved = await saveOrder({ order, userId });
      if (saved) {
        logEvent('info', 'order_persisted', {
          requestId: req.requestId,
          orderId: saved.order_id,
          hasUserId: Boolean(userId),
        });
      } else {
        logEvent('warn', 'order_persist_skipped_no_db', {
          requestId: req.requestId,
          orderId: order.orderId || '',
        });
      }
    } catch (persistError) {
      logEvent('error', 'order_persist_failed', {
        requestId: req.requestId,
        orderId: order.orderId || '',
        ...formatError(persistError),
      });
    }

    res.json({ ok: true, pipeline: pipelineResult, requestId: req.requestId });
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
  const verifyDisconnectAuthorization = createDisconnectAuthVerifier({
    username: TOSS_CALLBACK_USERNAME,
    password: TOSS_CALLBACK_PASSWORD,
  });

  // Fail closed. This endpoint erases a user's orders and inquiries, so an
  // unconfigured deployment must refuse the request rather than wave it
  // through — otherwise anyone who can reach the URL can delete any user's
  // data by guessing a userId.
  if (!TOSS_CALLBACK_USERNAME || !TOSS_CALLBACK_PASSWORD) {
    logEvent('error', 'toss_callback_credentials_missing', {
      requestId: req.requestId,
      method: req.method,
      path: req.path,
    });
    return res.status(503).json({
      error: 'Callback authentication is not configured.',
      requestId: req.requestId,
    });
  }

  const rawAuthHeader =
    req.headers.authorization ||
    req.headers['x-authorization'] ||
    req.headers['x-basic-auth'] ||
    req.headers['basic-auth'] ||
    '';

  // The console stores whatever is typed into its "Basic Auth 헤더" field and
  // sends it as-is, so a value entered without the scheme arrives as a bare
  // base64 blob. Treat that as Basic rather than rejecting it — it is the same
  // secret either way, and the alternative is a callback that silently 401s.
  const authHeader = (() => {
    const value = String(rawAuthHeader).trim();
    if (!value || /^\s*basic\s+/i.test(value)) return value;
    const looksBase64 =
      value.length >= 4 && value.length % 4 === 0 && /^[A-Za-z0-9+/=]+$/.test(value);
    return looksBase64 ? `Basic ${value}` : value;
  })();

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
  const authResult = verifyDisconnectAuthorization(authHeader);
  if (authResult.ok) {
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

// ========================================
// Order history
// ========================================
// The /orders and /order-detail screens have been calling these since the
// post-purchase journey shipped; until now neither route existed, so both
// screens failed their fetch and fell through to their empty state.

/**
 * Orders are private, and an order id is derivable from a timestamp
 * (`MG-${Date.now()}`). Both routes therefore require the caller's Toss user
 * key and scope every query to it.
 */
function requireUserKey(req, res) {
  const userKey = req.headers['x-toss-user-key'];
  if (!userKey) {
    res.status(401).json({
      error: 'x-toss-user-key header is required.',
      requestId: req.requestId,
    });
    return null;
  }
  return String(userKey);
}

app.get('/v1/orders', async (req, res) => {
  const userKey = requireUserKey(req, res);
  if (!userKey) return;

  try {
    const orders = await listOrdersByUser(userKey);
    if (orders === null) {
      return res.status(503).json({ error: 'Database not configured.', requestId: req.requestId });
    }
    return res.json({ orders, requestId: req.requestId });
  } catch (error) {
    logEvent('error', 'order_list_failed', {
      requestId: req.requestId,
      ...formatError(error),
    });
    return res.status(500).json({ error: 'Failed to load orders.', requestId: req.requestId });
  }
});

app.get('/v1/orders/:orderId', async (req, res) => {
  const userKey = requireUserKey(req, res);
  if (!userKey) return;

  try {
    const order = await getOrderForUser(req.params.orderId, userKey);
    if (order === null) {
      // Same answer whether the order belongs to someone else or does not
      // exist, so this cannot be used to probe for other customers' orders.
      return res.status(404).json({ error: 'Order not found.', requestId: req.requestId });
    }
    return res.json(order);
  } catch (error) {
    logEvent('error', 'order_detail_failed', {
      requestId: req.requestId,
      ...formatError(error),
    });
    return res.status(500).json({ error: 'Failed to load order.', requestId: req.requestId });
  }
});

/**
 * Erase everything we hold that is keyed to a withdrawn user.
 *
 * What is actually user-keyed in this service:
 *   - orders.user_id               → deleted here (name, phone, email, address)
 *   - inquiries.user_id            → deleted here
 *   - inquiry_replies              → removed by ON DELETE CASCADE on inquiry_id
 *
 * Deliberately not touched, because none of it is linkable to a user id:
 *   - generation_jobs  — params carry no user id, and rows self-expire via expires_at
 *   - GCS objects      — keys are `${prefix}/${timestamp}-${random}`, no user in the path
 *
 * Still outside code's reach: the order PDF and print files mailed to
 * ORDER_EMAIL_TO stay in that mailbox. Erasing those is a mailbox retention
 * policy, not something this endpoint can do.
 *
 * Returns per-store counts so the caller can log what was actually destroyed.
 * Throws if a delete fails, so the handler can answer non-2xx instead of
 * claiming an erasure that did not happen.
 */
async function eraseUserData(userId) {
  const pool = getPool();
  if (!pool) {
    throw new Error('Database not configured - cannot erase user data.');
  }

  const ordersDeleted = await deleteOrdersByUser(userId);
  const inquiries = await pool.query('DELETE FROM inquiries WHERE user_id = $1', [userId]);

  return {
    ordersDeleted,
    inquiriesDeleted: inquiries.rowCount || 0,
  };
}

/**
 * Shared handler for the Apps in Toss withdrawal callback.
 *
 * Registered in the console under 유저정보 불러오기 → 콜백 정보. The console lets
 * the method be GET or POST, so both are wired to this.
 *
 * Erasure is idempotent: a repeat event for an already-erased user deletes zero
 * rows and still answers 200, so Toss retries cannot wedge.
 */
async function handleTossDisconnect(req, res, source) {
  const payload = source === 'query' ? req.query || {} : req.body || {};
  const { userId, eventType } = payload;

  logEvent('info', 'toss_user_disconnect', {
    userId,
    eventType,
    source,
    requestId: req.requestId,
  });

  // The console's connectivity test posts without a userId. That is not a
  // withdrawal event, so acknowledge it and erase nothing — answering 400 made
  // the console report the callback as broken.
  if (!userId) {
    logEvent('info', 'toss_user_disconnect_verification', {
      source,
      requestId: req.requestId,
    });
    return res.json({ success: true, verified: true, requestId: req.requestId });
  }

  try {
    const erased = await eraseUserData(userId);

    logEvent('info', 'toss_user_data_erased', {
      userId,
      eventType,
      source,
      ...erased,
      requestId: req.requestId,
    });

    return res.json({ success: true, erased, requestId: req.requestId });
  } catch (error) {
    // Answer non-2xx on purpose. Reporting success here would tell Toss the
    // erasure completed while the personal data is still sitting in the
    // database, so this needs to stay visibly failed and get retried.
    logEvent('error', 'toss_user_data_erase_failed', {
      userId,
      eventType,
      source,
      requestId: req.requestId,
      ...formatError(error),
    });

    return res.status(500).json({
      error: 'Failed to erase user data.',
      requestId: req.requestId,
    });
  }
}

// Toss Apps-in-Toss - User withdrawal callback (POST)
app.post('/v1/toss/disconnect', verifyTossCallbackAuth, express.json(), (req, res) =>
  handleTossDisconnect(req, res, 'body'),
);

// Toss Apps-in-Toss - User withdrawal callback (GET)
app.get('/v1/toss/disconnect', verifyTossCallbackAuth, (req, res) =>
  handleTossDisconnect(req, res, 'query'),
);

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

    const sessionEnvelope = createAitSessionEnvelope({
      sessionToken: crypto.randomUUID(),
      user: { id: String(userInfo.userKey), role: null, alias: null },
      identity: {
        userKey: String(userInfo.userKey),
        referrer: referrer || null,
        scope: userInfo.scope ?? null,
      },
      mode: 'live',
    });

    res.json({
      ...sessionEnvelope,
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

        // Persist before the email/PDF work below. This is the live checkout
        // path — /v1/orders/submit is not called by the app — and payment has
        // already succeeded here, so every stored row is a paid order.
        // Best-effort: the email is what gets the order fulfilled, so a
        // database problem must not fail a payment that already went through.
        try {
          const saved = await saveOrder({ order: orderData, userId: userKey || null });
          if (saved) {
            logEvent('info', 'order_persisted', {
              requestId: req.requestId,
              orderId: saved.order_id,
              hasUserId: Boolean(userKey),
            });
          } else {
            logEvent('warn', 'order_persist_skipped_no_db', {
              requestId: req.requestId,
              orderId: orderData.orderId || '',
            });
          }
        } catch (persistError) {
          logEvent('error', 'order_persist_failed', {
            requestId: req.requestId,
            orderId: orderData.orderId || '',
            ...formatError(persistError),
          });
        }

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
                  output_dir: ORDER_OUTPUT_DIR,
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

          const adminTo = process.env.ORDER_EMAIL_TO;
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
            const qcSummary = summarizeQcForOperator(pipelineResult);
            await mailer.sendMail({
              from: process.env.SMTP_FROM || process.env.SMTP_USER,
              to: adminTo,
              subject: `${qcSummary.subjectTag}🎽 결제 완료: ${orderData.orderId} - ${customerName}`,
              text: [
                `주문번호: ${orderData.orderId}`,
                `결제금액: ${data.success?.paidAmount}원`,
                `결제수단: ${data.success?.payMethod}`,
                '',
                qcSummary.body,
              ].join('\n'),
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
  await ensureDatabaseReady().catch(() => {});

  serverInstance = app.listen(PORT, () => {
    logEvent('info', 'server_config', {
      port: PORT,
      blobEnabled: isStorageEnabled(),
      imagePrefix: IMAGE_PREFIX,
      databaseEnabled: Boolean(process.env.DATABASE_URL),
      rateLimitStore: rateLimitStoreKind(),
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

/**
 * Bind a port only when run as a long-lived process. A serverless host imports
 * this module and invokes the exported app per request, where listening would
 * be wrong.
 */
if (require.main === module) {
  startServer();
}

module.exports = app;
