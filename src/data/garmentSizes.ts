/**
 * Garment Size Measurements
 * Standard apparel dimensions in centimeters
 */

export type GarmentMeasurements = {
  size: string;
  chestWidth: number; // 가슴 너비 (cm)
  bodyLength: number; // 총 기장 (cm)
  printableWidth: number; // 프린팅 가능 너비 (cm)
  printableHeight: number; // 프린팅 가능 높이 (cm)
};

export type GarmentCategory = 'tshirt' | 'hoodie' | 'sweatshirt' | 'ecobag';

/**
 * Standard T-Shirt Measurements
 * Based on common Korean/Asian sizing
 */
export const tshirtSizes: GarmentMeasurements[] = [
  {
    size: 'XS',
    chestWidth: 44,
    bodyLength: 63,
    printableWidth: 28,
    printableHeight: 35,
  },
  {
    size: 'S',
    chestWidth: 47,
    bodyLength: 66,
    printableWidth: 30,
    printableHeight: 37,
  },
  {
    size: 'M',
    chestWidth: 50,
    bodyLength: 69,
    printableWidth: 32,
    printableHeight: 40,
  },
  {
    size: 'L',
    chestWidth: 53,
    bodyLength: 72,
    printableWidth: 34,
    printableHeight: 42,
  },
  {
    size: 'XL',
    chestWidth: 56,
    bodyLength: 75,
    printableWidth: 36,
    printableHeight: 44,
  },
  {
    size: '2XL',
    chestWidth: 59,
    bodyLength: 78,
    printableWidth: 38,
    printableHeight: 46,
  },
  {
    size: '3XL',
    chestWidth: 62,
    bodyLength: 81,
    printableWidth: 40,
    printableHeight: 48,
  },
  {
    size: '4XL',
    chestWidth: 65,
    bodyLength: 84,
    printableWidth: 42,
    printableHeight: 50,
  },
];

/**
 * Hoodie Measurements
 * Slightly larger than t-shirts
 */
export const hoodieSizes: GarmentMeasurements[] = [
  {
    size: 'S',
    chestWidth: 52,
    bodyLength: 68,
    printableWidth: 32,
    printableHeight: 38,
  },
  {
    size: 'M',
    chestWidth: 55,
    bodyLength: 71,
    printableWidth: 34,
    printableHeight: 41,
  },
  {
    size: 'L',
    chestWidth: 58,
    bodyLength: 74,
    printableWidth: 36,
    printableHeight: 43,
  },
  {
    size: 'XL',
    chestWidth: 61,
    bodyLength: 77,
    printableWidth: 38,
    printableHeight: 45,
  },
  {
    size: '2XL',
    chestWidth: 64,
    bodyLength: 80,
    printableWidth: 40,
    printableHeight: 47,
  },
  {
    size: '3XL',
    chestWidth: 67,
    bodyLength: 83,
    printableWidth: 42,
    printableHeight: 49,
  },
  {
    size: '4XL',
    chestWidth: 70,
    bodyLength: 86,
    printableWidth: 44,
    printableHeight: 51,
  },
];

/**
 * Sweatshirt Measurements
 * Similar to hoodies
 */
export const sweatshirtSizes: GarmentMeasurements[] = hoodieSizes;

/**
 * Eco Bag Measurements
 */
export const ecobagSizes: GarmentMeasurements[] = [
  {
    size: 'ONE SIZE',
    chestWidth: 35,
    bodyLength: 40,
    printableWidth: 28,
    printableHeight: 32,
  },
];

/**
 * Get measurements by category and size
 */
export function getGarmentMeasurements(
  category: GarmentCategory,
  size: string
): GarmentMeasurements | null {
  let sizeList: GarmentMeasurements[];

  switch (category) {
    case 'tshirt':
      sizeList = tshirtSizes;
      break;
    case 'hoodie':
      sizeList = hoodieSizes;
      break;
    case 'sweatshirt':
      sizeList = sweatshirtSizes;
      break;
    case 'ecobag':
      sizeList = ecobagSizes;
      break;
    default:
      return null;
  }

  return sizeList.find((s) => s.size === size) || null;
}

/**
 * Get garment category from product name
 */
export function getGarmentCategory(productName: string): GarmentCategory {
  const name = productName.toLowerCase();
  if (name.includes('후드') || name.includes('hoodie')) return 'hoodie';
  if (name.includes('맨투맨') || name.includes('sweatshirt')) return 'sweatshirt';
  if (name.includes('에코백') || name.includes('ecobag') || name.includes('bag')) return 'ecobag';
  return 'tshirt'; // default
}
