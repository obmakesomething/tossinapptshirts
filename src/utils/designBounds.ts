/**
 * Keeping the design where it will actually print.
 *
 * offset is a fraction of the print area and scale is the artwork's size as a
 * fraction of it, so the artwork spans offset ± scale/2. The editor used to
 * allow an offset of ±1.4 — the design could be dragged most of a print area
 * clear of the print area, out onto the sleeve, and nothing on screen said so.
 * The press caught it (server/printPipeline.js reports artwork_outside_print_area)
 * but by then it is somebody's order.
 *
 * With the boundary enforced here, what the customer sees is what gets printed,
 * which is the only version of this that is easy to design against.
 */

/** Below this the artwork stops being visible enough to place. */
export const MIN_SCALE = 0.03;
/**
 * The print area is the whole canvas, so anything past 1 is cropped by the
 * press. Allowing 1.5 meant a design could be a third larger than the thing it
 * prints on, with the overflow silently trimmed.
 */
export const MAX_SCALE = 1;

/** How far the centre may move before an edge leaves the print area. */
export function maxOffsetForScale(scale: number): number {
  return Math.max(0, (1 - Math.min(scale, 1)) / 2);
}

export function clampScale(scale: number): number {
  return Math.min(Math.max(scale, MIN_SCALE), MAX_SCALE);
}

/** Clamps a placement so the artwork stays wholly inside the print area. */
export function clampPlacement({
  offsetX,
  offsetY,
  scale,
}: {
  offsetX: number;
  offsetY: number;
  scale: number;
}): { offsetX: number; offsetY: number; scale: number } {
  const nextScale = clampScale(scale);
  const limit = maxOffsetForScale(nextScale);
  // `|| 0` turns -0 into 0: it survives JSON, reaches the press file and reads
  // as a different number to anyone debugging a placement.
  return {
    scale: nextScale,
    offsetX: Math.min(Math.max(offsetX, -limit), limit) || 0,
    offsetY: Math.min(Math.max(offsetY, -limit), limit) || 0,
  };
}

/**
 * Straightens a nearly-upright design.
 *
 * A pinch is never purely a pinch — the fingers rotate a little — so a customer
 * who meant to resize ended up with a tilt they did not ask for. ±5° was too
 * tight to catch that; a deliberate tilt is well past 12°.
 */
export const ROTATION_SNAP_THRESHOLD = 12;

export function snapRotation(angle: number): number {
  /**
   * Normalised, not offset from where the finger happened to stop.
   *
   * Subtracting the remainder used to turn -11° into -360° — the same picture,
   * but a full negative turn stored on the order and handed to the press. A
   * rotation only ever means an orientation, so this returns one.
   */
  const mod = ((angle % 360) + 360) % 360;
  for (const snap of [0, 90, 180, 270, 360]) {
    if (Math.abs(mod - snap) < ROTATION_SNAP_THRESHOLD) {
      return snap === 360 ? 0 : snap;
    }
  }
  return mod;
}
