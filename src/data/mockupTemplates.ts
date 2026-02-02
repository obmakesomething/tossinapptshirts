import type { ImageSourcePropType } from 'react-native';
import type { CatalogProduct } from './catalog';

export type Placement = 'front' | 'back';

export type PrintArea = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type MockupTemplate = {
  id: string;
  productId: string;
  productName: string;
  color: string;
  placement: Placement;
  image: ImageSourcePropType;
  printArea: PrintArea;
};

export const defaultPrintArea: PrintArea = {
  x: 0.32,
  y: 0.22,
  width: 0.36,
  height: 0.46,
};

// Actual print dimensions by product category (cm)
export const printSizeByCategory: Record<string, { widthCm: number; heightCm: number }> = {
  티셔츠: { widthCm: 28, heightCm: 36 },
  후드: { widthCm: 30, heightCm: 40 },
  맨투맨: { widthCm: 30, heightCm: 40 },
};

export function buildTemplate(
  product: CatalogProduct,
  color: string,
  placement: Placement,
): MockupTemplate {
  // Use color-specific images if available, otherwise fallback to default
  let image: ImageSourcePropType;
  const colorSpec = product.colorImages?.[color];

  if (placement === 'back') {
    image = colorSpec?.detail ?? product.detailImage;
  } else {
    image = colorSpec?.main ?? product.mainImage;
  }

  return {
    id: `${product.id}-${color}-${placement}`,
    productId: product.id,
    productName: product.name,
    color,
    placement,
    image,
    printArea: defaultPrintArea,
  };
}
