import type { PrintOption } from '../data/printOptions';
import type { GarmentMeasurements } from '../data/garmentSizes';

export type PrintSizeResult = {
  widthCm: number;
  heightCm: number;
  description: string;
  warnings: string[];
};

/**
 * Calculate actual print size based on garment size and print option
 */
export function calculatePrintSize(
  garmentMeasurements: GarmentMeasurements,
  printOption: PrintOption,
  placement: 'front' | 'back' = 'front'
): PrintSizeResult {
  const { printableWidth, printableHeight } = garmentMeasurements;
  const { designScale, label } = printOption;

  // Calculate print dimensions based on design scale
  const widthCm = Math.round(printableWidth * designScale * 10) / 10;
  const heightCm = Math.round(printableHeight * designScale * 10) / 10;

  // Generate warnings
  const warnings: string[] = [];

  // Check if print is too large
  if (widthCm > printableWidth - 2) {
    warnings.push('프린팅 영역이 최대 크기에 가깝습니다.');
  }

  // Check if print is too small
  if (widthCm < 8) {
    warnings.push('프린팅이 너무 작아 세부 사항이 흐릿할 수 있습니다.');
  }

  // Back placement warning
  if (placement === 'back') {
    warnings.push('뒷면 인쇄는 앞면보다 위치 조정이 제한적일 수 있습니다.');
  }

  // Generate description
  const description = `${label} 크기로 ${garmentMeasurements.size} 사이즈에 프린팅 시 약 ${widthCm}cm × ${heightCm}cm 크기로 인쇄됩니다.`;

  return {
    widthCm,
    heightCm,
    description,
    warnings,
  };
}

/**
 * Get recommended print option for a given garment size
 */
export function getRecommendedPrintOption(
  garmentMeasurements: GarmentMeasurements,
  targetWidthCm?: number
): string {
  const { printableWidth } = garmentMeasurements;

  if (!targetWidthCm) {
    // Default recommendation based on garment size
    if (printableWidth < 30) return 'logo';
    if (printableWidth < 35) return 'a5';
    if (printableWidth < 40) return 'a4';
    return 'a3';
  }

  // Find best matching print option
  const ratio = targetWidthCm / printableWidth;

  if (ratio <= 0.4) return 'logo';
  if (ratio <= 0.6) return 'a5';
  if (ratio <= 0.8) return 'a4';
  return 'a3';
}

/**
 * Validate if print size is acceptable
 */
export function validatePrintSize(
  widthCm: number,
  heightCm: number,
  garmentMeasurements: GarmentMeasurements
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Minimum size check
  if (widthCm < 5 || heightCm < 5) {
    errors.push('프린팅 크기가 너무 작습니다 (최소 5cm).');
  }

  // Maximum size check
  if (widthCm > garmentMeasurements.printableWidth) {
    errors.push(
      `프린팅 너비가 최대 한계를 초과합니다 (최대: ${garmentMeasurements.printableWidth}cm).`
    );
  }

  if (heightCm > garmentMeasurements.printableHeight) {
    errors.push(
      `프린팅 높이가 최대 한계를 초과합니다 (최대: ${garmentMeasurements.printableHeight}cm).`
    );
  }

  // Aspect ratio check (too extreme ratios may look odd)
  const aspectRatio = widthCm / heightCm;
  if (aspectRatio > 3 || aspectRatio < 0.33) {
    errors.push('프린팅 비율이 극단적입니다. 디자인을 확인해주세요.');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Format print size for display
 */
export function formatPrintSize(widthCm: number, heightCm: number): string {
  return `${widthCm}cm × ${heightCm}cm`;
}

/**
 * Calculate print area in square centimeters
 */
export function calculatePrintArea(widthCm: number, heightCm: number): number {
  return Math.round(widthCm * heightCm);
}
