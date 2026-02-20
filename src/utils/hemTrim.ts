const SIZE_TO_HEM_TRIM_RATIO: Record<string, number> = {
  XS: 0.095,
  S: 0.088,
  M: 0.08,
  L: 0.072,
  XL: 0.064,
  '2XL': 0.056,
  '3XL': 0.05,
  '4XL': 0.044,
};

const DEFAULT_HEM_TRIM_RATIO = 0.08;

export function getHemTrimInsetRatio(sizeLabel?: string | null): number {
  if (!sizeLabel) return DEFAULT_HEM_TRIM_RATIO;
  return SIZE_TO_HEM_TRIM_RATIO[sizeLabel] ?? DEFAULT_HEM_TRIM_RATIO;
}
