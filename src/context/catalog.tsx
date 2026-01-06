import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { catalogProducts, type CatalogProduct, type SizeOption } from '../data/catalog';
import { printOptions, type PrintOption } from '../data/printOptions';
import type { Placement } from '../data/mockupTemplates';

type CatalogContextValue = {
  products: CatalogProduct[];
  selectedProduct: CatalogProduct;
  selectedColor: string;
  selectedSize: SizeOption | null;
  selectedPlacement: Placement;
  selectedPrint: PrintOption;
  setSelectedProductId: (id: string) => void;
  setSelectedColor: (color: string) => void;
  setSelectedSizeLabel: (label: string) => void;
  setSelectedPlacement: (placement: Placement) => void;
  setSelectedPrintId: (id: PrintOption['id']) => void;
};

const CatalogContext = createContext<CatalogContextValue | null>(null);

export function CatalogProvider({ children }: { children: React.ReactNode }) {
  const products = catalogProducts;
  const fallbackProduct = products[0];
  if (!fallbackProduct) {
    throw new Error('Catalog products are missing.');
  }
  const fallbackPrint = printOptions[2] ?? printOptions[0];
  if (!fallbackPrint) {
    throw new Error('Print options are missing.');
  }

  const [selectedProductId, setSelectedProductId] = useState(fallbackProduct.id);
  const [selectedColor, setSelectedColor] = useState('');
  const [selectedSizeLabel, setSelectedSizeLabel] = useState('');
  const [selectedPlacement, setSelectedPlacement] = useState<Placement>('front');
  const [selectedPrintId, setSelectedPrintId] = useState<PrintOption['id']>(
    fallbackPrint.id
  );

  const selectedProduct = useMemo(
    () => products.find((product) => product.id === selectedProductId) ?? fallbackProduct,
    [products, selectedProductId, fallbackProduct]
  );

  const selectedSize = useMemo(() => {
    if (!selectedProduct) return null;
    return (
      selectedProduct.sizes.find((size) => size.label === selectedSizeLabel) ??
      selectedProduct.sizes[0] ??
      null
    );
  }, [selectedProduct, selectedSizeLabel]);

  const selectedPrint =
    printOptions.find((option) => option.id === selectedPrintId) ?? fallbackPrint;

  useEffect(() => {
    if (!selectedProduct) return;
    setSelectedColor(selectedProduct.colors[0] ?? '');
    setSelectedSizeLabel(selectedProduct.sizes[0]?.label ?? '');
  }, [selectedProduct?.id]);

  const value: CatalogContextValue = {
    products,
    selectedProduct,
    selectedColor,
    selectedSize,
    selectedPlacement,
    selectedPrint,
    setSelectedProductId,
    setSelectedColor,
    setSelectedSizeLabel,
    setSelectedPlacement,
    setSelectedPrintId,
  };

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

export function useCatalog() {
  const context = useContext(CatalogContext);
  if (!context) {
    throw new Error('useCatalog must be used within CatalogProvider');
  }
  return context;
}
