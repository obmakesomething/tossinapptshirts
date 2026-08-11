import React from 'react';
import { act, render } from '@testing-library/react-native';
import { CatalogProvider, useCatalog } from './catalog';
import { calcPricing } from '../data/pricing';
import { catalogProducts } from '../data/catalog';
import { printOptions } from '../data/printOptions';

jest.mock('@apps-in-toss/native-modules', () => ({
  Storage: {
    getItem: jest.fn(async () => null),
    setItem: jest.fn(async () => undefined),
  },
}));

let latestCatalog: ReturnType<typeof useCatalog> | null = null;

function CatalogProbe() {
  latestCatalog = useCatalog();
  return null;
}

function renderCatalog() {
  latestCatalog = null;
  render(
    <CatalogProvider>
      <CatalogProbe />
    </CatalogProvider>,
  );
  if (!latestCatalog) throw new Error('catalog context not initialized');
  return latestCatalog as ReturnType<typeof useCatalog>;
}

/**
 * Back printing costs ₩6,000 per item, and it used to be switched on by the
 * editor the moment the customer tapped 뒷면 to look at the back. Nothing set it
 * back, and the editor shows no price, so the charge first appeared in the order
 * summary. These pin the rule that replaced it: the back is charged when the
 * back is printed.
 */
describe('back printing is charged for artwork, not for looking', () => {
  it('stays off when the customer only turns the shirt around', () => {
    const catalog = renderCatalog();
    expect(catalog.printBackEnabled).toBe(false);

    act(() => {
      catalog.setSelectedPlacement('back');
    });

    expect(latestCatalog?.selectedPlacement).toBe('back');
    expect(latestCatalog?.printBackEnabled).toBe(false);
  });

  it('turns on once something is placed on the back', () => {
    const catalog = renderCatalog();

    act(() => {
      catalog.setSelectedPlacement('back');
    });
    act(() => {
      latestCatalog?.addPhoto('data:image/png;base64,back-artwork');
    });

    expect(latestCatalog?.backPhotos).toHaveLength(1);
    expect(latestCatalog?.printBackEnabled).toBe(true);
  });

  it('turns off again when that artwork is removed', () => {
    const catalog = renderCatalog();

    act(() => {
      catalog.setSelectedPlacement('back');
    });
    act(() => {
      latestCatalog?.addPhoto('data:image/png;base64,back-artwork');
    });
    expect(latestCatalog?.printBackEnabled).toBe(true);

    act(() => {
      latestCatalog?.deletePhoto(0);
    });

    expect(latestCatalog?.printBackEnabled).toBe(false);
  });

  it('does not charge the customer for the trip to the back', () => {
    const product = catalogProducts[0]!;
    const printOption = printOptions[0]!;
    const orderLines = [{ id: 'l1', sizeLabel: 'M', quantity: 2 }];

    const justLooking = calcPricing({
      product,
      orderLines,
      printOption,
      printBackEnabled: false,
    });
    const actuallyPrinted = calcPricing({
      product,
      orderLines,
      printOption,
      printBackEnabled: true,
    });

    expect(justLooking.backPrintingFee).toBe(0);
    // ₩6,000 per item, so two items is the gap viewing used to open up.
    expect(actuallyPrinted.backPrintingFee).toBe(12000);
    expect(actuallyPrinted.total - justLooking.total).toBe(12000);
  });
});

/**
 * Home follows its own carousel category and used to write that category's
 * colour without changing the garment, so the catalogue could end up holding
 * 후드 · 화이트 — a hoodie in a colour hoodies do not come in. The order would
 * have gone to the press that way.
 */
describe('the selected colour always belongs to the selected garment', () => {
  it.each(catalogProducts.map((p) => [p.name, p.id] as const))(
    'gives %s one of its own colours',
    (_name, productId) => {
      const catalog = renderCatalog();
      act(() => {
        catalog.setSelectedProductId(productId);
      });
      const product = catalogProducts.find((p) => p.id === productId)!;
      expect(product.colors).toContain(latestCatalog?.selectedColor);
    },
  );

  it('keeps a colour the next garment also offers', () => {
    const catalog = renderCatalog();
    const black = catalogProducts.find((p) => p.colors.includes('블랙'))!;
    act(() => {
      catalog.setSelectedProductId(black.id);
    });
    act(() => {
      latestCatalog?.setSelectedColor('블랙');
    });
    const otherBlack = catalogProducts.find(
      (p) => p.id !== black.id && p.colors.includes('블랙'),
    )!;
    act(() => {
      latestCatalog?.setSelectedProductId(otherBlack.id);
    });
    expect(latestCatalog?.selectedColor).toBe('블랙');
  });

  it('drops a colour the next garment does not carry', () => {
    const catalog = renderCatalog();
    const tee = catalogProducts.find((p) => p.colors.includes('화이트'))!;
    act(() => {
      catalog.setSelectedProductId(tee.id);
    });
    act(() => {
      latestCatalog?.setSelectedColor('화이트');
    });
    const hoodie = catalogProducts.find((p) => !p.colors.includes('화이트'))!;
    act(() => {
      latestCatalog?.setSelectedProductId(hoodie.id);
    });
    expect(latestCatalog?.selectedColor).not.toBe('화이트');
    expect(hoodie.colors).toContain(latestCatalog?.selectedColor);
  });
});
