/** @jest-environment node */

const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const sharp = require('sharp');

const {
  applyMasterAlphaMask,
  binarizeAlphaChannel,
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

  test('binarizes semi-transparent edge alpha to avoid fringe band', async () => {
    const masterPath = path.join(tmpDir, 'master-edge.png');
    const generatedPath = path.join(tmpDir, 'generated-edge.png');
    const outputPath = path.join(tmpDir, 'output-edge.png');

    const masterRgba = Buffer.from([
      0, 0, 255, 255,
      0, 0, 255, 128,
    ]);
    await sharp(masterRgba, { raw: { width: 2, height: 1, channels: 4 } })
      .png()
      .toFile(masterPath);

    const generatedRgb = Buffer.from([
      0, 0, 255,
      127, 127, 255,
    ]);
    await sharp(generatedRgb, { raw: { width: 2, height: 1, channels: 3 } })
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

    const secondPixelBase = 1 * info.channels;
    const edgeR = data[secondPixelBase];
    const edgeG = data[secondPixelBase + 1];
    const edgeA = data[secondPixelBase + 3];

    expect(edgeA).toBe(0);
    expect(edgeR).toBe(0);
    expect(edgeG).toBe(0);
  });
});

describe('binarizeAlphaChannel', () => {
  let tmpDir;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'print-pipeline-binarize-'));
  });

  afterEach(async () => {
    if (tmpDir) {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });

  test('removes semi-transparent alpha band for qc pass criteria', async () => {
    const inputPath = path.join(tmpDir, 'input.png');
    const outputPath = path.join(tmpDir, 'output.png');

    const rgba = Buffer.from([
      10, 10, 10, 0,
      10, 10, 10, 128,
      10, 10, 10, 255,
    ]);
    await sharp(rgba, { raw: { width: 3, height: 1, channels: 4 } })
      .png()
      .toFile(inputPath);

    await binarizeAlphaChannel({
      inputPath,
      outputPath,
      threshold: 250,
    });

    const { data, info } = await sharp(outputPath)
      .raw()
      .toBuffer({ resolveWithObject: true });

    const alphaValues = [];
    for (let i = 0; i < info.width; i += 1) {
      alphaValues.push(data[i * info.channels + 3]);
    }

    expect(alphaValues).toEqual([0, 0, 255]);
  });
});
