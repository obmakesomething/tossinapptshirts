import {
  CANVAS_FLOOR,
  MIN_CANVAS_HEIGHT,
  PANEL_HANDLE_HEIGHT,
  computeEditorLayout,
} from './editorLayout';

/**
 * Point heights of the phones this ships to. The editor is one column with a
 * drawer drawn over it, so a column that does not fit does not scroll — it
 * hides its own end, which is where the order button is.
 */
const DEVICES: Array<[string, number]> = [
  ['iPhone SE 3rd', 667],
  ['iPhone 13 mini', 812],
  ['iPhone 15', 852],
  ['iPhone 15 Pro Max', 932],
];

/** What the header and the block below the canvas measure at 375pt wide. */
const MEASURED = { headerHeight: 96, actionsHeight: 98 };

describe('the editor column fits the phone it is on', () => {
  describe.each(DEVICES)('%s (%ipt)', (_name, height) => {
    it.each([
      ['drawer closed', false],
      ['drawer open', true],
    ])('fits with the %s', (_label, panelExpanded) => {
      const layout = computeEditorLayout({
        safeHeight: height,
        screenHeight: height,
        ...MEASURED,
        hasArtwork: true,
        panelExpanded,
      });
      expect(layout.fits).toBe(true);
      expect(layout.canvasHeight).toBeGreaterThanOrEqual(CANVAS_FLOOR);
    });

    it('fits before onLayout has reported anything', () => {
      // The first frame runs on the fallback constants, and so does the web
      // harness for its whole life — onLayout never fires there.
      const layout = computeEditorLayout({
        safeHeight: 0,
        screenHeight: height,
        headerHeight: 0,
        actionsHeight: 0,
        hasArtwork: true,
        panelExpanded: false,
      });
      expect(layout.fits).toBe(true);
    });

    it('fits with no artwork, when there is no drawer at all', () => {
      const layout = computeEditorLayout({
        safeHeight: height,
        screenHeight: height,
        ...MEASURED,
        hasArtwork: false,
        panelExpanded: false,
      });
      expect(layout.fits).toBe(true);
      expect(layout.panelHeight).toBe(0);
    });
  });
});

/**
 * The drawer used to take Math.max(220, budget) — a floor that overrode the
 * budget above it. On a 812pt phone with the drawer open it took 220 it did
 * not have and covered the order button.
 */
describe('the drawer never takes room the screen does not have', () => {
  it('opens no wider than what is left after the garment', () => {
    const height = 812;
    const layout = computeEditorLayout({
      safeHeight: height,
      screenHeight: height,
      ...MEASURED,
      hasArtwork: true,
      panelExpanded: true,
    });
    expect(layout.canvasHeight).toBe(MIN_CANVAS_HEIGHT);
    expect(layout.fits).toBe(true);
  });

  it('gives the garment its preferred height wherever the screen allows', () => {
    for (const [, height] of DEVICES.filter(([, h]) => h >= 812)) {
      const layout = computeEditorLayout({
        safeHeight: height,
        screenHeight: height,
        ...MEASURED,
        hasArtwork: true,
        panelExpanded: true,
      });
      expect(layout.canvasHeight).toBeGreaterThanOrEqual(MIN_CANVAS_HEIGHT);
    }
  });

  it('costs the column nothing while it is shut', () => {
    // It is not rendered when closed — it opens from the header — so a closed
    // drawer must not reserve the bar it used to rest as.
    const layout = computeEditorLayout({
      safeHeight: 852,
      screenHeight: 852,
      ...MEASURED,
      hasArtwork: true,
      panelExpanded: false,
    });
    expect(layout.panelHeight).toBe(PANEL_HANDLE_HEIGHT);
    expect(PANEL_HANDLE_HEIGHT).toBe(0);
    // Everything the drawer is not taking goes to the garment.
    expect(layout.canvasHeight).toBeGreaterThan(500);
  });
});

describe('the window is the ceiling', () => {
  it('refuses a safe area larger than the window it sits in', () => {
    // A root that is not height-constrained grows with its content, so it can
    // report more than the window and the canvas would grow every pass.
    const layout = computeEditorLayout({
      safeHeight: 4000,
      screenHeight: 852,
      ...MEASURED,
      hasArtwork: true,
      panelExpanded: false,
    });
    expect(layout.usableHeight).toBe(852);
    expect(layout.fits).toBe(true);
  });
});
