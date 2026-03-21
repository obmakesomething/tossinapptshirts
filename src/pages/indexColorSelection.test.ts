import type { CatalogProduct } from '../data/catalog';
import { resolveCategoryPreviewColor } from './indexColorSelection';

const product: CatalogProduct = {
  id: 'p-001',
  name: '티셔츠',
  category: '티셔츠',
  modelName: 'Mock',
  price: 1000,
  originalPrice: null,
  priceText: '₩1,000',
  url: 'https://example.com',
  mainImage: { uri: 'mock://main' },
  detailImage: { uri: 'mock://detail' },
  colors: ['화이트', '블랙'],
  sizes: [{ label: 'M', extraPrice: 0 }],
  tags: [],
};

describe('resolveCategoryPreviewColor', () => {
  it('uses selected color in category map when valid', () => {
    expect(
      resolveCategoryPreviewColor(product, { 티셔츠: '블랙' }),
    ).toBe('블랙');
  });

  it('falls back to first product color when map color is missing/invalid', () => {
    expect(resolveCategoryPreviewColor(product, {})).toBe('화이트');
    expect(
      resolveCategoryPreviewColor(product, { 티셔츠: '네온핑크' }),
    ).toBe('화이트');
  });
});
