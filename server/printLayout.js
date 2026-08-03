/**
 * Where a layer lands inside the printable region.
 *
 * This is the same arithmetic the editor uses to draw the design on the
 * garment (see buildImageRect in src/components/DesignStage.tsx). The two must
 * agree: the customer approves what they see on screen, and this is what the
 * press receives. Both express the transform against the print area — offsets
 * as a fraction of its width and height from centre, scale as a fraction of it,
 * rotation in degrees clockwise about the layer's own centre.
 *
 * Keep this file and buildImageRect in step. If one changes, the printed
 * garment stops matching the preview and nobody finds out until it ships.
 */

/** A transform with every field present and finite. */
function normalizeTransform(transform) {
  const t = transform || {};
  const num = (value, fallback) =>
    Number.isFinite(Number(value)) ? Number(value) : fallback;
  return {
    offsetX: num(t.offsetX, 0),
    offsetY: num(t.offsetY, 0),
    scale: Math.max(num(t.scale, 1), 0),
    rotation: num(t.rotation, 0),
  };
}

/**
 * Place a layer of a given aspect ratio inside a canvas.
 *
 * @param {object} args
 * @param {number} args.canvasWidth  print area width in pixels
 * @param {number} args.canvasHeight print area height in pixels
 * @param {number} args.layerAspect  natural width / height of the artwork
 * @param {object} args.transform    offsetX, offsetY, scale, rotation
 * @returns {{left:number, top:number, width:number, height:number, rotation:number}}
 *          Unrounded, and free to fall outside the canvas — the caller clips.
 */
function layoutLayer({ canvasWidth, canvasHeight, layerAspect, transform }) {
  const t = normalizeTransform(transform);
  const aspect =
    Number.isFinite(layerAspect) && layerAspect > 0
      ? layerAspect
      : canvasWidth / canvasHeight;

  const maxWidth = canvasWidth * t.scale;
  const maxHeight = canvasHeight * t.scale;

  // Contain: the layer fits inside scale × the print area, keeping its aspect.
  let width = maxWidth;
  let height = maxHeight;
  if (maxHeight > 0 && maxWidth / maxHeight > aspect) {
    height = maxHeight;
    width = height * aspect;
  } else {
    width = maxWidth;
    height = width / aspect;
  }

  const left = canvasWidth / 2 + t.offsetX * canvasWidth - width / 2;
  const top = canvasHeight / 2 + t.offsetY * canvasHeight - height / 2;

  return { left, top, width, height, rotation: t.rotation };
}

/**
 * Intersect a placed layer with the canvas.
 *
 * Artwork dragged past the print boundary is not printed — the press cannot
 * put ink outside the platen — so the pipeline crops rather than shrinking the
 * design to fit, which would silently change what the customer approved.
 *
 * @returns {null | {sourceLeft, sourceTop, width, height, canvasLeft, canvasTop}}
 *          null when the layer misses the canvas entirely.
 */
function clipToCanvas({ rect, canvasWidth, canvasHeight }) {
  const left = Math.round(rect.left);
  const top = Math.round(rect.top);
  const width = Math.round(rect.width);
  const height = Math.round(rect.height);

  const visibleLeft = Math.max(0, left);
  const visibleTop = Math.max(0, top);
  const visibleRight = Math.min(canvasWidth, left + width);
  const visibleBottom = Math.min(canvasHeight, top + height);

  const visibleWidth = visibleRight - visibleLeft;
  const visibleHeight = visibleBottom - visibleTop;
  if (visibleWidth <= 0 || visibleHeight <= 0) return null;

  return {
    sourceLeft: visibleLeft - left,
    sourceTop: visibleTop - top,
    width: visibleWidth,
    height: visibleHeight,
    canvasLeft: visibleLeft,
    canvasTop: visibleTop,
  };
}

/** Print area in pixels for a physical size at a given DPI. */
function printCanvasSize({ widthCm, heightCm, dpi }) {
  const CM_PER_INCH = 2.54;
  return {
    width: Math.round((widthCm / CM_PER_INCH) * dpi),
    height: Math.round((heightCm / CM_PER_INCH) * dpi),
  };
}

module.exports = {
  normalizeTransform,
  layoutLayer,
  clipToCanvas,
  printCanvasSize,
};
