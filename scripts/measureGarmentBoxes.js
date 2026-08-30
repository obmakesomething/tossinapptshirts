/**
 * Measures where the garment actually sits inside each mockup photograph.
 *
 * The photographs were shot and cropped separately, so they disagree: the
 * white tee is 1040x1560 with the shirt filling 63% of the height, the black
 * one is 421x457 filling all of it, the hoodie 400x400 filling 74% of the
 * width. Rendered as-is the garment changes size whenever the customer
 * switches colour, and the default — the white tee — is the smallest of them.
 *
 * Run: node scripts/measureGarmentBoxes.js
 * Paste the output into garmentBoxByMockup in src/data/mockupTemplates.ts.
 */
const sharp = require('sharp');
const path = require('path');
const https = require('https');

const BASE = 'https://merchandisegpt-api.vercel.app/mockups';
const FILES = [
  'tshirt_white_front.png',
  'tshirt_white_back.png',
  'tshirt_black_front.png',
  'tshirt_black_back.png',
  'hoodie_black_front.png',
  'hoodie_grey_front.png',
  'sweatshirt_black_front.png',
  'sweatshirt_grey_front.png',
];

/** How far a pixel must differ from the corner colour to count as garment. */
const BACKGROUND_TOLERANCE = 12;

function download(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        if (res.statusCode !== 200) {
          reject(new Error(`${res.statusCode} for ${url}`));
          return;
        }
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => resolve(Buffer.concat(chunks)));
      })
      .on('error', reject);
  });
}

async function measure(buffer) {
  const { data, info } = await sharp(buffer)
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  // The corner is background by construction in every one of these shots.
  const background = data[0];

  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (Math.abs(data[y * width + x] - background) > BACKGROUND_TOLERANCE) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (minX > maxX || minY > maxY) return null;

  const round = (n) => Number(n.toFixed(4));
  return {
    x: round(minX / width),
    y: round(minY / height),
    width: round((maxX - minX + 1) / width),
    height: round((maxY - minY + 1) / height),
  };
}

(async () => {
  const rows = [];
  for (const file of FILES) {
    try {
      const box = await measure(await download(`${BASE}/${file}`));
      if (!box) {
        console.error(`  ${file}: no garment found`);
        continue;
      }
      rows.push([file, box]);
    } catch (error) {
      console.error(`  ${file}: ${error.message}`);
    }
  }
  console.log('export const garmentBoxByMockup: Record<string, GarmentBox> = {');
  for (const [file, b] of rows) {
    console.log(
      `  '${file}': { x: ${b.x}, y: ${b.y}, width: ${b.width}, height: ${b.height} },`,
    );
  }
  console.log('};');
})();
