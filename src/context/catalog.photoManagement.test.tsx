import React from 'react';
import { act, render } from '@testing-library/react-native';
import { CatalogProvider, useCatalog } from './catalog';

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
  if (!latestCatalog) {
    throw new Error('catalog context not initialized');
  }
  return latestCatalog as ReturnType<typeof useCatalog>;
}

describe('Catalog photo management', () => {
  it('adds second photo without replacing the first photo', () => {
    const catalog = renderCatalog();

    act(() => {
      catalog.addPhoto('data:image/png;base64,photo1');
    });
    expect(latestCatalog?.frontPhotos).toEqual(['data:image/png;base64,photo1']);

    act(() => {
      catalog.addPhoto('data:image/png;base64,photo2');
    });

    expect(latestCatalog?.frontPhotos).toEqual([
      'data:image/png;base64,photo1',
      'data:image/png;base64,photo2',
    ]);
    expect(latestCatalog?.frontPhotoIndex).toBe(1);
  });

  it('replaces only the selected photo', () => {
    const catalog = renderCatalog();

    act(() => {
      catalog.addPhoto('data:image/png;base64,photo1');
      catalog.addPhoto('data:image/png;base64,photo2');
      catalog.selectPhoto(0);
      catalog.replacePhoto('data:image/png;base64,replaced');
    });

    expect(latestCatalog?.frontPhotos).toEqual([
      'data:image/png;base64,replaced',
      'data:image/png;base64,photo2',
    ]);
    expect(latestCatalog?.frontPhotoIndex).toBe(0);
  });
});
