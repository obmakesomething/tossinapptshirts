#!/usr/bin/env node
/**
 * Derive the white t-shirt's back mockup from the black one.
 *
 * There is no photograph of a white tee from behind. `tshirt_white_back.png`
 * shipped as a byte-for-byte copy of the black tee, so anyone designing the
 * back of a white shirt was shown the wrong garment entirely — and every copy
 * of that file, in every worktree and every revision in git history, is the
 * same black image, so there was nothing to restore.
 *
 * This produces a stand-in from the one photo the project does have:
 *
 *   1. Tone-map the dark fabric into the white shirt's measured range. The map
 *      preserves order, so a fold that was darker stays darker — inverting
 *      instead would flip the light direction and turn every shadow into a
 *      highlight (it also turns the neck label into a dark green smear).
 *   2. Reframe onto the white front's canvas, matching its torso width and
 *      shoulder line, so toggling front/back does not jump between two
 *      different crops.
 *
 * Replace the output with a real photograph when one exists. Re-run with:
 *   node scripts/deriveWhiteBackMockup.js
 */

const path = require('node:path');
const sharp = require('sharp');

const ROOT = path.join(__dirname, '..');
const SOURCE = path.join(ROOT, 'public/mockups/tshirt_black_front.png');
const TARGETS = [
  path.join(ROOT, 'public/mockups/tshirt_white_back.png'),
  path.join(ROOT, 'assets/mockups/tshirt_white_back.png'),
];

/** Measured off tshirt_white_front.png: the fabric sits at L 185-255, avg 242. */
const WHITE_FABRIC_LOW = 223;
const WHITE_FABRIC_HIGH = 255;
/** Measured off the black photo: 98% of the fabric sits below L 56. */
const BLACK_FABRIC_HIGH = 56;

/** Geometry of tshirt_white_front.png, so the two views frame alike. */
const CANVAS = { width: 1040, height: 1560 };
const FRONT = { torsoWidth: 571, centerX: 521.5, shoulderY: 289 };
/** Geometry of the black photo this is derived from. */
const SOURCE_GARMENT = { torsoWidth: 258, centerX: 210, shoulderY: 0 };

async function main() {
  const { data, info } = await sharp(SOURCE)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const pixels = info.width * info.height;
  const mapped = Buffer.alloc(pixels * 4);
  for (let i = 0; i < pixels; i += 1) {
    const o = i * info.channels;
    const luminance =
      0.2126 * data[o] + 0.7152 * data[o + 1] + 0.0722 * data[o + 2];
    const t = Math.min(1, luminance / BLACK_FABRIC_HIGH);
    const value = Math.round(
      WHITE_FABRIC_LOW + (WHITE_FABRIC_HIGH - WHITE_FABRIC_LOW) * t,
    );
    mapped[i * 4] = value;
    mapped[i * 4 + 1] = value;
    mapped[i * 4 + 2] = value;
    mapped[i * 4 + 3] = data[o + 3];
  }

  const scale = FRONT.torsoWidth / SOURCE_GARMENT.torsoWidth;
  const scaled = await sharp(mapped, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .resize(Math.round(info.width * scale), Math.round(info.height * scale))
    .png()
    .toBuffer();

  const left = Math.round(FRONT.centerX - SOURCE_GARMENT.centerX * scale);
  const top = Math.round(FRONT.shoulderY - SOURCE_GARMENT.shoulderY * scale);

  const output = await sharp({
    create: {
      width: CANVAS.width,
      height: CANVAS.height,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: scaled, left, top }])
    .png()
    .toBuffer();

  for (const target of TARGETS) {
    await sharp(output).toFile(target);
    console.log(`wrote ${path.relative(ROOT, target)}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
