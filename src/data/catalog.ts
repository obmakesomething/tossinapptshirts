import type { ImageSourcePropType } from 'react-native';

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

const resolveImage = (remoteUrl: string): ImageSourcePropType => ({ uri: remoteUrl });

const formatPrice = (value: number | null) => {
  if (value == null) return '';
  return `₩${value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
};

export const catalogProducts: CatalogProduct[] = [
  {
    id: 'p-001',
    name: '[프린트스타] 148 헤비 14수 라운드 반팔 (남녀공용)',
    category: '티셔츠',
    modelName: 'Printstar 148 Heavy 14oz',
    price: 9500,
    originalPrice: 10900,
    priceText: formatPrice(
      9500
    ),
    url: 'https://www.customzone.co.kr/상품/%ed%94%84%eb%a6%b0%ed%8a%b8%ec%8a%a4%ed%83%80-148-%ed%97%a4%eb%b9%84-14%ec%88%98-%eb%9d%bc%ec%9a%b4%eb%93%9c-%eb%b0%98%ed%8c%94-%eb%82%a8%eb%85%80%ea%b3%b5%ec%9a%a9/',
    mainImage: resolveImage('https://www.customzone.co.kr/wp-content/uploads/2022/05/메인_148-헤비-14수-라운드-반팔.jpg'),
    detailImage: resolveImage('https://www.customzone.co.kr/wp-content/uploads/2022/05/프린트스타-148-헤비-14수-라운드-반팔-남녀공용-1.jpg'),
    colorImages: {
      '블랙': {
        main: resolveImage('https://www.customzone.co.kr/wp-content/uploads/2022/05/메인_148-헤비-14수-라운드-반팔.jpg'),
        detail: resolveImage('https://www.customzone.co.kr/wp-content/uploads/2022/05/프린트스타-148-헤비-14수-라운드-반팔-남녀공용-1.jpg'),
      },
      '화이트': {
        main: require('../../assets/mockups/tshirt_front.png'),
        detail: require('../../assets/mockups/tshirt_back.png'),
      },
    },
    colors: ['화이트', '블랙'],
    sizes: [{'label': 'XS', 'extraPrice': 0}, {'label': 'S', 'extraPrice': 0}, {'label': 'M', 'extraPrice': 0}, {'label': 'L', 'extraPrice': 0}, {'label': 'XL', 'extraPrice': 0}, {'label': '2XL', 'extraPrice': 1000}, {'label': '3XL', 'extraPrice': 1000}],
    tags: ['반팔티셔츠', '프린트스타 Printstar'],
  },
  {
    id: 'p-002',
    name: '[프린트스타] 188 헤비 후드 (남녀공용)',
    category: '후드',
    modelName: 'Printstar 188 Heavy Hoodie',
    price: 23500,
    originalPrice: 24500,
    priceText: formatPrice(
      23500
    ),
    url: 'https://www.customzone.co.kr/상품/%ed%94%84%eb%a6%b0%ed%8a%b8%ec%8a%a4%ed%83%80-188-%ed%97%a4%eb%b9%84-%ed%9b%84%eb%93%9c-%eb%82%a8%eb%85%80%ea%b3%b5%ec%9a%a9/',
    mainImage: resolveImage('https://www.customzone.co.kr/wp-content/uploads/2024/03/188-썸네일.jpg'),
    detailImage: resolveImage('https://www.customzone.co.kr/wp-content/uploads/2024/03/6-프린트스타-188-헤비-후드-남녀공용_상세페이지.jpg'),
    colors: ['화이트', '블랙'],
    sizes: [{'label': 'S', 'extraPrice': 0}, {'label': 'M', 'extraPrice': 0}, {'label': 'L', 'extraPrice': 0}, {'label': 'XL', 'extraPrice': 0}, {'label': '2XL', 'extraPrice': 3500}, {'label': '3XL', 'extraPrice': 3500}, {'label': '4XL', 'extraPrice': 3500}],
    tags: ['후드', '프린트스타 Printstar'],
  },
  {
    id: 'p-003',
    name: '[프린트스타] 183 헤비 맨투맨 (남녀공용)',
    category: '맨투맨',
    modelName: 'Printstar 183 Heavy Sweatshirt',
    price: 17000,
    originalPrice: 18000,
    priceText: formatPrice(
      17000
    ),
    url: 'https://www.customzone.co.kr/상품/%ed%94%84%eb%a6%b0%ed%8a%b8%ec%8a%a4%ed%83%80-183-%ed%97%a4%eb%b9%84-%eb%a7%a8%ed%88%ac%eb%a7%a8-%eb%82%a8%eb%85%80%ea%b3%b5%ec%9a%a9/',
    mainImage: resolveImage('https://www.customzone.co.kr/wp-content/uploads/2024/03/183-썸네일.jpg'),
    detailImage: resolveImage('https://www.customzone.co.kr/wp-content/uploads/2024/03/5-프린트스타-183-헤비-맨투맨-남녀공용_상세페이지.jpg'),
    colors: ['화이트', '블랙'],
    sizes: [{'label': 'S', 'extraPrice': 0}, {'label': 'M', 'extraPrice': 0}, {'label': 'L', 'extraPrice': 0}, {'label': 'XL', 'extraPrice': 0}, {'label': '2XL', 'extraPrice': 3500}, {'label': '3XL', 'extraPrice': 3500}, {'label': '4XL', 'extraPrice': 3500}],
    tags: ['맨투맨', '프린트스타 Printstar'],
  },
  {
    id: 'p-004',
    name: '캔버스 에코백(35X40)',
    category: '에코백',
    modelName: 'Canvas Eco Bag 35x40',
    price: 5500,
    originalPrice: null,
    priceText: formatPrice(
      5500
    ),
    url: 'https://www.customzone.co.kr/상품/cz-5000a-canvas-ivory-ecobag/',
    mainImage: resolveImage('https://www.customzone.co.kr/wp-content/uploads/2018/07/에코백_아이보리_목록.jpg'),
    detailImage: resolveImage('https://www.customzone.co.kr/wp-content/uploads/2018/10/캔버스-에코백.jpg'),
    colors: ['화이트', '블랙'],
    sizes: [{'label': 'ONE SIZE', 'extraPrice': 0}],
    tags: ['에코백/파우치', '에코백'],
  },
];
