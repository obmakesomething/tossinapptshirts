import {
  MAX_SCALE,
  ROTATION_SNAP_THRESHOLD,
  clampPlacement,
  clampScale,
  maxOffsetForScale,
  snapRotation,
} from './designBounds';

/**
 * offset is a fraction of the print area and scale is the artwork's size as a
 * fraction of it, so the artwork spans offset ± scale/2. Anything outside ±0.5
 * is off the printable region — the press trims it and the customer finds out
 * when the parcel arrives.
 */
function edges({ offsetX, scale }: { offsetX: number; scale: number }) {
  return [offsetX - scale / 2, offsetX + scale / 2];
}

describe('the design cannot leave the area it prints on', () => {
  it.each([0.1, 0.3, 0.5, 0.7, 0.9, 1])(
    'keeps both edges inside at scale %p',
    (scale) => {
      // Drag hard into a corner from every direction.
      for (const [x, y] of [[9, 9], [-9, -9], [9, -9], [-9, 9]] as const) {
        const placed = clampPlacement({ offsetX: x, offsetY: y, scale });
        const [left, right] = edges({ offsetX: placed.offsetX, scale });
        expect(left).toBeGreaterThanOrEqual(-0.5001);
        expect(right).toBeLessThanOrEqual(0.5001);
      }
    },
  );

  it('pins a full-area design to the centre, because it has nowhere to go', () => {
    const placed = clampPlacement({ offsetX: 0.4, offsetY: -0.4, scale: 1 });
    expect(placed.offsetX).toBe(0);
    expect(placed.offsetY).toBe(0);
  });

  it('leaves a placement that was already inside alone', () => {
    const placed = clampPlacement({ offsetX: 0.1, offsetY: -0.1, scale: 0.5 });
    expect(placed.offsetX).toBeCloseTo(0.1);
    expect(placed.offsetY).toBeCloseTo(-0.1);
  });

  it('gives a small design more room to move than a large one', () => {
    expect(maxOffsetForScale(0.2)).toBeGreaterThan(maxOffsetForScale(0.8));
  });

  /**
   * The old ceiling was 1.5 — a design half again larger than the area it
   * prints on, with the overflow trimmed by the press and nothing said.
   */
  it('never scales past the print area', () => {
    expect(clampScale(1.5)).toBe(MAX_SCALE);
    expect(MAX_SCALE).toBe(1);
  });

  it('refuses to shrink the artwork out of existence', () => {
    expect(clampScale(0)).toBeGreaterThan(0);
  });
});

/**
 * A pinch is never purely a pinch — the fingers rotate a few degrees — so a
 * customer resizing their photo used to be left with a tilt they never asked
 * for. Anything deliberate is well past 12°.
 */
describe('a design that is nearly straight is straightened', () => {
  it.each([0, 3, -4, 8, -11])('snaps %p° back to upright', (angle) => {
    expect(snapRotation(angle)).toBe(0);
  });

  it.each([90, 180, 270])('snaps to %p° as well', (angle) => {
    expect(snapRotation(angle + 3)).toBe(angle);
  });

  it('wraps 360 back to zero rather than leaving a full turn', () => {
    expect(snapRotation(357)).toBe(0);
  });

  it.each([20, 45, -30, 135])('leaves a deliberate %p° alone', (angle) => {
    // Normalised, so -30 comes back as 330 — the same orientation, and the
    // one that will not reach the press as a negative full turn.
    const snapped = snapRotation(angle);
    expect(((snapped - angle) % 360 + 360) % 360).toBe(0);
    expect(snapped).toBeGreaterThanOrEqual(0);
    expect(snapped).toBeLessThan(360);
  });

  it('catches the tilt a two-finger resize actually leaves behind', () => {
    // Measured on device: a pinch to resize came out around 11° off.
    expect(Math.abs(11)).toBeLessThan(ROTATION_SNAP_THRESHOLD);
    expect(snapRotation(11)).toBe(0);
  });
});
