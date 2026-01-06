const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const PDFDocument = require('pdfkit');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

const app = express();
app.use(cors({ origin: true }));
app.use(express.json({ limit: '15mb' }));

const PORT = process.env.PORT || 3000;
const IMAGE_BUCKET = process.env.S3_BUCKET || '';
const IMAGE_BASE_URL = process.env.S3_PUBLIC_BASE_URL || '';
const IMAGE_PREFIX = process.env.S3_IMAGE_PREFIX || 'uploads';
const PDF_PREFIX = process.env.S3_PDF_PREFIX || 'orders';
const IMAGEN_MODEL = process.env.IMAGEN_MODEL || 'imagen-4.0-generate-001';
const IMAGEN_API_VERSION = process.env.IMAGEN_API_VERSION || 'v1beta';

let s3Client;
function getS3Client() {
  if (s3Client) return s3Client;
  if (!process.env.AWS_REGION || !process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    return null;
  }
  s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });
  return s3Client;
}

function buildPublicUrl(key) {
  if (!IMAGE_BASE_URL) return '';
  return `${IMAGE_BASE_URL.replace(/\/$/, '')}/${key}`;
}

async function uploadToS3({ key, body, contentType }) {
  const client = getS3Client();
  if (!client || !IMAGE_BUCKET || !IMAGE_BASE_URL) {
    throw new Error('S3 configuration is missing.');
  }
  await client.send(
    new PutObjectCommand({
      Bucket: IMAGE_BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );
  return buildPublicUrl(key);
}

async function getGenAI() {
  const { GoogleGenAI } = await import('@google/genai');
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is required for Imagen.');
  }
  return new GoogleGenAI({ apiKey, apiVersion: IMAGEN_API_VERSION });
}

function decodeDataUrl(dataUrl) {
  const match = dataUrl.match(/^data:(.+);base64,(.*)$/);
  if (!match) return null;
  return { mimeType: match[1], buffer: Buffer.from(match[2], 'base64') };
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
      if (Array.isArray(item.mockupUrls) && item.mockupUrls.length > 0) {
        doc.text(`- Mockups: ${item.mockupUrls.join(', ')}`);
      }
      doc.moveDown(0.5);
    });

    doc.moveDown();
    doc.fontSize(13).text('Pricing');
    doc.fontSize(11);
    if (order.pricing) {
      doc.text(`Product Subtotal: ${order.pricing.productSubtotal || ''}`);
      doc.text(`Print Subtotal: ${order.pricing.printSubtotal || ''}`);
      doc.text(`Shipping: ${order.pricing.shipping || ''}`);
      doc.text(`Total: ${order.pricing.total || ''}`);
    }

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
  res.json({ ok: true });
});

app.post('/v1/images/upload', async (req, res) => {
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

    const key = `${IMAGE_PREFIX}/${Date.now()}-${Math.random().toString(36).slice(2)}-${filename || 'upload'}.jpg`;
    const url = await uploadToS3({ key, body: buffer, contentType: mimeType });
    res.json({ url });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Upload failed.' });
  }
});

app.post('/v1/images/generate', async (req, res) => {
  try {
    const { prompt, numberOfImages = 4, aspectRatio = '1:1', imageSize = '1K', personGeneration = 'allow_adult' } =
      req.body || {};
    if (!prompt) return res.status(400).json({ error: 'Prompt is required.' });

    const ai = await getGenAI();
    const response = await ai.models.generateImages({
      model: IMAGEN_MODEL,
      prompt,
      config: {
        numberOfImages,
        aspectRatio,
        imageSize,
        personGeneration,
      },
    });

    const generated = response.generatedImages || [];
    const results = [];
    for (const item of generated) {
      const imageBytes = item.image?.imageBytes;
      const mimeType = item.image?.mimeType || 'image/png';
      if (!imageBytes) continue;
      const buffer = Buffer.from(imageBytes, 'base64');
      const key = `${IMAGE_PREFIX}/imagen-${Date.now()}-${Math.random().toString(36).slice(2)}.png`;
      const url = await uploadToS3({ key, body: buffer, contentType: mimeType });
      results.push({ url, mimeType });
    }

    res.json({ images: results });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Imagen failed.' });
  }
});

app.post('/v1/orders/submit', async (req, res) => {
  try {
    const order = req.body || {};
    const mailer = getMailer();
    if (!mailer) {
      return res.status(500).json({ error: 'SMTP configuration is missing.' });
    }

    const pdfBuffer = await buildOrderPdf(order);
    const pdfName = `order-${order.orderId || Date.now()}.pdf`;

    let pdfUrl = '';
    if (order.storePdf) {
      const key = `${PDF_PREFIX}/${pdfName}`;
      pdfUrl = await uploadToS3({ key, body: pdfBuffer, contentType: 'application/pdf' });
    }

    const to = process.env.ORDER_EMAIL_TO;
    if (!to) return res.status(500).json({ error: 'ORDER_EMAIL_TO is required.' });

    await mailer.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      subject: `Order ${order.orderId || ''} - ${order.customer?.name || ''}`,
      text: `New order submitted.\nPDF attached.\n${pdfUrl ? `PDF URL: ${pdfUrl}` : ''}`,
      attachments: [
        {
          filename: pdfName,
          content: pdfBuffer,
        },
      ],
    });

    res.json({ ok: true, pdfUrl });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Order submit failed.' });
  }
});

app.listen(PORT, () => {
  console.log(`server listening on ${PORT}`);
});
