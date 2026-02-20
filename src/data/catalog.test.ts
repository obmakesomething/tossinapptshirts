/// <reference types="jest" />

import { catalogProducts } from './catalog';
import { MOCKUP_CONFIG } from '../config/mockups';

const isUriImageSource = (value: unknown): value is { uri: string } => {
  return (
    typeof value === 'object' &&
    value !== null &&
    'uri' in value &&
    typeof (value as { uri?: unknown }).uri === 'string'
  );
};

describe('catalogProducts', () => {
  test('uses absolute mockup image URLs under MOCKUP_CONFIG.baseUrl for core products', () => {
    const requiredProductIds = ['p-001', 'p-002', 'p-003'];

    for (const id of requiredProductIds) {
      const product = catalogProducts.find((p) => p.id === id);
      expect(product).toBeDefined();
      if (!product) continue;

      expect(isUriImageSource(product.mainImage)).toBe(true);
      expect(isUriImageSource(product.detailImage)).toBe(true);
      if (isUriImageSource(product.mainImage)) {
        expect(product.mainImage.uri.startsWith(`${MOCKUP_CONFIG.baseUrl}/`)).toBe(true);
      }
      if (isUriImageSource(product.detailImage)) {
        expect(product.detailImage.uri.startsWith(`${MOCKUP_CONFIG.baseUrl}/`)).toBe(true);
      }

      for (const colorSpec of Object.values(product.colorImages ?? {})) {
        expect(isUriImageSource(colorSpec.main)).toBe(true);
        expect(isUriImageSource(colorSpec.detail)).toBe(true);
        if (isUriImageSource(colorSpec.main)) {
          expect(colorSpec.main.uri.startsWith(`${MOCKUP_CONFIG.baseUrl}/`)).toBe(true);
        }
        if (isUriImageSource(colorSpec.detail)) {
          expect(colorSpec.detail.uri.startsWith(`${MOCKUP_CONFIG.baseUrl}/`)).toBe(true);
        }
      }
    }
  });
});
