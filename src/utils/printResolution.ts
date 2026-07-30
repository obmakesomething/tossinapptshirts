/**
 * Print resolution assessment.
 *
 * The pipeline no longer upscales artwork, so the file the customer supplies is
 * what gets printed. This tells them, before they pay, whether that file has
 * enough pixels for the print size they picked.
 *
 * Thresholds match server/printPipeline.js so the preview and the QC report
 * never disagree.
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
 * Effective DPI is limited by whichever axis is most stretched, so the smaller
 * of the two ratios is the honest figure.
 */
export function calculateEffectiveDpi({
  pixelWidth,
  pixelHeight,
  printWidthCm,
  printHeightCm,
}: PrintResolutionInput): number | null {
  if (!pixelWidth || !pixelHeight || !printWidthCm || !printHeightCm) return null;

  const widthInches = printWidthCm / CM_PER_INCH;
  const heightInches = printHeightCm / CM_PER_INCH;
  if (widthInches <= 0 || heightInches <= 0) return null;

  return Math.round(Math.min(pixelWidth / widthInches, pixelHeight / heightInches));
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
      title: '해상도가 낮아 깨져 보일 수 있어요',
      description: `약 ${dpi}DPI예요. 더 큰 이미지를 쓰거나 인쇄 크기를 줄이면 선명해져요.`,
    };
  }

  if (dpi < DPI_GOOD) {
    return {
      dpi,
      level: 'low',
      title: '인쇄하면 조금 흐릴 수 있어요',
      description: `약 ${dpi}DPI예요. 그대로 진행해도 되지만 더 큰 이미지를 쓰면 또렷해져요.`,
    };
  }

  return {
    dpi,
    level: 'good',
    title: '선명하게 인쇄돼요',
    description: `약 ${dpi}DPI · ${input.pixelWidth}×${input.pixelHeight}px`,
  };
}
