const {
  clipToCanvas,
  layoutLayer,
  normalizeTransform,
  printCanvasSize,
} = require('./printLayout');

const CANVAS = { canvasWidth: 1000, canvasHeight: 1000 };

describe('layoutLayer', () => {
  it('fills the print area at scale 1 for a square layer', () => {
    const rect = layoutLayer({
      ...CANVAS,
      layerAspect: 1,
      transform: { offsetX: 0, offsetY: 0, scale: 1, rotation: 0 },
    });
    expect(rect).toMatchObject({ left: 0, top: 0, width: 1000, height: 1000 });
  });

  it('contains a wide layer inside the print area rather than cropping it', () => {
    const rect = layoutLayer({
      ...CANVAS,
      layerAspect: 2,
      transform: { offsetX: 0, offsetY: 0, scale: 1, rotation: 0 },
    });
    expect(rect.width).toBe(1000);
    expect(rect.height).toBe(500);
    // Vertically centred, so the same margin above and below.
    expect(rect.top).toBe(250);
  });

  it('reads offsets as a fraction of the print area from centre', () => {
    const rect = layoutLayer({
      ...CANVAS,
      layerAspect: 1,
      transform: { offsetX: 0.25, offsetY: -0.1, scale: 0.5, rotation: 0 },
    });
    // Half-size layer, centre pushed a quarter of the width right.
    expect(rect.width).toBe(500);
    expect(rect.left + rect.width / 2).toBe(750);
    expect(rect.top + rect.height / 2).toBe(400);
  });

  it('carries rotation through untouched', () => {
    const rect = layoutLayer({
      ...CANVAS,
      layerAspect: 1,
      transform: { offsetX: 0, offsetY: 0, scale: 1, rotation: 45 },
    });
    expect(rect.rotation).toBe(45);
  });

  it('falls back to the canvas aspect when the layer size is unknown', () => {
    const rect = layoutLayer({
      canvasWidth: 800,
      canvasHeight: 400,
      layerAspect: null,
      transform: { scale: 1 },
    });
    expect(rect).toMatchObject({ width: 800, height: 400 });
  });
});

describe('normalizeTransform', () => {
  it('fills in a missing transform with an identity placement', () => {
    expect(normalizeTransform(null)).toEqual({
      offsetX: 0,
      offsetY: 0,
      scale: 1,
      rotation: 0,
    });
  });

  it('rejects non-finite values instead of producing NaN geometry', () => {
    expect(normalizeTransform({ offsetX: 'x', scale: Number.NaN })).toEqual({
      offsetX: 0,
      offsetY: 0,
      scale: 1,
      rotation: 0,
    });
  });

  it('never allows a negative scale', () => {
    expect(normalizeTransform({ scale: -2 }).scale).toBe(0);
  });
});

describe('clipToCanvas', () => {
  it('leaves a layer inside the canvas whole', () => {
    const clip = clipToCanvas({
      rect: { left: 100, top: 100, width: 200, height: 200 },
      canvasWidth: 1000,
      canvasHeight: 1000,
    });
    expect(clip).toEqual({
      sourceLeft: 0,
      sourceTop: 0,
      width: 200,
      height: 200,
      canvasLeft: 100,
      canvasTop: 100,
    });
  });

  it('crops what hangs off the top-left, keeping the rest in place', () => {
    const clip = clipToCanvas({
      rect: { left: -50, top: -30, width: 200, height: 200 },
      canvasWidth: 1000,
      canvasHeight: 1000,
    });
    expect(clip).toEqual({
      sourceLeft: 50,
      sourceTop: 30,
      width: 150,
      height: 170,
      canvasLeft: 0,
      canvasTop: 0,
    });
  });

  it('crops what hangs off the bottom-right', () => {
    const clip = clipToCanvas({
      rect: { left: 900, top: 900, width: 200, height: 200 },
      canvasWidth: 1000,
      canvasHeight: 1000,
    });
    expect(clip).toMatchObject({ width: 100, height: 100, canvasLeft: 900 });
  });

  it('reports a layer dragged entirely outside the print area', () => {
    const clip = clipToCanvas({
      rect: { left: 1200, top: 0, width: 100, height: 100 },
      canvasWidth: 1000,
      canvasHeight: 1000,
    });
    expect(clip).toBeNull();
  });
});

describe('printCanvasSize', () => {
  it('turns a 28x36cm print area into pixels at 300 DPI', () => {
    expect(printCanvasSize({ widthCm: 28, heightCm: 36, dpi: 300 })).toEqual({
      width: 3307,
      height: 4252,
    });
  });
});
