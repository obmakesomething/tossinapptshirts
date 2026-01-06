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

export function buildTemplate(
  product: CatalogProduct,
  color: string,
  placement: Placement
): MockupTemplate {
  const image = placement === 'back' ? product.detailImage : product.mainImage;
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
