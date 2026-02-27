/** @jest-environment node */

const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const sharp = require('sharp');

const {
  applyMasterAlphaMask,
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

describe('applyMasterAlphaMask', () => {
  let tmpDir;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'print-pipeline-alpha-'));
  });

  afterEach(async () => {
    if (tmpDir) {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });

  test('restores transparent background from master image alpha', async () => {
    const masterPath = path.join(tmpDir, 'master.png');
    const generatedPath = path.join(tmpDir, 'generated.png');
    const outputPath = path.join(tmpDir, 'output.png');

    const masterSvg = `<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="100" height="100" fill="none" />
      <circle cx="50" cy="50" r="30" fill="#ff0000" />
    </svg>`;

    await sharp(Buffer.from(masterSvg)).png().toFile(masterPath);

    await sharp({
      create: {
        width: 200,
        height: 200,
        channels: 3,
        background: { r: 255, g: 255, b: 255 },
      },
    })
      .png()
      .toFile(generatedPath);

    await applyMasterAlphaMask({
      generatedPath,
      masterPath,
      outputPath,
    });

    const { data, info } = await sharp(outputPath)
      .raw()
      .toBuffer({ resolveWithObject: true });

    expect(info.channels).toBe(4);

    const alphaAt = (x, y) => {
      const i = (y * info.width + x) * info.channels;
      return data[i + 3];
    };

    expect(alphaAt(5, 5)).toBe(0);
    expect(alphaAt(100, 100)).toBeGreaterThan(200);
  });
});
