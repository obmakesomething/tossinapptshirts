#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

const outputPath = process.argv[2] || path.join(__dirname, 'test-order.pdf');

const sampleOrder = {
  orderId: 'TEST-' + Date.now(),
  createdAt: new Date().toISOString(),
  channel: 'Toss Miniapp',
  customer: {
    name: '홍길동',
    phone: '010-1234-5678',
    email: 'test@example.com',
  },
  shipping: {
    name: '홍길동',
    phone: '010-1234-5678',
    address1: '서울특별시 강남구 테헤란로 123',
    address2: '위워크 빌딩 5층',
    city: '서울',
    state: '',
    zip: '06234',
    country: 'KR',
    memo: '부재시 경비실에 맡겨주세요',
  },
  items: [
    {
      productName: '라운드 반팔 티셔츠',
      modelName: 'Basic Cotton Tee',
      color: '블랙',
      size: 'L',
      quantity: 2,
      print: {
        method: 'DTF',
        placement: 'front',
        sizeLabel: 'A4 (15~28cm)',
        sizeCm: '약 20cm × 25cm',
      },
      designUrl: null,
      mockupUrls: [],
    },
  ],
  pricing: {
    unitPrice: '15,000원',
    quantity: 2,
    shipping: '3,000원',
    total: '33,000원',
  },
};

async function buildTestPdf() {
  console.log('📄 PDF 생성 중...');
  console.log(`   주문번호: ${sampleOrder.orderId}`);
  console.log(`   출력 경로: ${outputPath}\n`);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 48 });
    const stream = fs.createWriteStream(outputPath);
    
    doc.pipe(stream);
    doc.on('error', reject);
    stream.on('finish', resolve);

    doc.fontSize(18).text('Order Summary', { align: 'left' });
    doc.moveDown(0.5);
    doc.fontSize(11).fillColor('#333');

    doc.text(`Order ID: ${sampleOrder.orderId}`);
    doc.text(`Created At: ${sampleOrder.createdAt}`);
    doc.text(`Channel: ${sampleOrder.channel}`);
    doc.moveDown();

    doc.fontSize(13).fillColor('#000').text('Customer');
    doc.fontSize(11).fillColor('#333');
    doc.text(`Name: ${sampleOrder.customer.name}`);
    doc.text(`Phone: ${sampleOrder.customer.phone}`);
    doc.text(`Email: ${sampleOrder.customer.email}`);
    doc.moveDown();

    doc.fontSize(13).fillColor('#000').text('Shipping');
    doc.fontSize(11).fillColor('#333');
    doc.text(`Recipient: ${sampleOrder.shipping.name}`);
    doc.text(`Phone: ${sampleOrder.shipping.phone}`);
    doc.text(`Address1: ${sampleOrder.shipping.address1}`);
    doc.text(`Address2: ${sampleOrder.shipping.address2}`);
    doc.text(`City: ${sampleOrder.shipping.city}`);
    doc.text(`Zip: ${sampleOrder.shipping.zip}`);
    doc.text(`Country: ${sampleOrder.shipping.country}`);
    doc.text(`Memo: ${sampleOrder.shipping.memo}`);
    doc.moveDown();

    doc.fontSize(13).fillColor('#000').text('Items');
    doc.fontSize(11).fillColor('#333');

    sampleOrder.items.forEach((item, index) => {
      doc.fontSize(12).fillColor('#000').text(`Item ${index + 1}`, { underline: true });
      doc.fontSize(10).fillColor('#333');
      doc.text(`- Product: ${item.productName}`);
      doc.text(`- Model: ${item.modelName}`);
      doc.text(`- Color: ${item.color}`);
      doc.text(`- Size: ${item.size}`);
      doc.text(`- Quantity: ${item.quantity}`);
      doc.text(`- Print Method: ${item.print.method}`);
      doc.text(`- Print Placement: ${item.print.placement}`);
      doc.text(`- Print Size: ${item.print.sizeLabel}`);
      doc.text(`- Print Dimension: ${item.print.sizeCm}`);
      doc.moveDown();
    });

    doc.fontSize(13).fillColor('#000').text('Pricing');
    doc.fontSize(11).fillColor('#333');
    doc.text(`Unit Price: ${sampleOrder.pricing.unitPrice}`);
    doc.text(`Quantity: ${sampleOrder.pricing.quantity}`);
    doc.text(`Shipping: ${sampleOrder.pricing.shipping}`);
    doc.text(`Total: ${sampleOrder.pricing.total}`);
    doc.moveDown();

    doc.fontSize(11).fillColor('#6B7280');
    doc.text('※ 출력 이미지에 대한 최종 판단은 주문자가 해요. 주문서 메일을 꼭 확인해 주세요.');

    doc.end();
  });
}

buildTestPdf()
  .then(() => {
    console.log('✅ PDF 생성 완료!');
    console.log(`\n📂 파일 열기: open "${outputPath}"`);
  })
  .catch((err) => {
    console.error('❌ PDF 생성 실패:', err.message);
    process.exit(1);
  });
