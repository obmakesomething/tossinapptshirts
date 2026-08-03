const { runPrintPipeline, runQc, effectiveDpi, artworkDpi } = require('./printPipeline');

/** Build a raw RGBA buffer of a solid colour, optionally fully opaque. */
function rgba(width, height, { alpha = 255 } = {}) {
  const data = Buffer.alloc(width * height * 4);
  for (let i = 0; i < width * height; i += 1) {
    data[i * 4] = 10;
    data[i * 4 + 1] = 20;
    data[i * 4 + 2] = 30;
    data[i * 4 + 3] = alpha;
  }
  return { data, info: { width, height, channels: 4 } };
}

/** Half transparent, half opaque — a normal cut-out design. */
function cutout(width, height) {
  const data = Buffer.alloc(width * height * 4);
  for (let i = 0; i < width * height; i += 1) {
    const opaque = i % 2 === 0;
    data[i * 4] = 10;
    data[i * 4 + 1] = 20;
    data[i * 4 + 2] = 30;
    data[i * 4 + 3] = opaque ? 255 : 0;
  }
  return { data, info: { width, height, channels: 4 } };
}

describe('effectiveDpi', () => {
  it('scales the 300 DPI reference by how far short of target the artwork is', () => {
    expect(
      effectiveDpi({ width: 3200, height: 3200, targetWidth: 3200, targetHeight: 3200 }),
    ).toBe(300);
    expect(
      effectiveDpi({ width: 1600, height: 1600, targetWidth: 3200, targetHeight: 3200 }),
    ).toBe(150);
  });

  it('returns null without a target to compare against', () => {
    expect(effectiveDpi({ width: 100, height: 100, targetWidth: 0, targetHeight: 0 })).toBeNull();
  });
});

describe('runQc', () => {
  const target = { targetWidth: 1000, targetHeight: 1000 };

  it('passes a full-resolution cut-out with no warnings', () => {
    const { data, info } = cutout(1000, 1000);
    const qc = runQc({ data, info, ...target });
    expect(qc.status).toBe('PASS');
    expect(qc.reasons).toEqual([]);
    expect(qc.metrics.effective_dpi).toBe(300);
  });

  it('warns on low resolution but never fails', () => {
    const { data, info } = cutout(400, 400);
    const qc = runQc({ data, info, ...target });
    // Resolution is a warning only — the customer decides whether to proceed.
    expect(qc.status).toBe('WARN');
    expect(qc.reasons).toContain('resolution_poor');
    expect(qc.recommendations.join(' ')).toContain('깨져');
  });

  it('separates merely-soft from broken-up resolution', () => {
    const { data, info } = cutout(600, 600); // 180 DPI
    const qc = runQc({ data, info, ...target });
    expect(qc.reasons).toContain('resolution_low');
    expect(qc.reasons).not.toContain('resolution_poor');
  });

  it('notes a missing transparent background instead of rejecting it', () => {
    // Valid now that background removal is gone: the photo's own background prints.
    const { data, info } = rgba(1000, 1000, { alpha: 255 });
    const qc = runQc({ data, info, ...target });
    expect(qc.status).toBe('WARN');
    expect(qc.reasons).toContain('no_transparency');
    expect(qc.recommendations.join(' ')).toContain('투명 배경 PNG');
  });

  it('never reports FAIL, so QC cannot block an order on its own', () => {
    for (const size of [50, 200, 1000, 2000]) {
      for (const build of [cutout, rgba]) {
        const { data, info } = build(size, size);
        expect(runQc({ data, info, ...target }).status).not.toBe('FAIL');
      }
    }
  });

  it('reports the measured dimensions alongside the target', () => {
    const { data, info } = cutout(512, 512);
    const qc = runQc({ data, info, ...target });
    expect(qc.metrics.width).toBe(512);
    expect(qc.metrics.target_width).toBe(1000);
  });
});

describe('artworkDpi', () => {
  // The output raster is always the print area at 300 DPI, so resolution has
  // to be judged on the customer's file at the size they scaled it to.
  const canvas = { targetWidth: 3000, targetHeight: 3000 };

  it('is 300 DPI when the artwork exactly fills the print area', () => {
    expect(
      artworkDpi({
        ...canvas,
        sourceWidth: 3000,
        sourceHeight: 3000,
        imageTransform: { offsetX: 0, offsetY: 0, scale: 1, rotation: 0 },
      }),
    ).toBe(300);
  });

  it('falls as the customer enlarges a small photo', () => {
    expect(
      artworkDpi({
        ...canvas,
        sourceWidth: 1500,
        sourceHeight: 1500,
        imageTransform: { scale: 1 },
      }),
    ).toBe(150);
  });

  it('rises again when the same photo is printed smaller', () => {
    // Half the print area means half the pixels needed for the same DPI.
    expect(
      artworkDpi({
        ...canvas,
        sourceWidth: 1500,
        sourceHeight: 1500,
        imageTransform: { scale: 0.5 },
      }),
    ).toBe(300);
  });

  it('returns null without a print size to measure against', () => {
    expect(
      artworkDpi({
        sourceWidth: 1000,
        sourceHeight: 1000,
        targetWidth: 0,
        targetHeight: 0,
      }),
    ).toBeNull();
  });
});

describe('runPrintPipeline composition', () => {
  const sharp = require('sharp');
  const os = require('os');
  const fsp = require('fs/promises');
  const path = require('path');

  let workRoot;

  beforeAll(async () => {
    workRoot = await fsp.mkdtemp(path.join(os.tmpdir(), 'print-pipeline-test-'));
  });

  afterAll(async () => {
    await fsp.rm(workRoot, { recursive: true, force: true });
  });

  /** A solid red square on a transparent background. */
  async function writeMaster(name, size) {
    const file = path.join(workRoot, name);
    await sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: { r: 255, g: 0, b: 0, alpha: 1 },
      },
    })
      .png()
      .toFile(file);
    return file;
  }

  /** Alpha of one pixel of the produced print file. */
  async function alphaAt(file, x, y) {
    const { data, info } = await sharp(file)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    return data[(y * info.width + x) * info.channels + 3];
  }

  it('renders the print file at the print area size, not the upload size', async () => {
    const master = await writeMaster('master-a.png', 400);
    const result = await runPrintPipeline({
      master_png_path: master,
      order_id: 'test-canvas',
      target_width_px: 1000,
      target_height_px: 1200,
      output_dir: workRoot,
      image_transform: { offsetX: 0, offsetY: 0, scale: 1, rotation: 0 },
    });
    expect(result.ok).toBe(true);
    const meta = await sharp(result.output_path).metadata();
    expect(meta.width).toBe(1000);
    expect(meta.height).toBe(1200);
  });

  it('puts the artwork where the customer put it', async () => {
    const master = await writeMaster('master-b.png', 400);
    const result = await runPrintPipeline({
      master_png_path: master,
      order_id: 'test-offset',
      target_width_px: 1000,
      target_height_px: 1000,
      output_dir: workRoot,
      // Quarter-size, pushed to the upper-left quadrant.
      image_transform: { offsetX: -0.25, offsetY: -0.25, scale: 0.25, rotation: 0 },
    });
    expect(result.ok).toBe(true);
    // Centre of the placed design: 1000/2 - 0.25*1000 = 250.
    expect(await alphaAt(result.output_path, 250, 250)).toBe(255);
    // The opposite quadrant has to stay empty, or the transform was ignored.
    expect(await alphaAt(result.output_path, 750, 750)).toBe(0);
  });

  it('crops artwork dragged past the print boundary and says so', async () => {
    const master = await writeMaster('master-c.png', 400);
    const result = await runPrintPipeline({
      master_png_path: master,
      order_id: 'test-clip',
      target_width_px: 1000,
      target_height_px: 1000,
      output_dir: workRoot,
      image_transform: { offsetX: 0.6, offsetY: 0, scale: 1, rotation: 0 },
    });
    expect(result.ok).toBe(true);
    expect(result.qc.reasons).toContain('artwork_clipped');
    const meta = await sharp(result.output_path).metadata();
    expect(meta.width).toBe(1000);
  });

  it('flags artwork that ended up entirely outside the print area', async () => {
    const master = await writeMaster('master-d.png', 400);
    const result = await runPrintPipeline({
      master_png_path: master,
      order_id: 'test-outside',
      target_width_px: 1000,
      target_height_px: 1000,
      output_dir: workRoot,
      image_transform: { offsetX: 3, offsetY: 0, scale: 0.2, rotation: 0 },
    });
    expect(result.ok).toBe(true);
    expect(result.qc.reasons).toContain('artwork_outside_print_area');
  });

  it('reports resolution against the size the design is printed at', async () => {
    const master = await writeMaster('master-e.png', 500);
    const result = await runPrintPipeline({
      master_png_path: master,
      order_id: 'test-dpi',
      target_width_px: 1000,
      target_height_px: 1000,
      output_dir: workRoot,
      image_transform: { scale: 1 },
    });
    // 500px stretched across a canvas that is 1000px at 300 DPI. 150 sits on
    // the boundary, so it warns rather than calling the artwork broken.
    expect(result.qc.metrics.effective_dpi).toBe(150);
    expect(result.qc.reasons).toContain('resolution_low');
  });

  it('leaves resolution unflagged when the design is printed small enough', async () => {
    const master = await writeMaster('master-f.png', 500);
    const result = await runPrintPipeline({
      master_png_path: master,
      order_id: 'test-dpi-ok',
      target_width_px: 1000,
      target_height_px: 1000,
      output_dir: workRoot,
      // The same file at half the print size is twice the DPI.
      image_transform: { scale: 0.5 },
    });
    expect(result.qc.metrics.effective_dpi).toBe(300);
    expect(result.qc.reasons).not.toContain('resolution_low');
    expect(result.qc.reasons).not.toContain('resolution_poor');
  });
});
