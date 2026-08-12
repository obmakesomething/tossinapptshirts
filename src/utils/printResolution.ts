/**
 * Print resolution assessment.
 *
 * Low-resolution artwork is upscaled by hand after the order — the fulfilment
 * mail tags which orders need it. So this exists to help a customer pick a
 * better photo while they still have the album open, not to warn them off the
 * purchase. A softer, larger photo still prints; it just prints better if they
 * have a bigger one.
 *
 * The thresholds still match server/printPipeline.js, so the figure a customer
 * sees and the figure the operator acts on are the same number. Only the tone
 * differs, because they are different decisions: one is "which photo", the
 * other is "does this need work before it goes to the press".
 */

const CM_PER_INCH = 2.54;

/** Comfortably sharp for garment printing. */
export const DPI_GOOD = 200;
/** Below this, output visibly breaks up. */
export const DPI_POOR = 150;

export type PrintResolutionLevel = 'good' | 'low' | 'poor' | 'unknown';

export type PrintResolutionResult = {
  dpi: number | null;
  level: PrintResolutionLevel;
  title: string;
  description: string;
};

export type PrintResolutionInput = {
  pixelWidth: number;
  pixelHeight: number;
  printWidthCm: number;
  printHeightCm: number;
};

/**
 * Effective DPI of the artwork at the size it is printed.
 *
 * The artwork is contained inside the print area, keeping its own aspect — the
 * same fit server/printLayout.js uses to compose the press file. Dividing by
 * the print area's own dimensions instead assumes the image is stretched to
 * fill it, and under-reports whenever the two aspects differ: a square photo
 * on a 28x36cm tee came out 145 DPI against the 186 it actually prints at.
 */
export function calculateEffectiveDpi({
  pixelWidth,
  pixelHeight,
  printWidthCm,
  printHeightCm,
}: PrintResolutionInput): number | null {
  if (!pixelWidth || !pixelHeight || !printWidthCm || !printHeightCm) return null;

  const areaWidthInches = printWidthCm / CM_PER_INCH;
  const areaHeightInches = printHeightCm / CM_PER_INCH;
  if (areaWidthInches <= 0 || areaHeightInches <= 0) return null;

  const imageAspect = pixelWidth / pixelHeight;
  const areaAspect = areaWidthInches / areaHeightInches;
  const printedWidthInches =
    areaAspect > imageAspect ? areaHeightInches * imageAspect : areaWidthInches;
  const printedHeightInches = printedWidthInches / imageAspect;

  return Math.round(
    Math.min(
      pixelWidth / printedWidthInches,
      pixelHeight / printedHeightInches,
    ),
  );
}

export function evaluatePrintResolution(
  input: PrintResolutionInput,
): PrintResolutionResult {
  const dpi = calculateEffectiveDpi(input);

  if (dpi === null) {
    return {
      dpi: null,
      level: 'unknown',
      title: '인쇄 품질을 확인하는 중이에요',
      description: '이미지 정보를 읽고 있어요.',
    };
  }

  if (dpi < DPI_POOR) {
    return {
      dpi,
      level: 'poor',
      title: '더 큰 사진이 있으면 좋아요',
      description: `지금 사진은 약 ${dpi}DPI예요. 더 큰 사진으로 바꾸거나 인쇄 크기를 줄이면 훨씬 또렷해져요.`,
    };
  }

  if (dpi < DPI_GOOD) {
    return {
      dpi,
      level: 'low',
      title: '이대로도 괜찮아요',
      description: `약 ${dpi}DPI예요. 더 큰 사진이 있다면 조금 더 또렷하게 나와요.`,
    };
  }

  return {
    dpi,
    level: 'good',
    title: '선명하게 인쇄돼요',
    description: `약 ${dpi}DPI · ${input.pixelWidth}×${input.pixelHeight}px`,
  };
}
