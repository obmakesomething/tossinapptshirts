import type { ImageSourcePropType } from 'react-native';
import type { CatalogProduct } from './catalog';

export type Placement = 'front' | 'back';

export type PrintArea = {
  x: number;
  y: number;
  width: number;
  height: number;
};

/**
 * Where the garment sits inside its photograph, as fractions of the image.
 *
 * Measured by scripts/measureGarmentBoxes.js, because the eight shots were
 * cropped separately and disagree: some fill their frame, the white tee fills
 * 63% of its height. Rendering the photograph rather than the garment made the
 * shirt change size whenever the colour changed.
 */
export type GarmentBox = {
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
  garmentBox?: GarmentBox;
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
 * 2:3.
 *
 * Every entry below was measured off its own file — the neckline, the body
 * width at the hem, and the seam that bounds the print from beneath. Each box
 * keeps its category's aspect from printSizeByCategory, so the preview and the
 * composed press file describe the same rectangle.
 *
 * What bounds each one:
 *   - Tees: shoulder line down, sized against the measured torso.
 *   - Hoodies: the hood opening down to the top of the kangaroo pocket. That
 *     clearance, not the garment's width, is what limits a hoodie print.
 *   - Sweatshirts: the collar down to the waistband rib.
 *
 * Sleeves lie alongside the body in these flat-lay photos, so the body width
 * is taken at the hem rib, below where the cuffs end. Measuring the full
 * silhouette instead counts two sleeves into the chest and produces a box
 * about 1.7× too wide — which is what the first pass at these values did.
 *
 * These place the artwork correctly on the garment. The centimetre figures in
 * printSizeByCategory are still the vendor's to confirm.
 */
/** Measured by scripts/measureGarmentBoxes.js. Re-run it if a shot changes. */
export const garmentBoxByMockup: Record<string, GarmentBox> = {
  'tshirt_white_front.png': { x: 0, y: 0.1846, width: 1, height: 0.6308 },
  'tshirt_white_back.png': { x: 0.0548, y: 0.1853, width: 0.8962, height: 0.6474 },
  'tshirt_black_front.png': { x: 0, y: 0, width: 1, height: 1 },
  'tshirt_black_back.png': { x: 0, y: 0, width: 1, height: 1 },
  'hoodie_black_front.png': { x: 0.135, y: 0.0525, width: 0.745, height: 0.8925 },
  'hoodie_grey_front.png': { x: 0.155, y: 0.0675, width: 0.6975, height: 0.8612 },
  'sweatshirt_black_front.png': { x: 0.0825, y: 0.0775, width: 0.84, height: 0.8375 },
  'sweatshirt_grey_front.png': { x: 0.0925, y: 0.1325, width: 0.8287, height: 0.745 },
};

function mockupFilename(image: ImageSourcePropType): string | undefined {
  const uri =
    typeof image === 'object' && image !== null && 'uri' in image
      ? (image as { uri?: string }).uri
      : undefined;
  return uri ? uri.split('/').pop() : undefined;
}

export function resolveGarmentBox(
  image: ImageSourcePropType,
): GarmentBox | undefined {
  const filename = mockupFilename(image);
  return filename ? garmentBoxByMockup[filename] : undefined;
}

export const printAreaByMockup: Record<string, PrintArea> = {
  'tshirt_white_front.png': { x: 0.348, y: 0.237, width: 0.308, height: 0.264 },
  'tshirt_white_back.png': { x: 0.348, y: 0.237, width: 0.308, height: 0.264 },
  'tshirt_black_front.png': { x: 0.327, y: 0.079, width: 0.343, height: 0.407 },
  'tshirt_black_back.png': { x: 0.327, y: 0.079, width: 0.343, height: 0.407 },
  'hoodie_grey_front.png': { x: 0.396, y: 0.353, width: 0.209, height: 0.276 },
  'hoodie_black_front.png': { x: 0.409, y: 0.393, width: 0.190, height: 0.251 },
  'sweatshirt_grey_front.png': { x: 0.344, y: 0.288, width: 0.320, height: 0.426 },
  'sweatshirt_black_front.png': { x: 0.340, y: 0.248, width: 0.333, height: 0.443 },
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

/**
 * Printable size by category, in centimetres.
 *
 * This is the canvas the press file is rendered onto and the figure quoted to
 * the customer, so it has to be the size that actually goes on the garment.
 *
 * The hoodie was 30×40 like the sweatshirt. It cannot be: the kangaroo pocket
 * sits about two thirds of the way down, and the clearance between the hood
 * opening and the pocket in both hoodie mockups is nowhere near 40cm of
 * garment. 25×33 keeps the same 3:4 proportion and fits the space measured in
 * the photographs — confirm it against the printer's placement template.
 */
export const printSizeByCategory: Record<string, { widthCm: number; heightCm: number }> = {
  티셔츠: { widthCm: 28, heightCm: 36 },
  후드: { widthCm: 25, heightCm: 33 },
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
    garmentBox: resolveGarmentBox(image),
  };
}
