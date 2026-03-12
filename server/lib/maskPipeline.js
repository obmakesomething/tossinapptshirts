const sharp = require('sharp');

async function applyMaskToAlphaPng({ inputBuffer, maskPngBuffer }) {
  if (!Buffer.isBuffer(inputBuffer) || !inputBuffer.length) {
    throw new Error('input_buffer_required');
  }
  if (!Buffer.isBuffer(maskPngBuffer) || !maskPngBuffer.length) {
    throw new Error('mask_png_buffer_required');
  }

  const source = await sharp(inputBuffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height } = source.info;

  const mask = await sharp(maskPngBuffer)
    .resize(width, height, { fit: 'fill' })
    .removeAlpha()
    .greyscale()
    .raw()
    .toBuffer();

  const output = Buffer.alloc(width * height * 4);
  for (let pixel = 0; pixel < width * height; pixel += 1) {
    const sourceOffset = pixel * 4;
    const outputOffset = pixel * 4;
    const maskAlpha = mask[pixel] ?? 0;
    output[outputOffset] = source.data[sourceOffset];
    output[outputOffset + 1] = source.data[sourceOffset + 1];
    output[outputOffset + 2] = source.data[sourceOffset + 2];
    output[outputOffset + 3] = Math.round(
      ((source.data[sourceOffset + 3] ?? 255) * maskAlpha) / 255,
    );
  }

  return sharp(output, {
    raw: {
      width,
      height,
      channels: 4,
    },
  })
    .png()
    .toBuffer();
}

module.exports = {
  applyMaskToAlphaPng,
};
