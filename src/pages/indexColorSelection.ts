import type { CatalogProduct } from '../data/catalog';

export type CategoryColorMap = Record<string, string>;

export function resolveCategoryPreviewColor(
  product: CatalogProduct,
  colorByCategory: CategoryColorMap,
): string {
  const fallback = product.colors[0] ?? '';
  const mapped = colorByCategory[product.category];
  if (!mapped) return fallback;
  return product.colors.includes(mapped) ? mapped : fallback;
}

export function syncCategoryColorMap(
  products: CatalogProduct[],
  colorByCategory: CategoryColorMap,
): CategoryColorMap {
  const next: CategoryColorMap = { ...colorByCategory };
  for (const product of products) {
    const mapped = next[product.category];
    if (mapped && product.colors.includes(mapped)) {
      continue;
    }
    next[product.category] = product.colors[0] ?? '';
  }
  return next;
}
