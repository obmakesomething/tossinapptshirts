/**
 * How the editor divides the screen it is given.
 *
 * This lived inline in the editor as a run of consts, which meant the only way
 * to find out whether the column fits was to render it — and the one place it
 * can be rendered for review, the web harness, never fires onLayout, so it
 * runs the fallback constants and answers a different question. Pulled out
 * here the arithmetic can be checked against a phone's real dimensions
 * without a phone.
 *
 * The drawer is drawn over the column rather than inside it, so coming up
 * short does not overflow, it hides the end of the column behind the drawer.
 * That is what `fits` is asking about.
 */

/** Below this the garment stops reading as the thing being designed. */
export const MIN_CANVAS_HEIGHT = 200;
/** What the garment may shrink to on a phone that cannot afford 200. */
export const CANVAS_FLOOR = 160;
/**
 * The drawer reserves nothing when it is shut.
 *
 * It used to rest as a title bar along the bottom, so a closed drawer still
 * cost 56pt of column. It is not rendered at all now — it opens from the
 * header — so a shut drawer is worth exactly zero, and the garment gets it.
 */
export const PANEL_HANDLE_HEIGHT = 0;
/** Reset button and print-size caption, plus slack under 완성 보기. */
export const RESET_CAPTION_RESERVED = 46;
/** With no artwork only the upload button sits below the garment. */
export const EMPTY_CTA_RESERVED = 132;
/**
 * The title row, and the lead copy that only shows before there is a photo.
 *
 * This was 164 when the header also carried a garment/colour row and the
 * 앞면/뒷면 segment. Both moved — colour and garment to the order screen,
 * placement into the edit drawer — so the header is a back arrow, a title and
 * an edit button.
 */
export const EDITOR_HEADER_RESERVED = 96;
/**
 * Size chips, order button and the DPI line, before they are measured.
 *
 * The block measures 98pt at 375pt wide — an order button and, when it has
 * something to say, the resolution notice. It was 320 when size chips and a
 * quantity strip lived here too; they are on the order screen now. This is
 * that measurement plus the reset row and deliberate slack. It is generous on purpose: an over-reserve costs the
 * garment a few points, an under-reserve hides the end of the column behind
 * the drawer. Only the first frame and the web harness ever use it — onLayout
 * replaces it everywhere else, and never fires in the harness at all.
 */
export const ARTWORK_CAPTION_RESERVED = 140;

export type EditorLayoutInput = {
  /** What the safe area reported, or 0 before it has. */
  safeHeight: number;
  /** What Dimensions reports for the window. */
  screenHeight: number;
  /** Measured header, or 0 before onLayout fires. */
  headerHeight: number;
  /** Measured block below the canvas, or 0 before onLayout fires. */
  actionsHeight: number;
  hasArtwork: boolean;
  panelExpanded: boolean;
};

export type EditorLayout = {
  usableHeight: number;
  headerReserved: number;
  reservedBelowCanvas: number;
  panelHeight: number;
  canvasHeight: number;
  /** True when header, canvas, the block below it and the drawer all fit. */
  fits: boolean;
};

export function computeEditorLayout({
  safeHeight,
  screenHeight,
  headerHeight,
  actionsHeight,
  hasArtwork,
  panelExpanded,
}: EditorLayoutInput): EditorLayout {
  /**
   * Never larger than the window. A root that is not itself height-constrained
   * grows with its content, so the canvas would ask for the space it had
   * already taken and get a bigger answer each time.
   */
  const usableHeight = Math.min(
    safeHeight > 0 ? safeHeight : screenHeight,
    screenHeight,
  );
  const headerReserved = headerHeight > 0 ? headerHeight : EDITOR_HEADER_RESERVED;
  const reservedBelowCanvas = hasArtwork
    ? actionsHeight > 0
      ? actionsHeight + RESET_CAPTION_RESERVED
      : ARTWORK_CAPTION_RESERVED
    : EMPTY_CTA_RESERVED;

  /**
   * What is left for the canvas and the drawer to share.
   *
   * The drawer used to take Math.max(220, budget) — a floor that overrode the
   * very budget above it, so on a screen with no room for a 220pt drawer it
   * took 220 anyway and covered the order button. On a 812pt phone with the
   * drawer open that is exactly what happened, and on a 667pt phone the column
   * did not fit even with the drawer shut.
   */
  const available = Math.max(0, usableHeight - headerReserved - reservedBelowCanvas);

  const panelWanted = !hasArtwork
    ? 0
    : panelExpanded
      ? Math.min(
          Math.round(usableHeight * 0.55),
          Math.max(0, available - MIN_CANVAS_HEIGHT),
        )
      : PANEL_HANDLE_HEIGHT;

  /**
   * The garment would rather be 200pt, but on a short phone the choice is
   * between a smaller garment and an order button nobody can see.
   */
  const panelHeight = Math.min(
    panelWanted,
    Math.max(0, available - CANVAS_FLOOR),
  );
  const canvasHeight = Math.max(CANVAS_FLOOR, available - panelHeight);

  return {
    usableHeight,
    headerReserved,
    reservedBelowCanvas,
    panelHeight,
    canvasHeight,
    fits:
      headerReserved + canvasHeight + reservedBelowCanvas + panelHeight <=
      usableHeight,
  };
}
