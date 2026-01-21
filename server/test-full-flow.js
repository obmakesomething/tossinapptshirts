#!/usr/bin/env node
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const sharp = require('sharp');
const PDFDocument = require('pdfkit');
const OpenAI = require('openai');
const nodemailer = require('nodemailer');

const dotenvPath = path.join(__dirname, '..', '.env');
try { require('dotenv').config({ path: dotenvPath }); } catch {}

const OUTPUT_DIR = path.join(__dirname, 'test-output');

async function ensureDir(dir) {
  await fsp.mkdir(dir, { recursive: true });
}

async function generateImage(prompt) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY 환경변수가 필요해요.');

  console.log('🎨 이미지 생성 중...');
  console.log(`   프롬프트: "${prompt}"`);

  const client = new OpenAI({ apiKey });
  const enhancedPrompt = `${prompt}, on a plain white background, t-shirt print design`;

  const response = await client.images.generate({
    model: 'gpt-image-1',
    prompt: enhancedPrompt,
    size: '1024x1024',
    n: 1,
  });

  const item = response.data[0];
  let buffer;

  if (item.b64_json) {
    buffer = Buffer.from(item.b64_json, 'base64');
  } else if (item.url) {
    const res = await fetch(item.url);
    buffer = Buffer.from(await res.arrayBuffer());
  }

  if (!buffer) throw new Error('이미지 생성 실패');

  const rawPath = path.join(OUTPUT_DIR, 'design-raw.png');
  await fsp.writeFile(rawPath, buffer);
  console.log(`✅ 이미지 생성 완료: 1024x1024`);
  return rawPath;
}

async function addTextLayer(imagePath, text, options = {}) {
  console.log('✏️ 텍스트 레이어 합성 중...');
  console.log(`   텍스트: "${text}"`);

  const { fontSize = 48, color = '#FFFFFF', position = 'bottom' } = options;

  const image = sharp(imagePath);
  const metadata = await image.metadata();
  const { width, height } = metadata;

  const textY = position === 'top' ? 80 : height - 100;

  const svgText = `
    <svg width="${width}" height="${height}">
      <style>
        .title { fill: ${color}; font-size: ${fontSize}px; font-weight: bold; font-family: Arial, sans-serif; text-anchor: middle; }
        .shadow { fill: rgba(0,0,0,0.5); font-size: ${fontSize}px; font-weight: bold; font-family: Arial, sans-serif; text-anchor: middle; }
      </style>
      <text x="${width / 2 + 2}" y="${textY + 2}" class="shadow">${text}</text>
      <text x="${width / 2}" y="${textY}" class="title">${text}</text>
    </svg>
  `;

  const outputPath = path.join(OUTPUT_DIR, 'design-with-text.png');
  await image.composite([{ input: Buffer.from(svgText), top: 0, left: 0 }]).png().toFile(outputPath);

  console.log(`✅ 텍스트 합성 완료`);
  return outputPath;
}

async function upscaleWithClipdrop(imagePath, targetWidth = 4096, targetHeight = 4096) {
  const apiKey = process.env.CLIPDROP_API_KEY;
  if (!apiKey) {
    console.log('⚠️ CLIPDROP_API_KEY 없음, 업스케일 건너뜀');
    return imagePath;
  }

  console.log('🔬 Clipdrop 업스케일 중...');
  console.log(`   목표: ${targetWidth}x${targetHeight}`);

  const fileBuffer = await fsp.readFile(imagePath);
  const form = new FormData();
  form.append('image_file', new Blob([fileBuffer]), path.basename(imagePath));
  form.append('target_width', String(targetWidth));
  form.append('target_height', String(targetHeight));

  const response = await fetch('https://clipdrop-api.co/image-upscaling/v1/upscale', {
    method: 'POST',
    headers: { 'x-api-key': apiKey },
    body: form,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Clipdrop 업스케일 실패: ${text}`);
  }

  const rawBuffer = Buffer.from(await response.arrayBuffer());
  const outputPath = path.join(OUTPUT_DIR, 'design-upscaled.png');
  
  // Clipdrop may return webp, convert to PNG
  await sharp(rawBuffer).png().toFile(outputPath);

  const meta = await sharp(outputPath).metadata();
  console.log(`✅ 업스케일 완료: ${meta.width}x${meta.height}`);
  return outputPath;
}

async function buildPdfWithImages(designPath, order) {
  console.log('📄 PDF 생성 중...');

  const pdfPath = path.join(OUTPUT_DIR, 'order-complete.pdf');

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 48 });
    const stream = fs.createWriteStream(pdfPath);
    doc.pipe(stream);
    doc.on('error', reject);
    stream.on('finish', () => resolve(pdfPath));

    doc.fontSize(18).text('Order Summary', { align: 'left' });
    doc.moveDown(0.5);
    doc.fontSize(11).fillColor('#333');
    doc.text(`Order ID: ${order.orderId}`);
    doc.text(`Created At: ${order.createdAt}`);
    doc.moveDown();

    doc.fontSize(13).fillColor('#000').text('Customer');
    doc.fontSize(11).fillColor('#333');
    doc.text(`Name: ${order.customer.name}`);
    doc.text(`Phone: ${order.customer.phone}`);
    doc.text(`Email: ${order.customer.email}`);
    doc.moveDown();

    doc.fontSize(13).fillColor('#000').text('Shipping');
    doc.fontSize(11).fillColor('#333');
    doc.text(`Address: ${order.shipping.address1} ${order.shipping.address2}`);
    doc.text(`Memo: ${order.shipping.memo}`);
    doc.moveDown();

    doc.fontSize(13).fillColor('#000').text('Items');
    const item = order.items[0];
    doc.fontSize(12).fillColor('#000').text('Item 1', { underline: true });
    doc.fontSize(10).fillColor('#333');
    doc.text(`- Product: ${item.productName}`);
    doc.text(`- Color: ${item.color}`);
    doc.text(`- Size: ${item.size}`);
    doc.text(`- Quantity: ${item.quantity}`);
    doc.text(`- Text: "${item.text.text}"`);
    doc.moveDown();

    doc.fontSize(11).fillColor('#1E40AF').text('Design Image (업스케일됨):');
    doc.moveDown(0.3);
    if (fs.existsSync(designPath)) {
      doc.image(designPath, { fit: [300, 300], align: 'left' });
    }
    doc.moveDown();

    doc.fontSize(13).fillColor('#000').text('Pricing');
    doc.fontSize(11).fillColor('#333');
    doc.text(`Unit Price: ${order.pricing.unitPrice}`);
    doc.text(`Quantity: ${order.pricing.quantity}`);
    doc.text(`Total: ${order.pricing.total}`);
    doc.moveDown();

    doc.fontSize(11).fillColor('#6B7280');
    doc.text('※ 출력 이미지에 대한 최종 판단은 주문자가 해요. 주문서 메일을 꼭 확인해 주세요.');

    doc.end();
  });
}

async function sendEmailWithAttachments(recipient, pdfPath, pngPath, order) {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!user || !pass) {
    console.log('⚠️ SMTP 설정 없음, 이메일 건너뜀');
    return;
  }

  console.log('📧 이메일 발송 중...');
  console.log(`   수신자: ${recipient}`);

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT || 465),
    secure: String(process.env.SMTP_SECURE || 'true') === 'true',
    auth: { user, pass },
  });

  const emailBody = `안녕하세요,

테스트 주문이 접수됐어요.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📦 주문 정보
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
주문번호: ${order.orderId}
주문일시: ${order.createdAt}
주문자: ${order.customer.name}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🛍️ 주문 상품
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${order.items[0].productName} - ${order.items[0].color} / ${order.items[0].size} / ${order.items[0].quantity}개
텍스트: "${order.items[0].text.text}"

총 금액: ${order.pricing.total}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📎 첨부 파일
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- 주문서 PDF
- 인쇄용 PNG (업스케일 완료)

감사합니다.`;

  const attachments = [
    { filename: `order-${order.orderId}.pdf`, path: pdfPath },
    { filename: `print-ready-${order.orderId}.png`, path: pngPath },
  ];

  await transporter.sendMail({
    from: process.env.SMTP_FROM || user,
    to: recipient,
    subject: `🎽 [테스트] 새 주문: ${order.orderId}`,
    text: emailBody,
    attachments,
  });

  console.log('✅ 이메일 발송 완료!');
}

async function main() {
  const prompt = process.argv[2] || 'cute cat illustration';
  const text = process.argv[3] || 'HELLO WORLD';
  const recipient = process.argv[4] || '98dy@naver.com';

  console.log('═══════════════════════════════════════════');
  console.log('🚀 전체 플로우 테스트 (업스케일 + 이메일)');
  console.log('═══════════════════════════════════════════\n');

  await ensureDir(OUTPUT_DIR);

  const designRaw = await generateImage(prompt);
  console.log('');

  const designWithText = await addTextLayer(designRaw, text, {
    fontSize: 64,
    color: '#FF4444',
    position: 'bottom',
  });
  console.log('');

  const designUpscaled = await upscaleWithClipdrop(designWithText, 4096, 4096);
  console.log('');

  const order = {
    orderId: 'TEST-' + Date.now(),
    createdAt: new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }),
    customer: { name: '홍길동', phone: '010-1234-5678', email: 'test@example.com' },
    shipping: { address1: '서울특별시 강남구 테헤란로 123', address2: '위워크 5층', memo: '부재시 경비실' },
    items: [{ productName: '라운드 반팔 티셔츠', color: '블랙', size: 'L', quantity: 2, text: { text } }],
    pricing: { unitPrice: '15,000원', quantity: 2, total: '30,000원' },
  };

  const pdfPath = await buildPdfWithImages(designUpscaled, order);
  console.log(`✅ PDF 생성 완료`);
  console.log('');

  await sendEmailWithAttachments(recipient, pdfPath, designUpscaled, order);

  console.log('\n═══════════════════════════════════════════');
  console.log('🎉 전체 플로우 완료!');
  console.log('═══════════════════════════════════════════');
  console.log(`\n📂 결과물:`);
  console.log(`   - 원본: ${designRaw}`);
  console.log(`   - 텍스트 합성: ${designWithText}`);
  console.log(`   - 업스케일: ${designUpscaled}`);
  console.log(`   - PDF: ${pdfPath}`);
  console.log(`\n📬 ${recipient} 메일함을 확인해 주세요!`);
}

main().catch((err) => {
  console.error('❌ 오류:', err.message);
  process.exit(1);
});
