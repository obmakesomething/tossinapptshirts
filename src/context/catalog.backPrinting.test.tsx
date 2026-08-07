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
