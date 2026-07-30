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

  it('is limited by the most stretched axis, not the roomiest', () => {
    // Wide enough for 300 DPI but only half the height it needs.
    const dpi = calculateEffectiveDpi({
      pixelWidth: 2480,
      pixelHeight: 1754,
      ...A4,
    });
    expect(dpi).toBe(150);
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

  it('warns without blocking between the poor and good thresholds', () => {
    const result = evaluatePrintResolution({
      pixelWidth: 1400,
      pixelHeight: 1980,
      ...A4,
    });
    expect(result.level).toBe('low');
    expect(result.dpi).toBeGreaterThanOrEqual(DPI_POOR);
    expect(result.dpi).toBeLessThan(DPI_GOOD);
    // The customer is told they may still proceed.
    expect(result.description).toContain('그대로 진행해도');
  });

  it('flags artwork below the poor threshold as likely to break up', () => {
    const result = evaluatePrintResolution({
      pixelWidth: 600,
      pixelHeight: 850,
      ...A4,
    });
    expect(result.level).toBe('poor');
    expect(result.dpi).toBeLessThan(DPI_POOR);
    expect(result.title).toContain('깨져');
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
