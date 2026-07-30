const { runQc, effectiveDpi } = require('./printPipeline');

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
