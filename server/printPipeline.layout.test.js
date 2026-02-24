/** @jest-environment node */

const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const sharp = require('sharp');

const {
  buildTextLayerSvg,
  composeImageLayer,
  computeLayerPlacement,
} = require('./printPipeline');

describe('printPipeline layout helpers', () => {
  test('computeLayerPlacement follows editor transform math', () => {
    const placement = computeLayerPlacement({
      canvasWidth: 1000,
      canvasHeight: 500,
      transform: {
        offsetX: 0.1,
        offsetY: -0.2,
        scale: 0.5,
        rotation: 30,
      },
    });

    expect(placement).toMatchObject({
      width: 500,
      height: 250,
      centerX: 600,
      centerY: 150,
      left: 350,
      top: 25,
    });
  });

  test('buildTextLayerSvg uses center-based transform and escapes content', () => {
    const svg = buildTextLayerSvg({
      width: 1000,
      height: 500,
      textLayer: {
        text: 'A&B <C>',
        fontSize: 40,
        fontWeight: 'bold',
        color: '#111111',
      },
      textTransform: {
        offsetX: 0.1,
        offsetY: -0.2,
        scale: 0.5,
        rotation: 30,
      },
    });

    expect(svg).toContain('translate(600 150)');
    expect(svg).toContain('rotate(30)');
    expect(svg).toContain('scale(0.5)');
    expect(svg).toContain('A&amp;B &lt;C&gt;');
  });
});

describe('composeImageLayer', () => {
  let tmpDir;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'print-pipeline-layout-'));
  });

  afterEach(async () => {
    if (tmpDir) {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });

  test('places transformed image onto transparent target canvas', async () => {
    const sourcePath = path.join(tmpDir, 'source.png');
    const outputPath = path.join(tmpDir, 'output.png');

    await sharp({
      create: {
        width: 20,
        height: 20,
        channels: 4,
        background: { r: 255, g: 0, b: 0, alpha: 1 },
      },
    })
      .png()
      .toFile(sourcePath);

    await composeImageLayer({
      sourcePath,
      outputPath,
      targetWidth: 100,
      targetHeight: 100,
      imageTransform: {
        offsetX: 0.2,
        offsetY: 0,
        scale: 0.5,
        rotation: 0,
      },
    });

    const { data, info } = await sharp(outputPath)
      .raw()
      .toBuffer({ resolveWithObject: true });
    expect(info.width).toBe(100);
    expect(info.height).toBe(100);

    const at = (x, y) => {
      const i = (y * info.width + x) * info.channels;
      return [data[i], data[i + 1], data[i + 2], data[i + 3]];
    };

    expect(at(60, 50)).toEqual([255, 0, 0, 255]);
    expect(at(10, 50)[3]).toBe(0);
  });
});
