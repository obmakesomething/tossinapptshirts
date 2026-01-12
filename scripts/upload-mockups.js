#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
  endpoint: process.env.S3_ENDPOINT,
  forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
});

const BUCKET = process.env.S3_BUCKET;
const mockupsDir = path.join(__dirname, '../public/mockups');

async function uploadMockups() {
  const files = fs.readdirSync(mockupsDir);

  for (const file of files) {
    if (!file.endsWith('.jpg')) continue;

    const filePath = path.join(mockupsDir, file);
    const fileContent = fs.readFileSync(filePath);
    const key = `mockups/${file}`;

    console.log(`Uploading ${file} to s3://${BUCKET}/${key}...`);

    await s3Client.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: fileContent,
      ContentType: 'image/jpeg',
      ACL: 'public-read',
    }));

    console.log(`✅ Uploaded ${file}`);
  }

  console.log('\n✅ All mockup images uploaded successfully!');
  console.log(`\nImages are available at:`);
  files.forEach(file => {
    if (file.endsWith('.jpg')) {
      console.log(`  ${process.env.S3_PUBLIC_BASE_URL}/mockups/${file}`);
    }
  });
}

uploadMockups().catch(err => {
  console.error('Upload failed:', err);
  process.exit(1);
});
