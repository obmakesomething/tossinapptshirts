import {
  DPI_GOOD,
  DPI_POOR,
  calculateEffectiveDpi,
  evaluatePrintResolution,
} from './printResolution';

// A4-ish front print, the standard option on a size-M tee.
const A4 = { printWidthCm: 21, printHeightCm: 29.7 };

describe('calculateEffectiveDpi', () => {
  it('derives DPI from pixels over print inches', () => {
    // 21cm ≈ 8.27in, so 300 DPI needs ≈ 2480px across.
    expect(
      calculateEffectiveDpi({ pixelWidth: 2480, pixelHeight: 3508, ...A4 }),
    ).toBe(300);
  });

  it('does not penalise artwork for not matching the print area shape', () => {
    // A landscape image inside a portrait print area is fitted to the width and
    // letterboxed, not stretched to the full height, so it keeps its 300 DPI.
    // Measuring it against the area's own height would call this 150.
    expect(
      calculateEffectiveDpi({ pixelWidth: 2480, pixelHeight: 1754, ...A4 }),
    ).toBe(300);
  });

  it('is limited by the artwork once it is scaled to fit', () => {
    // Half the pixels of the case above, printed at the same size.
    expect(
      calculateEffectiveDpi({ pixelWidth: 1240, pixelHeight: 877, ...A4 }),
    ).toBe(150);
  });

  it('returns null when any dimension is missing', () => {
    expect(calculateEffectiveDpi({ pixelWidth: 0, pixelHeight: 100, ...A4 })).toBeNull();
    expect(
      calculateEffectiveDpi({
        pixelWidth: 100,
        pixelHeight: 100,
        printWidthCm: 0,
        printHeightCm: 0,
      }),
    ).toBeNull();
  });
});

describe('evaluatePrintResolution', () => {
  it('passes artwork at or above the good threshold', () => {
    const result = evaluatePrintResolution({
      pixelWidth: 2480,
      pixelHeight: 3508,
      ...A4,
    });
    expect(result.level).toBe('good');
    expect(result.dpi).toBeGreaterThanOrEqual(DPI_GOOD);
    expect(result.description).toContain('2480×3508px');
  });

  it('keeps its own level between the poor and good thresholds', () => {
    const result = evaluatePrintResolution({
      pixelWidth: 1400,
      pixelHeight: 1980,
      ...A4,
    });
    expect(result.level).toBe('low');
    expect(result.dpi).toBeGreaterThanOrEqual(DPI_POOR);
    expect(result.dpi).toBeLessThan(DPI_GOOD);
  });

  it('still separates the poor band, even though the copy is gentle', () => {
    const result = evaluatePrintResolution({
      pixelWidth: 600,
      pixelHeight: 850,
      ...A4,
    });
    expect(result.level).toBe('poor');
    expect(result.dpi).toBeLessThan(DPI_POOR);
  });

  /**
   * Low-resolution work is upscaled by hand after the order, so this screen
   * exists to help someone pick a better photo — not to make them doubt the
   * purchase. These pin the tone: the DPI figure is always stated, because the
   * operator acts on that same number, and nothing predicts a bad outcome.
   */
  it('states the measured DPI at every level', () => {
    const cases: Array<[number, number]> = [[600, 850], [1400, 1980], [2480, 3508]];
    for (const [w, h] of cases) {
      const result = evaluatePrintResolution({ pixelWidth: w, pixelHeight: h, ...A4 });
      expect(`${result.title} ${result.description}`).toContain(String(result.dpi));
    }
  });

  it('never tells the customer their print will break', () => {
    const alarming = ['깨져', '실패', '불가', '못 해', '안 돼'];
    const cases: Array<[number, number]> = [[300, 420], [600, 850], [1400, 1980]];
    for (const [w, h] of cases) {
      const result = evaluatePrintResolution({ pixelWidth: w, pixelHeight: h, ...A4 });
      const copy = `${result.title} ${result.description}`;
      for (const word of alarming) expect(copy).not.toContain(word);
    }
  });

  it('reports unknown rather than guessing when size is unreadable', () => {
    const result = evaluatePrintResolution({
      pixelWidth: 0,
      pixelHeight: 0,
      ...A4,
    });
    expect(result.level).toBe('unknown');
    expect(result.dpi).toBeNull();
  });

  it('never returns a level that would block an order', () => {
    // Product decision: resolution only ever warns.
    for (const px of [10, 300, 800, 1500, 4000]) {
      const result = evaluatePrintResolution({
        pixelWidth: px,
        pixelHeight: px,
        ...A4,
      });
      expect(['good', 'low', 'poor']).toContain(result.level);
    }
  });
});

describe('preview and press agree on the printed size', () => {
  // The preview judges resolution against printSizeByCategory x the design
  // scale; the pipeline composes onto printSizeByCategory at 300 DPI and
  // measures the same way. Both have to land on the same DPI or the customer
  // is told one thing and shipped another.
  const CM_PER_INCH = 2.54;
  const PRESS_DPI = 300;

  function pressDpi({
    pixelWidth,
    pixelHeight,
    printWidthCm,
    printHeightCm,
    scale,
  }: {
    pixelWidth: number;
    pixelHeight: number;
    printWidthCm: number;
    printHeightCm: number;
    scale: number;
  }) {
    // What server/printPipeline.js does: lay the artwork out against the print
    // canvas in pixels, then compare source pixels to placed pixels.
    const canvasW = Math.round((printWidthCm / CM_PER_INCH) * PRESS_DPI);
    const canvasH = Math.round((printHeightCm / CM_PER_INCH) * PRESS_DPI);
    const aspect = pixelWidth / pixelHeight;
    const maxW = canvasW * scale;
    const maxH = canvasH * scale;
    const w = maxW / maxH > aspect ? maxH * aspect : maxW;
    const h = maxW / maxH > aspect ? maxH : maxW / aspect;
    return Math.round(PRESS_DPI * Math.min(pixelWidth / w, pixelHeight / h));
  }

  it.each([
    { pixelWidth: 2048, pixelHeight: 2048, scale: 1 },
    { pixelWidth: 2048, pixelHeight: 2048, scale: 0.5 },
    { pixelWidth: 1200, pixelHeight: 1600, scale: 0.7 },
    { pixelWidth: 900, pixelHeight: 600, scale: 0.9 },
  ])('matches the press for %o on a 28x36cm tee', (input) => {
    const preview = calculateEffectiveDpi({
      pixelWidth: input.pixelWidth,
      pixelHeight: input.pixelHeight,
      printWidthCm: 28 * input.scale,
      printHeightCm: 36 * input.scale,
    });
    const press = pressDpi({ ...input, printWidthCm: 28, printHeightCm: 36 });
    expect(Math.abs(preview! - press)).toBeLessThanOrEqual(1);
  });
});
