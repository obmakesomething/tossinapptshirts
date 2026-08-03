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

/**
 * Print areas as a fraction of the mockup image, not of the canvas.
 *
 * One shared rectangle cannot serve these assets: they are cropped
 * differently (the 1040×1560 white tee shows the whole garment, the 421×457
 * tees are cut off at the shoulders) and their aspect ratios range from 1:1 to
 * 2:3. Each entry was derived from the garment's measured torso width and
 * shoulder line in that specific file, scaled by the printable size in
 * printSizeByCategory against the garment's flat chest width.
 *
 * The tee values come from a direct measurement of the garment outline. The
 * hoodie and sweatshirt values place the shoulder line by proportion, because
 * a hood cannot be told apart from a collar by outline alone — confirm them
 * against the printer's own placement template before relying on them.
 */
export const printAreaByMockup: Record<string, PrintArea> = {
  'tshirt_white_front.png': { x: 0.348, y: 0.237, width: 0.308, height: 0.264 },
  'tshirt_white_back.png': { x: 0.348, y: 0.237, width: 0.308, height: 0.264 },
  'tshirt_black_front.png': { x: 0.327, y: 0.079, width: 0.343, height: 0.407 },
  'tshirt_black_back.png': { x: 0.327, y: 0.079, width: 0.343, height: 0.407 },
  'hoodie_grey_front.png': { x: 0.329, y: 0.349, width: 0.342, height: 0.456 },
  'hoodie_black_front.png': { x: 0.316, y: 0.346, width: 0.370, height: 0.493 },
  'sweatshirt_grey_front.png': { x: 0.300, y: 0.283, width: 0.419, height: 0.558 },
  'sweatshirt_black_front.png': { x: 0.284, y: 0.240, width: 0.442, height: 0.589 },
};

/** Pick the print area for a mockup source, by the filename in its uri. */
export function resolvePrintArea(image: ImageSourcePropType): PrintArea {
  const uri =
    typeof image === 'object' && image !== null && 'uri' in image
      ? (image as { uri?: string }).uri
      : undefined;
  if (!uri) return defaultPrintArea;
  const filename = uri.split('/').pop();
  return (filename && printAreaByMockup[filename]) || defaultPrintArea;
}

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
    printArea: resolvePrintArea(image),
  };
}
