const sharp = require('sharp');

const { applyMaskToAlphaPng } = require('./maskPipeline');

describe('maskPipeline', () => {
  it('applies a grayscale mask as the output alpha channel', async () => {
    const input = await sharp(
      Buffer.from([
        255, 0, 0,
        0, 255, 0,
      ]),
      { raw: { width: 2, height: 1, channels: 3 } },
    )
      .png()
      .toBuffer();

    const mask = await sharp(Buffer.from([255, 0]), {
      raw: { width: 2, height: 1, channels: 1 },
    })
      .png()
      .toBuffer();

    const output = await applyMaskToAlphaPng({
      inputBuffer: input,
      maskPngBuffer: mask,
    });

    const { data, info } = await sharp(output).raw().toBuffer({
      resolveWithObject: true,
    });

    expect(info.channels).toBe(4);
    expect(Array.from(data.slice(0, 4))).toEqual([255, 0, 0, 255]);
    expect(Array.from(data.slice(4, 8))).toEqual([0, 255, 0, 0]);
  });

  it('resizes the mask to match the source image before compositing', async () => {
    const input = await sharp(
      Buffer.from([
        255, 0, 0,
        0, 255, 0,
        0, 0, 255,
        255, 255, 0,
      ]),
      { raw: { width: 2, height: 2, channels: 3 } },
    )
      .png()
      .toBuffer();

    const smallMask = await sharp(Buffer.from([255]), {
      raw: { width: 1, height: 1, channels: 1 },
    })
      .png()
      .toBuffer();

    const output = await applyMaskToAlphaPng({
      inputBuffer: input,
      maskPngBuffer: smallMask,
    });

    const metadata = await sharp(output).metadata();
    expect(metadata.width).toBe(2);
    expect(metadata.height).toBe(2);
    expect(metadata.channels).toBe(4);
  });
});
