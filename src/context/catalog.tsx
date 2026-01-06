import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { catalogProducts, type CatalogProduct } from '../data/catalog';
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

export type OrderLine = {
  id: string;
  sizeLabel: string;
  quantity: number;
};

type CatalogContextValue = {
  products: CatalogProduct[];
  selectedProduct: CatalogProduct;
  selectedColor: string;
  orderLines: OrderLine[];
  totalQuantity: number;
  selectedPlacement: Placement;
  printBackEnabled: boolean;
  selectedPrint: PrintOption;
  designImageUri: string | null;
  designPrompt: string;
  imageTransform: LayerTransform;
  textTransform: LayerTransform;
  activeLayer: 'image' | 'text';
  textLayer: TextLayer;
  setSelectedProductId: (id: string) => void;
  setSelectedColor: (color: string) => void;
  addOrderLine: (sizeLabel: string) => void;
  removeOrderLine: (lineId: string) => void;
  setOrderLineSize: (lineId: string, sizeLabel: string) => void;
  setOrderLineQuantity: (lineId: string, quantity: number) => void;
  setSelectedPlacement: (placement: Placement) => void;
  setPrintBackEnabled: (enabled: boolean) => void;
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
  const resolveAutoPrint = (product: CatalogProduct) => {
    if (product.category === '에코백') {
      return printOptions.find((option) => option.id === 'a5') ?? fallbackPrint;
    }
    return printOptions.find((option) => option.id === 'a4') ?? fallbackPrint;
  };
  const defaultImageTransform: LayerTransform = {
    offsetX: 0,
    offsetY: 0,
    scale: resolveAutoPrint(fallbackProduct).designScale,
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
  const [orderLines, setOrderLines] = useState<OrderLine[]>([]);
  const [selectedPlacement, setSelectedPlacement] = useState<Placement>('front');
  const [printBackEnabled, setPrintBackEnabledState] = useState(false);
  const [selectedPrintId, setSelectedPrintId] = useState<PrintOption['id']>(
    resolveAutoPrint(fallbackProduct).id
  );
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

  const selectedPrint =
    printOptions.find((option) => option.id === selectedPrintId) ?? fallbackPrint;

  const totalQuantity = useMemo(
    () => orderLines.reduce((sum, line) => sum + line.quantity, 0),
    [orderLines]
  );

  const createOrderLine = (sizeLabel: string, quantityValue = 1): OrderLine => ({
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    sizeLabel,
    quantity: quantityValue,
  });

  useEffect(() => {
    if (!selectedProduct) return;
    setSelectedColor(selectedProduct.colors[0] ?? '');
    const firstSize = selectedProduct.sizes[0]?.label ?? '';
    setOrderLines([createOrderLine(firstSize, 1)]);
    const autoPrint = resolveAutoPrint(selectedProduct);
    setSelectedPrintId(autoPrint.id);
  }, [selectedProduct?.id]);

  useEffect(() => {
    setImageTransform((prev) => ({ ...prev, scale: selectedPrint.designScale }));
  }, [selectedPrint.id]);

  const setPrintBackEnabled = (enabled: boolean) => {
    setPrintBackEnabledState(enabled);
    if (!enabled) {
      setSelectedPlacement('front');
    }
  };

  const addOrderLine = (sizeLabel: string) => {
    setOrderLines((lines) => [...lines, createOrderLine(sizeLabel, 1)]);
  };

  const removeOrderLine = (lineId: string) => {
    setOrderLines((lines) => lines.filter((line) => line.id !== lineId));
  };

  const setOrderLineSize = (lineId: string, sizeLabel: string) => {
    setOrderLines((lines) =>
      lines.map((line) =>
        line.id === lineId ? { ...line, sizeLabel } : line
      )
    );
  };

  const setOrderLineQuantity = (lineId: string, quantityValue: number) => {
    setOrderLines((lines) =>
      lines.map((line) =>
        line.id === lineId
          ? { ...line, quantity: Math.max(1, quantityValue) }
          : line
      )
    );
  };

  const value: CatalogContextValue = {
    products,
    selectedProduct,
    selectedColor,
    orderLines,
    totalQuantity,
    selectedPlacement,
    printBackEnabled,
    selectedPrint,
    designImageUri,
    designPrompt,
    imageTransform,
    textTransform,
    activeLayer,
    textLayer,
    setSelectedProductId,
    setSelectedColor,
    addOrderLine,
    removeOrderLine,
    setOrderLineSize,
    setOrderLineQuantity,
    setSelectedPlacement,
    setPrintBackEnabled,
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
