import React from 'react';
import { act, render } from '@testing-library/react-native';
import { CatalogProvider, useCatalog } from './catalog';
import { catalogProducts } from '../data/catalog';

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
 * Choosing a garment used to choose a size too — sizes[0], which is the
 * smallest one every garment offers: XS on a tee, S on a hoodie. A customer
 * who never opened the option sheet ordered that, and nothing downstream could
 * tell an unmeant XS from a deliberate one. These pin the rule that replaced
 * it: the customer says what size they wear, or there is no order.
 */
describe('no size is chosen on the customer behalf', () => {
  it('starts with nothing ordered', () => {
    const catalog = renderCatalog();
    expect(catalog.orderLines).toEqual([]);
  });

  it.each(catalogProducts.map((p) => [p.name, p.id] as const))(
    'leaves %s without a size',
    (_name, productId) => {
      const catalog = renderCatalog();
      act(() => {
        catalog.setSelectedProductId(productId);
      });
      expect(latestCatalog?.orderLines).toEqual([]);
    },
  );

  it('never silently seeds the smallest size', () => {
    const catalog = renderCatalog();
    const smallest = catalogProducts.map((p) => p.sizes[0]?.label);
    act(() => {
      catalog.setSelectedProductId(catalogProducts[0]!.id);
    });
    expect(
      latestCatalog?.orderLines.map((line) => line.sizeLabel),
    ).not.toEqual(expect.arrayContaining(smallest.filter(Boolean) as string[]));
  });
});

describe('a chosen size survives only while it makes sense', () => {
  it('keeps what the customer picked', () => {
    const catalog = renderCatalog();
    const product = catalogProducts[0]!;
    act(() => {
      catalog.setSelectedProductId(product.id);
    });
    const size = product.sizes[2]!.label;
    act(() => {
      latestCatalog?.addOrderLine(size, 1);
    });
    expect(latestCatalog?.orderLines).toHaveLength(1);
    expect(latestCatalog?.orderLines[0]?.sizeLabel).toBe(size);
    expect(latestCatalog?.totalQuantity).toBe(1);
  });

  it('drops it when the garment changes, because the size chart does too', () => {
    const catalog = renderCatalog();
    const tee = catalogProducts.find((p) => p.category === '티셔츠')!;
    const other = catalogProducts.find((p) => p.id !== tee.id)!;
    act(() => {
      catalog.setSelectedProductId(tee.id);
    });
    act(() => {
      // XS exists on the tee and on neither the hoodie nor the sweatshirt.
      latestCatalog?.addOrderLine(tee.sizes[0]!.label, 1);
    });
    expect(latestCatalog?.orderLines).toHaveLength(1);

    act(() => {
      latestCatalog?.setSelectedProductId(other.id);
    });
    expect(latestCatalog?.orderLines).toEqual([]);
  });

  it('lets the customer take it back off', () => {
    const catalog = renderCatalog();
    const product = catalogProducts[0]!;
    act(() => {
      catalog.setSelectedProductId(product.id);
    });
    act(() => {
      latestCatalog?.addOrderLine(product.sizes[1]!.label, 1);
    });
    const lineId = latestCatalog!.orderLines[0]!.id;
    act(() => {
      latestCatalog?.removeOrderLine(lineId);
    });
    expect(latestCatalog?.orderLines).toEqual([]);
  });
});
