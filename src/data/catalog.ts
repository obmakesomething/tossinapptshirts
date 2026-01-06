import type { ImageSourcePropType } from 'react-native';
import { assetMap } from './catalogAssets';

export type SizeOption = {
  label: string;
  extraPrice: number;
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
  colors: string[];
  sizes: SizeOption[];
  tags: string[];
};

const resolveImage = (localPath: string, remoteUrl: string): ImageSourcePropType => {
  if (!__DEV__) return { uri: remoteUrl };
  const asset = assetMap[localPath as keyof typeof assetMap];
  return asset ?? { uri: remoteUrl };
};

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
    mainImage: resolveImage('downloads/[프린트스타]_148_헤비_14수_라운드_반팔_(남녀공용)/main_image.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2022/05/메인_148-헤비-14수-라운드-반팔.jpg'),
    detailImage: resolveImage('downloads/[프린트스타]_148_헤비_14수_라운드_반팔_(남녀공용)/detail_1.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2022/05/프린트스타-148-헤비-14수-라운드-반팔-남녀공용-1.jpg'),
    colors: ['화이트', '블랙'],
    sizes: [{'label': 'XS', 'extraPrice': 0}, {'label': 'S', 'extraPrice': 0}, {'label': 'M', 'extraPrice': 0}, {'label': 'L', 'extraPrice': 0}, {'label': 'XL', 'extraPrice': 0}, {'label': '2XL', 'extraPrice': 1000}, {'label': '3XL', 'extraPrice': 1000}],
    tags: ['반팔티셔츠', '프린트스타 Printstar'],
  },
  {
    id: 'p-002',
    name: '[프린트스타] 085 17수 반팔 (남녀공용&아동용)',
    category: '티셔츠',
    modelName: 'Printstar 085',
    price: 6500,
    originalPrice: 6900,
    priceText: formatPrice(
      6500
    ),
    url: 'https://www.customzone.co.kr/상품/printstar-cvt085-17tshirt/',
    mainImage: resolveImage('downloads/[프린트스타]_085_17수_반팔_(남녀공용&아동용)/main_image.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2018/10/프린트스타-085-17수-반팔-남녀공용아동용_리스트_수정—수정.jpg'),
    detailImage: resolveImage('downloads/[프린트스타]_085_17수_반팔_(남녀공용&아동용)/detail_1.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2018/10/프린트스타-085-17수-반팔-남녀공용아동용_최종.jpg'),
    colors: ['화이트', '블랙'],
    sizes: [{'label': '아동-110', 'extraPrice': -1000}, {'label': '아동-120', 'extraPrice': -1000}, {'label': '아동-130', 'extraPrice': -1000}, {'label': '아동-140', 'extraPrice': -1000}, {'label': '아동-150', 'extraPrice': -1000}, {'label': '아동-160', 'extraPrice': 0}, {'label': 'S', 'extraPrice': 0}, {'label': 'M', 'extraPrice': 0}, {'label': 'L', 'extraPrice': 0}, {'label': 'XL', 'extraPrice': 0}, {'label': '2XL', 'extraPrice': 1000}, {'label': '3XL', 'extraPrice': 1000}],
    tags: ['반팔티셔츠', '아동/여성티셔츠', '프린트스타 Printstar'],
  },
  {
    id: 'p-003',
    name: '[프린트스타] 083 30수 반팔 (남녀공용&아동용)',
    category: '티셔츠',
    modelName: 'Printstar 083',
    price: 4900,
    originalPrice: null,
    priceText: formatPrice(
      4900
    ),
    url: 'https://www.customzone.co.kr/상품/printstar-bbt083-30tshirt/',
    mainImage: resolveImage('downloads/[프린트스타]_083_30수_반팔_(남녀공용&아동용)/main_image.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2019/01/프린트스타-083-30수-반팔-남녀공용_썸네일_최종.jpg'),
    detailImage: resolveImage('downloads/[프린트스타]_083_30수_반팔_(남녀공용&아동용)/detail_1.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2019/01/프린트스타-083-30수-반팔-남녀공용_수정.jpg'),
    colors: ['화이트', '블랙'],
    sizes: [{'label': '160', 'extraPrice': -1000}, {'label': 'S', 'extraPrice': 0}, {'label': 'M', 'extraPrice': 0}, {'label': 'L', 'extraPrice': 0}, {'label': 'XL', 'extraPrice': 0}, {'label': '2XL', 'extraPrice': 1000}],
    tags: ['반팔티셔츠', '아동/여성티셔츠', '프린트스타 Printstar'],
  },
  {
    id: 'p-004',
    name: '[길단] 2000 18수 US핏 반팔 (남녀공용)',
    category: '티셔츠',
    modelName: 'Gildan 2000',
    price: 7500,
    originalPrice: 8500,
    priceText: formatPrice(
      7500
    ),
    url: 'https://www.customzone.co.kr/상품/gildan-ts2000-usfit-tshirt/',
    mainImage: resolveImage('downloads/[길단]_2000_18수_US핏_반팔_(남녀공용)/main_image.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2018/10/리스트_길단_2000US반팔.jpg'),
    detailImage: resolveImage('downloads/[길단]_2000_18수_US핏_반팔_(남녀공용)/detail_1.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2018/10/길단-2000-18수-US핏-반팔-남녀공용.jpg'),
    colors: ['화이트', '블랙'],
    sizes: [{'label': 'S', 'extraPrice': 0}, {'label': 'M', 'extraPrice': 0}, {'label': 'L', 'extraPrice': 0}, {'label': 'XL', 'extraPrice': 0}, {'label': '2XL', 'extraPrice': 2000}, {'label': '3XL', 'extraPrice': 2000}, {'label': '4XL', 'extraPrice': 3000}, {'label': '5XL', 'extraPrice': 3000}],
    tags: ['반팔티셔츠', '길단 GILDAN'],
  },
  {
    id: 'p-005',
    name: '[길단] 76000 24수 반팔 (남녀공용)',
    category: '티셔츠',
    modelName: 'Gildan 76000',
    price: 5500,
    originalPrice: null,
    priceText: formatPrice(
      5500
    ),
    url: 'https://www.customzone.co.kr/상품/gildan-ts76000-24round-tshirt/',
    mainImage: resolveImage('downloads/[길단]_76000_24수_반팔_(남녀공용)/main_image.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2018/10/리스트_길단_76000-24수-반팔.jpg'),
    detailImage: resolveImage('downloads/[길단]_76000_24수_반팔_(남녀공용)/detail_1.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2018/10/길단-76000-24수-반팔-남녀공용_후.jpg'),
    colors: ['화이트', '블랙'],
    sizes: [{'label': 'XS', 'extraPrice': 0}, {'label': 'S', 'extraPrice': 0}, {'label': 'M', 'extraPrice': 0}, {'label': 'L', 'extraPrice': 0}, {'label': 'XL', 'extraPrice': 0}, {'label': '2XL', 'extraPrice': 2000}, {'label': '3XL', 'extraPrice': 2000}, {'label': '4XL', 'extraPrice': 3000}, {'label': '5XL', 'extraPrice': 3000}],
    tags: ['반팔티셔츠', '길단 GILDAN'],
  },
  {
    id: 'p-006',
    name: '[United Athle] UA 55001 (17수 하이퀄리티 반팔티셔츠)',
    category: '티셔츠',
    modelName: 'United Athle 55001',
    price: 7500,
    originalPrice: null,
    priceText: formatPrice(
      7500
    ),
    url: 'https://www.customzone.co.kr/상품/%ec%9c%a0%eb%82%98%ec%9d%b4%ed%8b%b0%eb%93%9c-%ec%95%a0%ec%8a%ac-ua-55001-17%ec%88%98-%ed%95%98%ec%9d%b4%ed%80%84%eb%a6%ac%ed%8b%b0-%eb%b0%98%ed%8c%94%ed%8b%b0%ec%85%94%ec%b8%a0/',
    mainImage: resolveImage('downloads/[United_Athle]_UA_55001_(17수_하이퀄리티_반팔티셔츠)/main_image.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2025/06/1_UA5500117수_하이퀄리티_반팔티셔츠_썸네일.jpg'),
    detailImage: resolveImage('downloads/[United_Athle]_UA_55001_(17수_하이퀄리티_반팔티셔츠)/detail_1.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2025/06/1_UA5500117수_하이퀄리티_반팔티셔츠_상세페이지.jpg'),
    colors: ['화이트', '블랙'],
    sizes: [{'label': 'S', 'extraPrice': 0}, {'label': 'M', 'extraPrice': 0}, {'label': 'L', 'extraPrice': 0}, {'label': 'XL', 'extraPrice': 0}, {'label': '2XL', 'extraPrice': 1500}, {'label': '3XL', 'extraPrice': 2000}],
    tags: ['유나이티드 애슬 UNITED ATHLE', '반팔티셔츠'],
  },
  {
    id: 'p-007',
    name: '[프린트스타] 188 헤비 후드 (남녀공용)',
    category: '후드',
    modelName: 'Printstar 188 Heavy Hoodie',
    price: 23500,
    originalPrice: 24500,
    priceText: formatPrice(
      23500
    ),
    url: 'https://www.customzone.co.kr/상품/%ed%94%84%eb%a6%b0%ed%8a%b8%ec%8a%a4%ed%83%80-188-%ed%97%a4%eb%b9%84-%ed%9b%84%eb%93%9c-%eb%82%a8%eb%85%80%ea%b3%b5%ec%9a%a9/',
    mainImage: resolveImage('downloads/[프린트스타]_188_헤비_후드_(남녀공용)/main_image.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2024/03/188-썸네일.jpg'),
    detailImage: resolveImage('downloads/[프린트스타]_188_헤비_후드_(남녀공용)/detail_1.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2024/03/6-프린트스타-188-헤비-후드-남녀공용_상세페이지.jpg'),
    colors: ['화이트', '블랙'],
    sizes: [{'label': 'S', 'extraPrice': 0}, {'label': 'M', 'extraPrice': 0}, {'label': 'L', 'extraPrice': 0}, {'label': 'XL', 'extraPrice': 0}, {'label': '2XL', 'extraPrice': 3500}, {'label': '3XL', 'extraPrice': 3500}, {'label': '4XL', 'extraPrice': 3500}],
    tags: ['후드', '프린트스타 Printstar'],
  },
  {
    id: 'p-008',
    name: '[프린트스타] 183 헤비 맨투맨 (남녀공용)',
    category: '맨투맨',
    modelName: 'Printstar 183 Heavy Sweatshirt',
    price: 17000,
    originalPrice: 18000,
    priceText: formatPrice(
      17000
    ),
    url: 'https://www.customzone.co.kr/상품/%ed%94%84%eb%a6%b0%ed%8a%b8%ec%8a%a4%ed%83%80-183-%ed%97%a4%eb%b9%84-%eb%a7%a8%ed%88%ac%eb%a7%a8-%eb%82%a8%eb%85%80%ea%b3%b5%ec%9a%a9/',
    mainImage: resolveImage('downloads/[프린트스타]_183_헤비_맨투맨_(남녀공용)/main_image.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2024/03/183-썸네일.jpg'),
    detailImage: resolveImage('downloads/[프린트스타]_183_헤비_맨투맨_(남녀공용)/detail_1.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2024/03/5-프린트스타-183-헤비-맨투맨-남녀공용_상세페이지.jpg'),
    colors: ['화이트', '블랙'],
    sizes: [{'label': 'S', 'extraPrice': 0}, {'label': 'M', 'extraPrice': 0}, {'label': 'L', 'extraPrice': 0}, {'label': 'XL', 'extraPrice': 0}, {'label': '2XL', 'extraPrice': 3500}, {'label': '3XL', 'extraPrice': 3500}, {'label': '4XL', 'extraPrice': 3500}],
    tags: ['맨투맨', '프린트스타 Printstar'],
  },
  {
    id: 'p-009',
    name: '캔버스 에코백(35X40)',
    category: '에코백',
    modelName: 'Canvas Eco Bag 35x40',
    price: 5500,
    originalPrice: null,
    priceText: formatPrice(
      5500
    ),
    url: 'https://www.customzone.co.kr/상품/cz-5000a-canvas-ivory-ecobag/',
    mainImage: resolveImage('downloads/캔버스_에코백(35X40)/main_image.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2018/07/에코백_아이보리_목록.jpg'),
    detailImage: resolveImage('downloads/캔버스_에코백(35X40)/detail_1.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2018/10/캔버스-에코백.jpg'),
    colors: ['화이트', '블랙'],
    sizes: [{'label': 'ONE SIZE', 'extraPrice': 0}],
    tags: ['에코백/파우치', '에코백'],
  },
];
