import type { ImageSourcePropType } from 'react-native';
import { MOCKUP_CONFIG } from '../config/mockups';

export type SizeOption = {
  label: string;
  extraPrice: number;
};

export type ColorImageMap = {
  [color: string]: {
    main: ImageSourcePropType;
    detail: ImageSourcePropType;
  };
};

export type CatalogProduct = {
  id: string;
  name: string;
  category: string;
  modelName: string;
  price: number | null;
  originalPrice: number | null;
  priceText: string;
  url: string;
  mainImage: ImageSourcePropType;
  detailImage: ImageSourcePropType;
  colorImages?: ColorImageMap;
  colors: string[];
  sizes: SizeOption[];
  tags: string[];
};

// Cache for image sources to ensure identical URIs return the same object reference
const mockupCache: Record<string, ImageSourcePropType> = {};

// Mockup images are served from configured base URL (server or S3)
const resolveMockup = (filename: string): ImageSourcePropType => {
  const uri = `${MOCKUP_CONFIG.baseUrl}/${filename}`;
  if (!mockupCache[uri]) {
    console.log('[DEBUG] Mockup URI (new):', uri);
    mockupCache[uri] = { uri };
  }
  return mockupCache[uri]!;
};

const formatPrice = (value: number | null) => {
  if (value == null) return '';
  return `₩${value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
};

export const catalogProducts: CatalogProduct[] = [
  {
    id: 'p-001',
    name: '티셔츠',
    category: '티셔츠',
    modelName: 'Printstar 148 Heavy 14oz',
    price: 10000,
    originalPrice: null,
    priceText: formatPrice(10000),
    url: 'https://www.customzone.co.kr/상품/%ed%94%84%eb%a6%b0%ed%8a%b8%ec%8a%a4%ed%83%80-148-%ed%97%a4%eb%b9%84-14%ec%88%98-%eb%9d%bc%ec%9a%b4%eb%93%9c-%eb%b0%98%ed%8c%94-%eb%82%a8%eb%85%80%ea%b3%b5%ec%9a%a9/',
    mainImage: resolveMockup('tshirt_black_front.jpg'),
    detailImage: resolveMockup('tshirt_black_front.jpg'),
    colorImages: {
      블랙: {
        main: resolveMockup('tshirt_black_front.jpg'),
        detail: resolveMockup('tshirt_black_front.jpg'),
      },
      화이트: {
        main: resolveMockup('tshirt_white_front.jpg'),
        detail: resolveMockup('tshirt_white_front.jpg'),
      },
    },
    colors: ['화이트', '블랙'],
    sizes: [
      { label: 'XS', extraPrice: 0 },
      { label: 'S', extraPrice: 0 },
      { label: 'M', extraPrice: 0 },
      { label: 'L', extraPrice: 0 },
      { label: 'XL', extraPrice: 0 },
      { label: '2XL', extraPrice: 1000 },
      { label: '3XL', extraPrice: 1000 },
    ],
    tags: ['반팔티셔츠', '프린트스타 Printstar'],
  },
  {
    id: 'p-002',
    name: '후드',
    category: '후드',
    modelName: 'Printstar 188 Heavy Hoodie',
    price: 23500,
    originalPrice: 24500,
    priceText: formatPrice(23500),
    url: 'https://www.customzone.co.kr/상품/%ed%94%84%eb%a6%b0%ed%8a%b8%ec%8a%a4%ed%83%80-188-%ed%97%a4%eb%b9%84-%ed%9b%84%eb%93%9c-%eb%82%a8%eb%85%80%ea%b3%b5%ec%9a%a9/',
    mainImage: resolveMockup('hoodie_grey_front.jpg'),
    detailImage: resolveMockup('hoodie_grey_front.jpg'),
    colorImages: {
      블랙: {
        main: resolveMockup('hoodie_black_front.jpg'),
        detail: resolveMockup('hoodie_black_front.jpg'),
      },
      그레이: {
        main: resolveMockup('hoodie_grey_front.jpg'),
        detail: resolveMockup('hoodie_grey_front.jpg'),
      },
    },
    colors: ['그레이', '블랙'],
    sizes: [
      { label: 'S', extraPrice: 0 },
      { label: 'M', extraPrice: 0 },
      { label: 'L', extraPrice: 0 },
      { label: 'XL', extraPrice: 0 },
      { label: '2XL', extraPrice: 3500 },
      { label: '3XL', extraPrice: 3500 },
      { label: '4XL', extraPrice: 3500 },
    ],
    tags: ['후드', '프린트스타 Printstar'],
  },
  {
    id: 'p-003',
    name: '맨투맨',
    category: '맨투맨',
    modelName: 'Printstar 183 Heavy Sweatshirt',
    price: 17000,
    originalPrice: 18000,
    priceText: formatPrice(17000),
    url: 'https://www.customzone.co.kr/상품/%ed%94%84%eb%a6%b0%ed%8a%b8%ec%8a%a4%ed%83%80-183-%ed%97%a4%eb%b9%84-%eb%a7%a8%ed%88%ac%eb%a7%a8-%eb%82%a8%eb%85%80%ea%b3%b5%ec%9a%a9/',
    mainImage: resolveMockup('sweatshirt_grey_front.jpg'),
    detailImage: resolveMockup('sweatshirt_grey_front.jpg'),
    colorImages: {
      블랙: {
        main: resolveMockup('sweatshirt_black_front.jpg'),
        detail: resolveMockup('sweatshirt_black_front.jpg'),
      },
      그레이: {
        main: resolveMockup('sweatshirt_grey_front.jpg'),
        detail: resolveMockup('sweatshirt_grey_front.jpg'),
      },
    },
    colors: ['그레이', '블랙'],
    sizes: [
      { label: 'S', extraPrice: 0 },
      { label: 'M', extraPrice: 0 },
      { label: 'L', extraPrice: 0 },
      { label: 'XL', extraPrice: 0 },
      { label: '2XL', extraPrice: 3500 },
      { label: '3XL', extraPrice: 3500 },
      { label: '4XL', extraPrice: 3500 },
    ],
    tags: ['맨투맨', '프린트스타 Printstar'],
  },
];
