const LIGHT_GARMENT_KEYWORDS = ['white', '오프화이트', '화이트', 'ivory', '아이보리'];

export function isLightGarmentColor(color?: string | null): boolean {
  if (!color) return false;
  const normalized = color.toLowerCase().replace(/\s+/g, '');
  return LIGHT_GARMENT_KEYWORDS.some((keyword) => normalized.includes(keyword));
}

export function getGarmentStageBackground(
  color: string | null | undefined,
  fallback: string,
): string {
  return isLightGarmentColor(color) ? '#E3E8EF' : fallback;
}
