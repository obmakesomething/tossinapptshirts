import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { catalogProducts, type CatalogProduct, type SizeOption } from '../data/catalog';
import { printOptions, type PrintOption } from '../data/printOptions';
import type { Placement } from '../data/mockupTemplates';

export type LayerTransform = {
  offsetX: number;
  offsetY: number;
  scale: number;
  rotation: number;
};

export type TextLayer = {
  enabled: boolean;
  text: string;
  fontSize: number;
  fontWeight: 'regular' | 'bold';
  color: string;
};

type CatalogContextValue = {
  products: CatalogProduct[];
  selectedProduct: CatalogProduct;
  selectedColor: string;
  selectedSize: SizeOption | null;
  selectedPlacement: Placement;
  selectedPrint: PrintOption;
  quantity: number;
  designImageUri: string | null;
  designPrompt: string;
  imageTransform: LayerTransform;
  textTransform: LayerTransform;
  activeLayer: 'image' | 'text';
  textLayer: TextLayer;
  setSelectedProductId: (id: string) => void;
  setSelectedColor: (color: string) => void;
  setSelectedSizeLabel: (label: string) => void;
  setSelectedPlacement: (placement: Placement) => void;
  setSelectedPrintId: (id: PrintOption['id']) => void;
  setQuantity: (quantity: number) => void;
  setDesignImageUri: (uri: string | null) => void;
  setDesignPrompt: (prompt: string) => void;
  setImageTransform: (transform: LayerTransform) => void;
  setTextTransform: (transform: LayerTransform) => void;
  setActiveLayer: (layer: 'image' | 'text') => void;
  setTextLayer: (layer: TextLayer) => void;
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
  const defaultImageTransform: LayerTransform = {
    offsetX: 0,
    offsetY: 0,
    scale: fallbackPrint.designScale,
    rotation: 0,
  };
  const defaultTextTransform: LayerTransform = {
    offsetX: 0,
    offsetY: 0,
    scale: 0.45,
    rotation: 0,
  };
  const defaultTextLayer: TextLayer = {
    enabled: false,
    text: '텍스트',
    fontSize: 32,
    fontWeight: 'regular',
    color: '#0F172A',
  };

  const [selectedProductId, setSelectedProductId] = useState(fallbackProduct.id);
  const [selectedColor, setSelectedColor] = useState('');
  const [selectedSizeLabel, setSelectedSizeLabel] = useState('');
  const [selectedPlacement, setSelectedPlacement] = useState<Placement>('front');
  const [selectedPrintId, setSelectedPrintId] = useState<PrintOption['id']>(
    fallbackPrint.id
  );
  const [quantity, setQuantity] = useState(1);
  const [designImageUri, setDesignImageUri] = useState<string | null>(null);
  const [designPrompt, setDesignPrompt] = useState('');
  const [imageTransform, setImageTransform] = useState<LayerTransform>(
    defaultImageTransform
  );
  const [textTransform, setTextTransform] = useState<LayerTransform>(
    defaultTextTransform
  );
  const [activeLayer, setActiveLayer] = useState<'image' | 'text'>('image');
  const [textLayer, setTextLayer] = useState<TextLayer>(defaultTextLayer);

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

  useEffect(() => {
    setImageTransform((prev) => ({ ...prev, scale: selectedPrint.designScale }));
  }, [selectedPrint.id]);

  const value: CatalogContextValue = {
    products,
    selectedProduct,
    selectedColor,
    selectedSize,
    selectedPlacement,
    selectedPrint,
    quantity,
    designImageUri,
    designPrompt,
    imageTransform,
    textTransform,
    activeLayer,
    textLayer,
    setSelectedProductId,
    setSelectedColor,
    setSelectedSizeLabel,
    setSelectedPlacement,
    setSelectedPrintId,
    setQuantity,
    setDesignImageUri,
    setDesignPrompt,
    setImageTransform,
    setTextTransform,
    setActiveLayer,
    setTextLayer,
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
