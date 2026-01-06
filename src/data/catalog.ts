import type { ImageSourcePropType } from 'react-native';
import { assetMap } from './catalogAssets';

export type SizeOption = {
  label: string;
  extraPrice: number;
};

export type CatalogProduct = {
  id: string;
  name: string;
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
  const asset = assetMap[localPath as keyof typeof assetMap];
  if (asset) return asset;
  return { uri: remoteUrl };
};

const formatPrice = (value: number | null) => {
  if (value == null) return '';
  return `₩${value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
};

export const catalogProducts: CatalogProduct[] = [
  {
    id: 'p-001',
    name: '[United Athle] UA 55928 (TC 기모 맨투맨)',
    price: 20000,
    originalPrice: null,
    priceText: formatPrice(
      20000
    ),
    url: 'https://www.customzone.co.kr/상품/united-athle-ua-55928-tc%ec%ae%b8%eb%a6%ac%ea%b8%b0%eb%aa%a8-%eb%a7%a8%ed%88%ac%eb%a7%a8/',
    mainImage: resolveImage('downloads/[United_Athle]_UA_55928_(TC_기모_맨투맨)/main_image.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2025/09/3_UA-55928-TC쮸리기모-맨투맨_썸네일.jpg'),
    detailImage: resolveImage('downloads/[United_Athle]_UA_55928_(TC_기모_맨투맨)/detail_1.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2025/09/3_UA-55928-TC쮸리기모-맨투맨.jpg'),
    colors: ['화이트', '헤자차콜', '네이비', '애쉬', '블랙'],
    sizes: [{'label': 'S', 'extraPrice': 0}, {'label': 'M', 'extraPrice': 0}, {'label': 'L', 'extraPrice': 0}, {'label': 'XL', 'extraPrice': 0}, {'label': '2XL', 'extraPrice': 3000}],
    tags: ['유나이티드 애슬 UNITED ATHLE', '맨투맨'],
  },
  {
    id: 'p-002',
    name: '[United Athle] UA 55620 (TC 기모 후드집업)',
    price: 27000,
    originalPrice: null,
    priceText: formatPrice(
      27000
    ),
    url: 'https://www.customzone.co.kr/상품/united-athle-ua-55620-tc%ec%ae%b8%eb%a6%ac%ea%b8%b0%eb%aa%a8-%ed%9b%84%eb%93%9c%ec%a7%91%ec%97%85/',
    mainImage: resolveImage('downloads/[United_Athle]_UA_55620_(TC_기모_후드집업)/main_image.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2025/09/2_UA-55620-TC쮸리기모-후드집업_썸네일.jpg'),
    detailImage: resolveImage('downloads/[United_Athle]_UA_55620_(TC_기모_후드집업)/detail_1.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2025/09/2_UA-55620-TC쮸리기모-후드집업.jpg'),
    colors: ['화이트', '헤자차콜', '네이비', '애쉬', '블랙'],
    sizes: [{'label': 'S', 'extraPrice': 0}, {'label': 'M', 'extraPrice': 0}, {'label': 'L', 'extraPrice': 0}, {'label': 'XL', 'extraPrice': 0}, {'label': '2XL', 'extraPrice': 4000}],
    tags: ['유나이티드 애슬 UNITED ATHLE', '후드집업'],
  },
  {
    id: 'p-003',
    name: '[United Athle] UA 55618 (TC 기모 후드)',
    price: 24000,
    originalPrice: null,
    priceText: formatPrice(
      24000
    ),
    url: 'https://www.customzone.co.kr/상품/united-athle-ua-55618-tc%ec%ae%b8%eb%a6%ac%ea%b8%b0%eb%aa%a8-%ed%9b%84%eb%93%9c/',
    mainImage: resolveImage('downloads/[United_Athle]_UA_55618_(TC_기모_후드)/main_image.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2025/09/1_UA-55618-TC쮸리기모-후드_썸네일.jpg'),
    detailImage: resolveImage('downloads/[United_Athle]_UA_55618_(TC_기모_후드)/detail_1.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2025/09/1_UA-55618-TC쮸리기모-후드.jpg'),
    colors: ['화이트', '헤자차콜', '네이비', '애쉬', '블랙'],
    sizes: [{'label': 'S', 'extraPrice': 0}, {'label': 'M', 'extraPrice': 0}, {'label': 'L', 'extraPrice': 0}, {'label': 'XL', 'extraPrice': 0}, {'label': '2XL', 'extraPrice': 4000}],
    tags: ['유나이티드 애슬 UNITED ATHLE', '후드'],
  },
  {
    id: 'p-004',
    name: '[United Athle] UA 55001 (17수 하이퀄리티 반팔티셔츠)',
    price: 7500,
    originalPrice: null,
    priceText: formatPrice(
      7500
    ),
    url: 'https://www.customzone.co.kr/상품/%ec%9c%a0%eb%82%98%ec%9d%b4%ed%8b%b0%eb%93%9c-%ec%95%a0%ec%8a%ac-ua-55001-17%ec%88%98-%ed%95%98%ec%9d%b4%ed%80%84%eb%a6%ac%ed%8b%b0-%eb%b0%98%ed%8c%94%ed%8b%b0%ec%85%94%ec%b8%a0/',
    mainImage: resolveImage('downloads/[United_Athle]_UA_55001_(17수_하이퀄리티_반팔티셔츠)/main_image.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2025/06/1_UA5500117수_하이퀄리티_반팔티셔츠_썸네일.jpg'),
    detailImage: resolveImage('downloads/[United_Athle]_UA_55001_(17수_하이퀄리티_반팔티셔츠)/detail_1.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2025/06/1_UA5500117수_하이퀄리티_반팔티셔츠_상세페이지.jpg'),
    colors: ['화이트', '바닐라', '애쉬', '라이트그레이', '멜란지그레이', '샌드베이지', '샌드카키', '다크브라운', '버건디', '레드', '트로피컬핑크', '핑크', '라이트핑크', '오렌지', '골드', '커네리옐로우', '라이트옐로우', '민트그린', '그린', '아이비그린', '라이트올리브', '시티그린', '라이트블루', '터코이즈블루', '애쉬드블루', '로열블루', '인디고', '네이비', '라이트피플', '퍼플', '차콜', '다크차콜', '블랙', '헤이지그린', '헤이지네이비', '헤이지블랙'],
    sizes: [{'label': 'S', 'extraPrice': 0}, {'label': 'M', 'extraPrice': 0}, {'label': 'L', 'extraPrice': 0}, {'label': 'XL', 'extraPrice': 0}, {'label': '2XL', 'extraPrice': 1500}, {'label': '3XL', 'extraPrice': 2000}],
    tags: ['유나이티드 애슬 UNITED ATHLE', '반팔티셔츠'],
  },
  {
    id: 'p-005',
    name: '[United Athle] UA 55508 (17수 OVERFIT 반팔티셔츠)',
    price: 9500,
    originalPrice: null,
    priceText: formatPrice(
      9500
    ),
    url: 'https://www.customzone.co.kr/상품/%ec%9c%a0%eb%82%98%ec%9d%b4%ed%8b%b0%eb%93%9c-%ec%95%a0%ec%8a%ac-ua-55508-17%ec%88%98-overfit-%eb%b0%98%ed%8c%94%ed%8b%b0%ec%85%94%ec%b8%a0/',
    mainImage: resolveImage('downloads/[United_Athle]_UA_55508_(17수_OVERFIT_반팔티셔츠)/main_image.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2025/06/2_UA5550817수_OVERFIT_반팔티셔츠_썸네일.jpg'),
    detailImage: resolveImage('downloads/[United_Athle]_UA_55508_(17수_OVERFIT_반팔티셔츠)/detail_1.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2025/06/2_UA5550817수_OVERFIT_반팔티셔츠_상세페이지.jpg'),
    colors: ['화이트', '샌드베이지', '애쉬드블루', '네이비', '블랙'],
    sizes: [{'label': 'S', 'extraPrice': 0}, {'label': 'M', 'extraPrice': 0}, {'label': 'L', 'extraPrice': 0}, {'label': 'XL', 'extraPrice': 0}],
    tags: ['유나이티드 애슬 UNITED ATHLE', '반팔티셔츠'],
  },
  {
    id: 'p-006',
    name: '[United Athle] UA 54411 (헤비웨이트 반팔티셔츠)',
    price: 14000,
    originalPrice: null,
    priceText: formatPrice(
      14000
    ),
    url: 'https://www.customzone.co.kr/상품/%ec%9c%a0%eb%82%98%ec%9d%b4%ed%8b%b0%eb%93%9c-%ec%95%a0%ec%8a%ac-ua-54411-%ed%97%a4%eb%b9%84%ec%9b%a8%ec%9d%b4%ed%8a%b8-%eb%b0%98%ed%8c%94%ed%8b%b0%ec%85%94%ec%b8%a0/',
    mainImage: resolveImage('downloads/[United_Athle]_UA_54411_(헤비웨이트_반팔티셔츠)/main_image.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2025/06/3_UA54411헤비웨이트_반팔티셔츠_썸네일.jpg'),
    detailImage: resolveImage('downloads/[United_Athle]_UA_54411_(헤비웨이트_반팔티셔츠)/detail_1.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2025/06/3_UA54411헤비웨이트_반팔티셔츠_상세페이지.jpg'),
    colors: ['화이트', '빈티지네츄럴', '다크차콜', '블랙'],
    sizes: [{'label': 'M', 'extraPrice': 0}, {'label': 'L', 'extraPrice': 0}, {'label': 'XL', 'extraPrice': 0}],
    tags: ['유나이티드 애슬 UNITED ATHLE', '반팔티셔츠'],
  },
  {
    id: 'p-007',
    name: '[United Athle] UA 55982 (BASEBALL BUTTON JERSEY)',
    price: 14000,
    originalPrice: null,
    priceText: formatPrice(
      14000
    ),
    url: 'https://www.customzone.co.kr/상품/%ec%9c%a0%eb%82%98%ec%9d%b4%ed%8b%b0%eb%93%9c-%ec%95%a0%ec%8a%ac-ua-55982-baseball-button-jersey/',
    mainImage: resolveImage('downloads/[United_Athle]_UA_55982_(BASEBALL_BUTTON_JERSEY)/main_image.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2025/06/4_UA55982BASEBALL_BUTTON_JERSEY_썸네일.jpg'),
    detailImage: resolveImage('downloads/[United_Athle]_UA_55982_(BASEBALL_BUTTON_JERSEY)/detail_1.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2025/06/4_UA55982BASEBALL_BUTTON_JERSEY_상세페이지.jpg'),
    colors: ['화이트/블랙', '버건디/화이트', '레드/블랙', '트로피컬핑크/화이트', '아이비그린/화이트', '마린블루/화이트', '네이비/화이트', '블랙/화이트'],
    sizes: [{'label': 'S', 'extraPrice': 0}, {'label': 'M', 'extraPrice': 0}, {'label': 'L', 'extraPrice': 0}, {'label': 'XL', 'extraPrice': 0}],
    tags: ['유나이티드 애슬 UNITED ATHLE', '반팔티셔츠'],
  },
  {
    id: 'p-008',
    name: '캔버스 에코백(35X40)',
    price: 5500,
    originalPrice: null,
    priceText: formatPrice(
      5500
    ),
    url: 'https://www.customzone.co.kr/상품/cz-5000a-canvas-ivory-ecobag/',
    mainImage: resolveImage('downloads/캔버스_에코백(35X40)/main_image.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2018/07/에코백_아이보리_목록.jpg'),
    detailImage: resolveImage('downloads/캔버스_에코백(35X40)/detail_1.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2018/10/캔버스-에코백.jpg'),
    colors: ['아이보리', '블랙'],
    sizes: [{'label': 'ONE SIZE', 'extraPrice': 0}],
    tags: ['에코백/파우치', '에코백'],
  },
  {
    id: 'p-009',
    name: '[United Athle] UA 55927 (DRY LOOSE FIT V-NECK)',
    price: 9000,
    originalPrice: null,
    priceText: formatPrice(
      9000
    ),
    url: 'https://www.customzone.co.kr/상품/%ec%9c%a0%eb%82%98%ec%9d%b4%ed%8b%b0%eb%93%9c-%ec%95%a0%ec%8a%ac-ua-55927-dry-loose-fit-v-neck/',
    mainImage: resolveImage('downloads/[United_Athle]_UA_55927_(DRY_LOOSE_FIT_V-NECK)/main_image.gif', 'https://www.customzone.co.kr/wp-content/uploads/2025/06/5_UA_55927DRYLOOSEFITV-NECK_썸네일.gif'),
    detailImage: resolveImage('downloads/[United_Athle]_UA_55927_(DRY_LOOSE_FIT_V-NECK)/detail_1.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2025/06/5_UA_55927DRYLOOSEFITV-NECK_상세페이지.jpg'),
    colors: ['화이트/화이트/블랙', '레드/화이트/블랙', '블랙/화이트/블랙'],
    sizes: [{'label': 'M', 'extraPrice': 0}, {'label': 'L', 'extraPrice': 0}, {'label': 'XL', 'extraPrice': 0}],
    tags: ['유나이티드 애슬 UNITED ATHLE', '반팔티셔츠'],
  },
  {
    id: 'p-010',
    name: '캔버스 에코백(30X30)',
    price: 3500,
    originalPrice: null,
    priceText: formatPrice(
      3500
    ),
    url: 'https://www.customzone.co.kr/상품/%ec%ba%94%eb%b2%84%ec%8a%a4-%ec%97%90%ec%bd%94%eb%b0%b1/',
    mainImage: resolveImage('downloads/캔버스_에코백(30X30)/main_image.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2025/07/캔버스_메인.jpg'),
    detailImage: resolveImage('downloads/캔버스_에코백(30X30)/detail_1.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2025/07/250701_캔버스에코백.jpg'),
    colors: ['아이보리'],
    sizes: [{'label': 'ONE SIZE', 'extraPrice': 0}],
    tags: ['에코백/파우치', '에코백'],
  },
  {
    id: 'p-011',
    name: '[United Athle] UA 55992 (DRY LOOSE FIT TANKTOP)',
    price: 9900,
    originalPrice: null,
    priceText: formatPrice(
      9900
    ),
    url: 'https://www.customzone.co.kr/상품/%ec%9c%a0%eb%82%98%ec%9d%b4%ed%8b%b0%eb%93%9c-%ec%95%a0%ec%8a%ac-ua-55992-dry-loose-fit-tanktop/',
    mainImage: resolveImage('downloads/[United_Athle]_UA_55992_(DRY_LOOSE_FIT_TANKTOP)/main_image.gif', 'https://www.customzone.co.kr/wp-content/uploads/2025/06/6_UA55992DRYLOOSEFITTANKTOP_썸네일.gif'),
    detailImage: resolveImage('downloads/[United_Athle]_UA_55992_(DRY_LOOSE_FIT_TANKTOP)/detail_1.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2025/06/6_UA55992DRYLOOSEFITTANKTOP_상세페이지.jpg'),
    colors: ['화이트/화이트/레드', '레드/화이트/레드', '블랙/화이트/블랙'],
    sizes: [{'label': 'M', 'extraPrice': 0}, {'label': 'L', 'extraPrice': 0}, {'label': 'XL', 'extraPrice': 0}],
    tags: ['유나이티드 애슬 UNITED ATHLE', '반팔티셔츠'],
  },
  {
    id: 'p-012',
    name: '[United Athle] UA 55010 (LONG SLEEVE)',
    price: 11000,
    originalPrice: null,
    priceText: formatPrice(
      11000
    ),
    url: 'https://www.customzone.co.kr/상품/%ec%9c%a0%eb%82%98%ec%9d%b4%ed%8b%b0%eb%93%9c-%ec%95%a0%ec%8a%ac-ua-55010-long-sleeve/',
    mainImage: resolveImage('downloads/[United_Athle]_UA_55010_(LONG_SLEEVE)/main_image.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2025/06/7_UA_55010LONGSLEEVE_썸네일.jpg'),
    detailImage: resolveImage('downloads/[United_Athle]_UA_55010_(LONG_SLEEVE)/detail_1.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2025/06/7_UA_55010LONGSLEEVE_상세페이지.jpg'),
    colors: ['화이트', '멜란지그레이', '블랙', '네이비'],
    sizes: [{'label': 'S', 'extraPrice': 0}, {'label': 'M', 'extraPrice': 0}, {'label': 'L', 'extraPrice': 0}, {'label': 'XL', 'extraPrice': 0}, {'label': '2XL', 'extraPrice': 2000}],
    tags: ['유나이티드 애슬 UNITED ATHLE', '긴팔티셔츠'],
  },
  {
    id: 'p-013',
    name: '[United Athle] UA 55011 (LONG SLEEVE LIP)',
    price: 11500,
    originalPrice: null,
    priceText: formatPrice(
      11500
    ),
    url: 'https://www.customzone.co.kr/상품/%ec%9c%a0%eb%82%98%ec%9d%b4%ed%8b%b0%eb%93%9c-%ec%95%a0%ec%8a%ac-ua-55011-long-sleeve-lip/',
    mainImage: resolveImage('downloads/[United_Athle]_UA_55011_(LONG_SLEEVE_LIP)/main_image.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2025/06/8_UA_55011LONGSLEEVELIP_썸네일.jpg'),
    detailImage: resolveImage('downloads/[United_Athle]_UA_55011_(LONG_SLEEVE_LIP)/detail_1.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2025/06/8_UA_55011LONGSLEEVELIP_상세페이지.jpg'),
    colors: ['화이트', '애쉬', '네이비', '블랙'],
    sizes: [{'label': 'S', 'extraPrice': 0}, {'label': 'M', 'extraPrice': 0}, {'label': 'L', 'extraPrice': 0}, {'label': 'XL', 'extraPrice': 0}, {'label': '2XL', 'extraPrice': 2000}],
    tags: ['유나이티드 애슬 UNITED ATHLE', '긴팔티셔츠'],
  },
  {
    id: 'p-014',
    name: '[United Athle] UA 55509 (BIG LONG SLEEVE LIP)',
    price: 14500,
    originalPrice: null,
    priceText: formatPrice(
      14500
    ),
    url: 'https://www.customzone.co.kr/상품/%ec%9c%a0%eb%82%98%ec%9d%b4%ed%8b%b0%eb%93%9c-%ec%95%a0%ec%8a%ac-ua-55509-big-long-sleeve-lip/',
    mainImage: resolveImage('downloads/[United_Athle]_UA_55509_(BIG_LONG_SLEEVE_LIP)/main_image.gif', 'https://www.customzone.co.kr/wp-content/uploads/2025/06/9_UA_55509BIGLONGSLEEVELIP_썸네일.gif'),
    detailImage: resolveImage('downloads/[United_Athle]_UA_55509_(BIG_LONG_SLEEVE_LIP)/detail_1.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2025/06/9_UA_55509BIGLONGSLEEVELIP_상세페이지.jpg'),
    colors: ['화이트', '블랙'],
    sizes: [{'label': 'S', 'extraPrice': 0}, {'label': 'M', 'extraPrice': 0}, {'label': 'L', 'extraPrice': 0}, {'label': 'XL', 'extraPrice': 0}],
    tags: ['유나이티드 애슬 UNITED ATHLE', '긴팔티셔츠'],
  },
  {
    id: 'p-015',
    name: '[United Athle] UA 55214 (헤비웨이트 쭈리 HOODY)',
    price: 25000,
    originalPrice: null,
    priceText: formatPrice(
      25000
    ),
    url: 'https://www.customzone.co.kr/상품/%ec%9c%a0%eb%82%98%ec%9d%b4%ed%8b%b0%eb%93%9c-%ec%95%a0%ec%8a%ac-ua-55214-%ed%97%a4%eb%b9%84%ec%9b%a8%ec%9d%b4%ed%8a%b8-hoody/',
    mainImage: resolveImage('downloads/[United_Athle]_UA_55214_(헤비웨이트_쭈리_HOODY)/main_image.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2025/06/10_UA_55214헤비웨이트HOODY_썸네일.jpg'),
    detailImage: resolveImage('downloads/[United_Athle]_UA_55214_(헤비웨이트_쭈리_HOODY)/detail_1.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2025/06/10_UA_55214헤비웨이트HOODY_상세페이지.jpg'),
    colors: ['화이트', '멜란지그레이', '네이비', '블랙'],
    sizes: [{'label': 'S', 'extraPrice': 0}, {'label': 'M', 'extraPrice': 0}, {'label': 'L', 'extraPrice': 0}, {'label': 'XL', 'extraPrice': 0}, {'label': '2XL', 'extraPrice': 4000}, {'label': '3XL', 'extraPrice': 6000}],
    tags: ['유나이티드 애슬 UNITED ATHLE', '후드'],
  },
  {
    id: 'p-016',
    name: '[United Athle] US 55044 (헤비웨이트 쭈리 맨투맨)',
    price: 19000,
    originalPrice: null,
    priceText: formatPrice(
      19000
    ),
    url: 'https://www.customzone.co.kr/상품/%ec%9c%a0%eb%82%98%ec%9d%b4%ed%8b%b0%eb%93%9c-%ec%95%a0%ec%8a%ac-us-55044-%ed%97%a4%eb%b9%84%ec%9b%a8%ec%9d%b4%ed%8a%b8-mtm/',
    mainImage: resolveImage('downloads/[United_Athle]_US_55044_(헤비웨이트_쭈리_맨투맨)/main_image.gif', 'https://www.customzone.co.kr/wp-content/uploads/2025/06/11_US_55044헤비웨이트MTM_썸네일.gif'),
    detailImage: resolveImage('downloads/[United_Athle]_US_55044_(헤비웨이트_쭈리_맨투맨)/detail_1.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2025/06/11_US_55044헤비웨이트MTM_상세페이지.jpg'),
    colors: ['화이트', '멜란지그레이', '네이비', '블랙'],
    sizes: [{'label': 'S', 'extraPrice': 0}, {'label': 'M', 'extraPrice': 0}, {'label': 'L', 'extraPrice': 0}, {'label': 'XL', 'extraPrice': 0}, {'label': '2XL', 'extraPrice': 3000}, {'label': '3XL', 'extraPrice': 4000}],
    tags: ['유나이티드 애슬 UNITED ATHLE', '맨투맨'],
  },
  {
    id: 'p-017',
    name: '[United Athle] UA 55213 (헤비웨이트 쭈리 ZIPUP)',
    price: 28000,
    originalPrice: 29500,
    priceText: formatPrice(
      28000
    ),
    url: 'https://www.customzone.co.kr/상품/%ec%9c%a0%eb%82%98%ec%9d%b4%ed%8b%b0%eb%93%9c-%ec%95%a0%ec%8a%ac-ua-55213-%ed%97%a4%eb%b9%84%ec%9b%a8%ec%9d%b4%ed%8a%b8-zipup-hoody/',
    mainImage: resolveImage('downloads/[United_Athle]_UA_55213_(헤비웨이트_쭈리_ZIPUP)/main_image.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2025/06/12_UA_55213헤비웨이트ZIPUPHOODY_썸네일.jpg'),
    detailImage: resolveImage('downloads/[United_Athle]_UA_55213_(헤비웨이트_쭈리_ZIPUP)/detail_1.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2025/06/12_UA_55213헤비웨이트ZIPUPHOODY_상세페이지.jpg'),
    colors: ['화이트', '멜란지그레이', '네이비', '블랙'],
    sizes: [{'label': 'S', 'extraPrice': 0}, {'label': 'M', 'extraPrice': 0}, {'label': 'L', 'extraPrice': 0}, {'label': 'XL', 'extraPrice': 0}, {'label': '2XL', 'extraPrice': 4500}, {'label': '3XL', 'extraPrice': 7000}],
    tags: ['유나이티드 애슬 UNITED ATHLE', '후드집업'],
  },
  {
    id: 'p-018',
    name: '[United Athle] UA 55204 (헤비웨이트 BIG HOODY)',
    price: 30000,
    originalPrice: 34000,
    priceText: formatPrice(
      30000
    ),
    url: 'https://www.customzone.co.kr/상품/%ec%9c%a0%eb%82%98%ec%9d%b4%ed%8b%b0%eb%93%9c-%ec%95%a0%ec%8a%ac-ua-55204-%ed%97%a4%eb%b9%84%ec%9b%a8%ec%9d%b4%ed%8a%b8-big-hoody/',
    mainImage: resolveImage('downloads/[United_Athle]_UA_55204_(헤비웨이트_BIG_HOODY)/main_image.gif', 'https://www.customzone.co.kr/wp-content/uploads/2025/06/13_UA_55204헤비웨이트BIGHOODY_썸네일.gif'),
    detailImage: resolveImage('downloads/[United_Athle]_UA_55204_(헤비웨이트_BIG_HOODY)/detail_1.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2025/06/13_UA_55204헤비웨이트BIGHOODY_상세페이지.jpg'),
    colors: ['화이트', '애쉬', '블랙'],
    sizes: [{'label': 'S', 'extraPrice': 0}, {'label': 'M', 'extraPrice': 0}, {'label': 'L', 'extraPrice': 0}, {'label': 'XL', 'extraPrice': 0}],
    tags: ['유나이티드 애슬 UNITED ATHLE', '후드'],
  },
  {
    id: 'p-019',
    name: '[United Athle] UA 55205 (헤비웨이트 BIG MTM)',
    price: 23000,
    originalPrice: 24500,
    priceText: formatPrice(
      23000
    ),
    url: 'https://www.customzone.co.kr/상품/%ec%9c%a0%eb%82%98%ec%9d%b4%ed%8b%b0%eb%93%9c-%ec%95%a0%ec%8a%ac-ua-55205-%ed%97%a4%eb%b9%84%ec%9b%a8%ec%9d%b4%ed%8a%b8-big-mtm/',
    mainImage: resolveImage('downloads/[United_Athle]_UA_55205_(헤비웨이트_BIG_MTM)/main_image.gif', 'https://www.customzone.co.kr/wp-content/uploads/2025/06/14_UA_55205헤비웨이트BIGMTM_썸네일.gif'),
    detailImage: resolveImage('downloads/[United_Athle]_UA_55205_(헤비웨이트_BIG_MTM)/detail_1.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2025/06/14_UA_55205헤비웨이트BIGMTM_상세페이지.jpg'),
    colors: ['화이트', '애쉬', '블랙'],
    sizes: [{'label': 'S', 'extraPrice': 0}, {'label': 'M', 'extraPrice': 0}, {'label': 'L', 'extraPrice': 0}, {'label': 'XL', 'extraPrice': 0}],
    tags: ['유나이티드 애슬 UNITED ATHLE', '맨투맨'],
  },
  {
    id: 'p-020',
    name: '[프린트스타] 272 오버핏 기모 후드 (남녀공용)',
    price: 18000,
    originalPrice: 19000,
    priceText: formatPrice(
      18000
    ),
    url: 'https://www.customzone.co.kr/상품/%ed%94%84%eb%a6%b0%ed%8a%b8%ec%8a%a4%ed%83%80-272-%ea%b8%b0%eb%aa%a8-%ed%9b%84%eb%93%9c-%eb%82%a8%eb%85%80%ea%b3%b5%ec%9a%a9/',
    mainImage: resolveImage('downloads/[프린트스타]_272_오버핏_기모_후드_(남녀공용)/main_image.gif', 'https://www.customzone.co.kr/wp-content/uploads/2025/02/2025_메인_등록이미지_틀_271_기모후드.gif'),
    detailImage: resolveImage('downloads/[프린트스타]_272_오버핏_기모_후드_(남녀공용)/detail_1.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2025/02/2025_2_프린트스타_272_기모후드.jpg'),
    colors: ['화이트', '모쿠그레이', '블랙', '네이비', '아미그린', '차콜'],
    sizes: [{'label': 'S', 'extraPrice': 0}, {'label': 'M', 'extraPrice': 0}, {'label': 'L', 'extraPrice': 0}, {'label': 'XL', 'extraPrice': 0}, {'label': '2XL', 'extraPrice': 1000}, {'label': '3XL', 'extraPrice': 1000}, {'label': '4XL', 'extraPrice': 1000}],
    tags: ['후드', '프린트스타 Printstar'],
  },
  {
    id: 'p-021',
    name: '[프린트스타] 273 오버핏 기모 후드집업 (남녀공용)',
    price: 21000,
    originalPrice: 23000,
    priceText: formatPrice(
      21000
    ),
    url: 'https://www.customzone.co.kr/상품/%ed%94%84%eb%a6%b0%ed%8a%b8%ec%8a%a4%ed%83%80-273-%ea%b8%b0%eb%aa%a8-%ed%9b%84%eb%93%9c%ec%a7%91%ec%97%85-%eb%82%a8%eb%85%80%ea%b3%b5%ec%9a%a9/',
    mainImage: resolveImage('downloads/[프린트스타]_273_오버핏_기모_후드집업_(남녀공용)/main_image.gif', 'https://www.customzone.co.kr/wp-content/uploads/2025/01/2025_메인_등록이미지_틀_273_기모후드집업.gif'),
    detailImage: resolveImage('downloads/[프린트스타]_273_오버핏_기모_후드집업_(남녀공용)/detail_1.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2025/01/2025_3_프린트스타_273_기모후드집업.jpg'),
    colors: ['화이트', '모쿠그레이', '블랙', '네이비', '아미그린', '차콜'],
    sizes: [{'label': 'S', 'extraPrice': 0}, {'label': 'M', 'extraPrice': 0}, {'label': 'L', 'extraPrice': 0}, {'label': 'XL', 'extraPrice': 0}, {'label': '2XL', 'extraPrice': 1000}, {'label': '3XL', 'extraPrice': 1000}, {'label': '4XL', 'extraPrice': 1000}],
    tags: ['후드집업', '프린트스타 Printstar'],
  },
  {
    id: 'p-022',
    name: '[프린트스타] 271 오버핏 기모 맨투맨 (남녀공용)',
    price: 15000,
    originalPrice: null,
    priceText: formatPrice(
      15000
    ),
    url: 'https://www.customzone.co.kr/상품/%ed%94%84%eb%a6%b0%ed%8a%b8%ec%8a%a4%ed%83%80-271-%ea%b8%b0%eb%aa%a8-%eb%a7%a8%ed%88%ac%eb%a7%a8-%eb%82%a8%eb%85%80%ea%b3%b5%ec%9a%a9/',
    mainImage: resolveImage('downloads/[프린트스타]_271_오버핏_기모_맨투맨_(남녀공용)/main_image.gif', 'https://www.customzone.co.kr/wp-content/uploads/2025/01/2025_메인_등록이미지_틀_271_기모맨투맨.gif'),
    detailImage: resolveImage('downloads/[프린트스타]_271_오버핏_기모_맨투맨_(남녀공용)/detail_1.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2025/01/2025_1_프린트스타_271_기모맨투맨.jpg'),
    colors: ['화이트', '모쿠그레이', '블랙', '네이비', '아미그린', '차콜'],
    sizes: [{'label': 'S', 'extraPrice': 0}, {'label': 'M', 'extraPrice': 0}, {'label': 'L', 'extraPrice': 0}, {'label': 'XL', 'extraPrice': 0}, {'label': '2XL', 'extraPrice': 1000}, {'label': '3XL', 'extraPrice': 1000}, {'label': '4XL', 'extraPrice': 1000}],
    tags: ['맨투맨', '프린트스타 Printstar'],
  },
  {
    id: 'p-023',
    name: '[프린트스타] 085 17수 반팔 (남녀공용&아동용)',
    price: 6500,
    originalPrice: 6900,
    priceText: formatPrice(
      6500
    ),
    url: 'https://www.customzone.co.kr/상품/printstar-cvt085-17tshirt/',
    mainImage: resolveImage('downloads/[프린트스타]_085_17수_반팔_(남녀공용&아동용)/main_image.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2018/10/프린트스타-085-17수-반팔-남녀공용아동용_리스트_수정—수정.jpg'),
    detailImage: resolveImage('downloads/[프린트스타]_085_17수_반팔_(남녀공용&아동용)/detail_1.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2018/10/프린트스타-085-17수-반팔-남녀공용아동용_최종.jpg'),
    colors: ['화이트', '모쿠그레이', '올리브', '버건디', '블랙', '데이지', '오렌지', '핑크', '핫핑크', '레드', '라이트블루', '타코이즈', '로얄블루', '네이비', '퍼플', '그린', '아이보리', '애쉬', '라이트핑크', '실버그레이', '챠콜', '라이트퍼플', '라이트옐로우', '아이스그린', '아미그린', '인디고'],
    sizes: [{'label': '아동-110', 'extraPrice': -1000}, {'label': '아동-120', 'extraPrice': -1000}, {'label': '아동-130', 'extraPrice': -1000}, {'label': '아동-140', 'extraPrice': -1000}, {'label': '아동-150', 'extraPrice': -1000}, {'label': '아동-160', 'extraPrice': 0}, {'label': 'S', 'extraPrice': 0}, {'label': 'M', 'extraPrice': 0}, {'label': 'L', 'extraPrice': 0}, {'label': 'XL', 'extraPrice': 0}, {'label': '2XL', 'extraPrice': 1000}, {'label': '3XL', 'extraPrice': 1000}],
    tags: ['반팔티셔츠', '아동/여성티셔츠', '프린트스타 Printstar'],
  },
  {
    id: 'p-024',
    name: '[AAA/Amerian Apparel] 1301 18수 반팔 (남녀공용)',
    price: 7500,
    originalPrice: null,
    priceText: formatPrice(
      7500
    ),
    url: 'https://www.customzone.co.kr/상품/aaa-1301-18round-tshirt/',
    mainImage: resolveImage('downloads/[AAAAmerian_Apparel]_1301_18수_반팔_(남녀공용)/main_image.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2018/10/AAA1301_상품목록B.jpg'),
    detailImage: resolveImage('downloads/[AAAAmerian_Apparel]_1301_18수_반팔_(남녀공용)/detail_1.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2024/03/0602_커스텀존_수정.jpg'),
    colors: ['화이트', '블랙', '애쉬', '애틀레틱헤더', '챠콜헤더', '네이비', '버건디', '포레스트그린', '샌드', '챠콜', '밀리터리그린', '크림', '핑크', '파우더블루', '셀라돈', '카디날', '옐로우', '로얄블루', '레드', '오렌지', '세이프티그린', '터코이즈'],
    sizes: [{'label': 'S', 'extraPrice': 0}, {'label': 'M', 'extraPrice': 0}, {'label': 'L', 'extraPrice': 0}, {'label': 'XL', 'extraPrice': 0}, {'label': '2XL', 'extraPrice': 3000}, {'label': '3XL', 'extraPrice': 4000}],
    tags: ['반팔티셔츠', '트리플에이 AAA'],
  },
  {
    id: 'p-025',
    name: '[Fill It] 시그니쳐 라운드 티셔츠 (남녀공용&아동용)',
    price: 12000,
    originalPrice: null,
    priceText: formatPrice(
      12000
    ),
    url: 'https://www.customzone.co.kr/상품/fillit-signature-round-tshirt/',
    mainImage: resolveImage('downloads/[Fill_It]_시그니쳐_라운드_티셔츠_(남녀공용&아동용)/main_image.gif', 'https://www.customzone.co.kr/wp-content/uploads/2019/01/필잇_시그니쳐라운드티_상품목록B.gif'),
    detailImage: resolveImage('downloads/[Fill_It]_시그니쳐_라운드_티셔츠_(남녀공용&아동용)/detail_1.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2019/01/Fill-It-시그니쳐-라운드-티셔츠-남녀공용.jpg'),
    colors: ['화이트', '먹색', '네이비', '블랙', '카멜', '수박', '코발트', '크림', '챠콜', '핑크', '퍼플'],
    sizes: [{'label': '120', 'extraPrice': -500}, {'label': '130', 'extraPrice': -500}, {'label': '140', 'extraPrice': -500}, {'label': '150', 'extraPrice': -500}, {'label': '160', 'extraPrice': -500}, {'label': 'S', 'extraPrice': 0}, {'label': 'M', 'extraPrice': 0}, {'label': 'L', 'extraPrice': 0}, {'label': 'XL', 'extraPrice': 0}, {'label': '2XL', 'extraPrice': 0}, {'label': '3XL', 'extraPrice': 1000}, {'label': '4XL', 'extraPrice': 2000}, {'label': '5XL', 'extraPrice': 3000}, {'label': '6XL', 'extraPrice': 4000}],
    tags: ['반팔티셔츠', '아동/여성티셔츠', '필잇 FILL IT'],
  },
  {
    id: 'p-026',
    name: '[길단] 2000 18수 US핏 반팔 (남녀공용)',
    price: 7500,
    originalPrice: 8500,
    priceText: formatPrice(
      7500
    ),
    url: 'https://www.customzone.co.kr/상품/gildan-ts2000-usfit-tshirt/',
    mainImage: resolveImage('downloads/[길단]_2000_18수_US핏_반팔_(남녀공용)/main_image.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2018/10/리스트_길단_2000US반팔.jpg'),
    detailImage: resolveImage('downloads/[길단]_2000_18수_US핏_반팔_(남녀공용)/detail_1.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2018/10/길단-2000-18수-US핏-반팔-남녀공용.jpg'),
    colors: ['화이트', '스포트그레이', '카디널레드', '챠콜그레이', '네이비', '블랙', '에쉬그레이', '샌드', '라이트핑크', '라이트블루', '사파이어', '로얄블루', '갈라파고스블루', '골드', '데이지', '마룬', '포레스트그린', '다크헤더', '체스트넛', '레드', '오렌지', '켈리그린', '퍼플'],
    sizes: [{'label': 'S', 'extraPrice': 0}, {'label': 'M', 'extraPrice': 0}, {'label': 'L', 'extraPrice': 0}, {'label': 'XL', 'extraPrice': 0}, {'label': '2XL', 'extraPrice': 2000}, {'label': '3XL', 'extraPrice': 2000}, {'label': '4XL', 'extraPrice': 3000}, {'label': '5XL', 'extraPrice': 3000}],
    tags: ['반팔티셔츠', '길단 GILDAN'],
  },
  {
    id: 'p-027',
    name: '[페플] 더블코튼 반팔',
    price: 17000,
    originalPrice: null,
    priceText: formatPrice(
      17000
    ),
    url: 'https://www.customzone.co.kr/상품/fp01dct/',
    mainImage: resolveImage('downloads/[페플]_더블코튼_반팔/main_image.gif', 'https://www.customzone.co.kr/wp-content/uploads/2020/04/페플_더블코튼반팔티_썸네일_수정.gif'),
    detailImage: resolveImage('downloads/[페플]_더블코튼_반팔/detail_1.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2020/04/페플_더블코튼반팔_상세페이지_최종_사이즈수정.jpg'),
    colors: ['흰색', '회색', '검정', '곤색', '딥그린', '민트그레이', '주황색', '차콜'],
    sizes: [{'label': 'M', 'extraPrice': 0}, {'label': 'L', 'extraPrice': 0}, {'label': 'XL', 'extraPrice': 0}, {'label': '2XL', 'extraPrice': 0}],
    tags: ['반팔티셔츠', '페플 FP142'],
  },
  {
    id: 'p-028',
    name: '[챔피온] T425 반팔 (남녀공용)',
    price: 11000,
    originalPrice: null,
    priceText: formatPrice(
      11000
    ),
    url: 'https://www.customzone.co.kr/상품/champion-t425-round-tshirt/',
    mainImage: resolveImage('downloads/[챔피온]_T425_반팔_(남녀공용)/main_image.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2018/10/챔피언_425반팔_상품목록B.jpg'),
    detailImage: resolveImage('downloads/[챔피온]_T425_반팔_(남녀공용)/detail_1.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2022/03/챔피온-T425-반팔-남녀공용.jpg'),
    colors: ['화이트', '애쉬', '애틀레틱헤더', '챠콜헤더', '네이비', '블랙', '로얄블루', '레드', '버건디', '포레스트그린'],
    sizes: [{'label': 'S', 'extraPrice': 0}, {'label': 'M', 'extraPrice': 0}, {'label': 'L', 'extraPrice': 0}, {'label': 'XL', 'extraPrice': 0}],
    tags: ['반팔티셔츠', '챔피온 CHAMPION'],
  },
  {
    id: 'p-029',
    name: '[프린트스타] 148 헤비 14수 라운드 반팔 (남녀공용)',
    price: 9500,
    originalPrice: 10900,
    priceText: formatPrice(
      9500
    ),
    url: 'https://www.customzone.co.kr/상품/%ed%94%84%eb%a6%b0%ed%8a%b8%ec%8a%a4%ed%83%80-148-%ed%97%a4%eb%b9%84-14%ec%88%98-%eb%9d%bc%ec%9a%b4%eb%93%9c-%eb%b0%98%ed%8c%94-%eb%82%a8%eb%85%80%ea%b3%b5%ec%9a%a9/',
    mainImage: resolveImage('downloads/[프린트스타]_148_헤비_14수_라운드_반팔_(남녀공용)/main_image.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2022/05/메인_148-헤비-14수-라운드-반팔.jpg'),
    detailImage: resolveImage('downloads/[프린트스타]_148_헤비_14수_라운드_반팔_(남녀공용)/detail_1.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2022/05/프린트스타-148-헤비-14수-라운드-반팔-남녀공용-1.jpg'),
    colors: ['그레이', '네이비', '라이트블루', '라이트핑크', '레드', '로얄블루', '버건디', '블랙', '아미그린', '화이트'],
    sizes: [{'label': 'XS', 'extraPrice': 0}, {'label': 'S', 'extraPrice': 0}, {'label': 'M', 'extraPrice': 0}, {'label': 'L', 'extraPrice': 0}, {'label': 'XL', 'extraPrice': 0}, {'label': '2XL', 'extraPrice': 1000}, {'label': '3XL', 'extraPrice': 1000}],
    tags: ['반팔티셔츠', '프린트스타 Printstar'],
  },
  {
    id: 'p-030',
    name: '[프린트스타] 095 17수 베이직 반팔 (남녀공용&아동용)',
    price: 6500,
    originalPrice: 6900,
    priceText: formatPrice(
      6500
    ),
    url: 'https://www.customzone.co.kr/상품/%ed%94%84%eb%a6%b0%ed%8a%b8%ec%8a%a4%ed%83%80-095-17%ec%88%98-%eb%b2%a0%ec%9d%b4%ec%a7%81-%eb%b0%98%ed%8c%94-%eb%82%a8%eb%85%80%ea%b3%b5%ec%9a%a9%ec%95%84%eb%8f%99%ec%9a%a9-2/',
    mainImage: resolveImage('downloads/[프린트스타]_095_17수_베이직_반팔_(남녀공용&아동용)/main_image.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2024/03/095-썸네일.jpg'),
    detailImage: resolveImage('downloads/[프린트스타]_095_17수_베이직_반팔_(남녀공용&아동용)/detail_1.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2024/03/1-프린트스타-095-17수-베이직-반팔-남녀공용아동용_상세페이지_수정.jpg'),
    colors: ['라이트베이지', '샌드카키'],
    sizes: [{'label': '160', 'extraPrice': -1000}, {'label': 'S', 'extraPrice': 0}, {'label': 'M', 'extraPrice': 0}, {'label': 'L', 'extraPrice': 0}, {'label': 'XL', 'extraPrice': 0}, {'label': '2XL', 'extraPrice': 1000}, {'label': '3XL', 'extraPrice': 1000}],
    tags: ['반팔티셔츠', '프린트스타 Printstar'],
  },
  {
    id: 'p-031',
    name: '[프린트스타] 086 20수 반팔 (남녀공용&아동용)',
    price: 6000,
    originalPrice: 6900,
    priceText: formatPrice(
      6000
    ),
    url: 'https://www.customzone.co.kr/상품/printstar-dmt-086/',
    mainImage: resolveImage('downloads/[프린트스타]_086_20수_반팔_(남녀공용&아동용)/main_image.gif', 'https://www.customzone.co.kr/wp-content/uploads/2021/04/프린트스타_dmt086_상품목록_수정.gif'),
    detailImage: resolveImage('downloads/[프린트스타]_086_20수_반팔_(남녀공용&아동용)/detail_1.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2021/04/프린트스타-086-20수-반팔-남녀공용아동용_최종.jpg'),
    colors: ['화이트', '모쿠그레이', '레드', '로얄블루', '네이비', '블랙', '차콜', '아미그린', '버건디', '퍼플', '라이트핑크', '옐로우', '라이트그린', '라이트블루'],
    sizes: [{'label': '아동-110', 'extraPrice': -1000}, {'label': '아동-120', 'extraPrice': -1000}, {'label': '아동-130', 'extraPrice': -1000}, {'label': '아동-140', 'extraPrice': -1000}, {'label': '아동-150', 'extraPrice': -1000}, {'label': 'XS', 'extraPrice': 0}, {'label': 'S', 'extraPrice': 0}, {'label': 'M', 'extraPrice': 0}, {'label': 'L', 'extraPrice': 0}, {'label': 'XL', 'extraPrice': 0}, {'label': '2XL', 'extraPrice': 1000}, {'label': '3XL', 'extraPrice': 1000}],
    tags: ['반팔티셔츠', '아동/여성티셔츠', '프린트스타 Printstar'],
  },
  {
    id: 'p-032',
    name: '[BASIC단체티] 2116 20수 반팔 (남녀공용&아동용)',
    price: 6000,
    originalPrice: null,
    priceText: formatPrice(
      6000
    ),
    url: 'https://www.customzone.co.kr/상품/cz-at2116-20round-tshirt/',
    mainImage: resolveImage('downloads/[BASIC단체티]_2116_20수_반팔_(남녀공용&아동용)/main_image.gif', 'https://www.customzone.co.kr/wp-content/uploads/2018/10/CZ_2116_20수반팔_상품목록B-1.gif'),
    detailImage: resolveImage('downloads/[BASIC단체티]_2116_20수_반팔_(남녀공용&아동용)/detail_1.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2018/10/BASIC단체티-2116-20수-반팔-남녀공용아동용.jpg'),
    colors: ['화이트', '멜란지', '연노랑', '노랑', '연핑크', '체리핑크', '연두', '소라', '물색', '오렌지', '빨강', '초록', '자주', '보라', '코발트', '곤색', '검정', '수박', '연보라', '진회색', '밤색', '진블루', '카키'],
    sizes: [{'label': '아동-13호', 'extraPrice': -500}, {'label': '아동-14호', 'extraPrice': -500}, {'label': '아동-15호', 'extraPrice': -500}, {'label': '아동-16호', 'extraPrice': -500}, {'label': '아동-17호', 'extraPrice': -500}, {'label': '아동-18호', 'extraPrice': -500}, {'label': 'S', 'extraPrice': 0}, {'label': 'M', 'extraPrice': 0}, {'label': 'L', 'extraPrice': 0}, {'label': 'XL', 'extraPrice': 0}, {'label': '2XL', 'extraPrice': 0}, {'label': '3XL', 'extraPrice': 500}, {'label': '4XL', 'extraPrice': 1500}, {'label': '5XL', 'extraPrice': 3000}],
    tags: ['반팔티셔츠', '아동/여성티셔츠', 'Basic 단체티셔츠'],
  },
  {
    id: 'p-033',
    name: '[프린트스타] 113 17수 오버핏 반팔 (남녀공용)',
    price: 8000,
    originalPrice: 9400,
    priceText: formatPrice(
      8000
    ),
    url: 'https://www.customzone.co.kr/상품/%ed%94%84%eb%a6%b0%ed%8a%b8%ec%8a%a4%ed%83%80-113-17%ec%88%98-%ec%98%a4%eb%b2%84%ed%95%8f-%eb%b0%98%ed%8c%94-%eb%82%a8%eb%85%80%ea%b3%b5%ec%9a%a9-2/',
    mainImage: resolveImage('downloads/[프린트스타]_113_17수_오버핏_반팔_(남녀공용)/main_image.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2024/03/113-썸네일.jpg'),
    detailImage: resolveImage('downloads/[프린트스타]_113_17수_오버핏_반팔_(남녀공용)/detail_1.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2024/03/2-프린트스타-113-17수-오버핏-반팔-남녀공용_상세페이지.jpg'),
    colors: ['화이트', '블랙', '카멜', '다크브라운', '더스티핑크', '더스티블루'],
    sizes: [{'label': 'S', 'extraPrice': 0}, {'label': 'M', 'extraPrice': 0}, {'label': 'L', 'extraPrice': 0}, {'label': 'XL', 'extraPrice': 0}],
    tags: ['반팔티셔츠', '프린트스타 Printstar'],
  },
  {
    id: 'p-034',
    name: '[길단] 76000 24수 반팔 (남녀공용)',
    price: 5500,
    originalPrice: null,
    priceText: formatPrice(
      5500
    ),
    url: 'https://www.customzone.co.kr/상품/gildan-ts76000-24round-tshirt/',
    mainImage: resolveImage('downloads/[길단]_76000_24수_반팔_(남녀공용)/main_image.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2018/10/리스트_길단_76000-24수-반팔.jpg'),
    detailImage: resolveImage('downloads/[길단]_76000_24수_반팔_(남녀공용)/detail_1.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2018/10/길단-76000-24수-반팔-남녀공용_후.jpg'),
    colors: ['화이트', '샌드', '스포트그레이', '로얄블루', '레드', '오렌지', '네이비', '사파이어', '다크초콜렛', '데이지', '챠콜그레이', '라이트핑크', '라이트블루', '헤더그린', '아젤리아', '체스트넛', '라임', '아이리쉬그린', '포레스트그린', '밀리터리그린', '다크헤더', '블랙', '마룬', '세이프티오렌지', '세이프티핑크'],
    sizes: [{'label': 'XS', 'extraPrice': 0}, {'label': 'S', 'extraPrice': 0}, {'label': 'M', 'extraPrice': 0}, {'label': 'L', 'extraPrice': 0}, {'label': 'XL', 'extraPrice': 0}, {'label': '2XL', 'extraPrice': 2000}, {'label': '3XL', 'extraPrice': 2000}, {'label': '4XL', 'extraPrice': 3000}, {'label': '5XL', 'extraPrice': 3000}],
    tags: ['반팔티셔츠', '길단 GILDAN'],
  },
  {
    id: 'p-035',
    name: '[길단] 2000T 18수 오버핏 반팔 (남녀공용)',
    price: 11500,
    originalPrice: 14000,
    priceText: formatPrice(
      11500
    ),
    url: 'https://www.customzone.co.kr/상품/%ea%b8%b8%eb%8b%a8-2000t-18%ec%88%98-%ec%98%a4%eb%b2%84%ed%95%8f-%eb%b0%98%ed%8c%94-%eb%82%a8%eb%85%80%ea%b3%b5%ec%9a%a9/',
    mainImage: resolveImage('downloads/[길단]_2000T_18수_오버핏_반팔_(남녀공용)/main_image.gif', 'https://www.customzone.co.kr/wp-content/uploads/2022/05/메인_길단-2000T-18수-오버핏-반팔-남녀공용.gif'),
    detailImage: resolveImage('downloads/[길단]_2000T_18수_오버핏_반팔_(남녀공용)/detail_1.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2022/05/길단-2000T-18수-오버핏-반팔-남녀공용-1.jpg'),
    colors: ['블랙', '화이트'],
    sizes: [{'label': 'LT', 'extraPrice': 0}, {'label': 'XL', 'extraPrice': 0}, {'label': '2XL', 'extraPrice': 2000}],
    tags: ['반팔티셔츠', '길단 GILDAN'],
  },
  {
    id: 'p-036',
    name: '[트리플에이] 1701 20수 반팔 (남녀공용)',
    price: 6000,
    originalPrice: 9500,
    priceText: formatPrice(
      6000
    ),
    url: 'https://www.customzone.co.kr/상품/aaa-1701-20round-tshirt/',
    mainImage: resolveImage('downloads/[트리플에이]_1701_20수_반팔_(남녀공용)/main_image.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2018/10/AAA1701_상품목록B_수정.jpg'),
    detailImage: resolveImage('downloads/[트리플에이]_1701_20수_반팔_(남녀공용)/detail_1.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2022/03/트리플에이-1701-20수-반팔-남녀공용_리뉴얼.jpg'),
    colors: ['버건디', '하버블루', '화이트', '블랙', '애틀레틱헤더', '챠콜헤더', '타르', '밀리터리그린', '네이비', '실버', '레드', '퍼플', '슬레이트', '챠콜', '오렌지', '터코이즈', '옐로우', '로얄블루', '바나나'],
    sizes: [{'label': 'XS', 'extraPrice': 0}, {'label': 'S', 'extraPrice': 0}, {'label': 'M', 'extraPrice': 0}, {'label': 'L', 'extraPrice': 0}, {'label': 'XL', 'extraPrice': 0}],
    tags: ['반팔티셔츠', '트리플에이 AAA'],
  },
  {
    id: 'p-037',
    name: '[BASIC단체티] 2115 30수 반팔 (남녀공용&아동용)',
    price: 5000,
    originalPrice: null,
    priceText: formatPrice(
      5000
    ),
    url: 'https://www.customzone.co.kr/상품/cz-at2115-30round-tshirt/',
    mainImage: resolveImage('downloads/[BASIC단체티]_2115_30수_반팔_(남녀공용&아동용)/main_image.gif', 'https://www.customzone.co.kr/wp-content/uploads/2018/10/CZ_2115_30수반팔_상품목록B.gif'),
    detailImage: resolveImage('downloads/[BASIC단체티]_2115_30수_반팔_(남녀공용&아동용)/detail_1.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2018/10/BASIC단체티-2115-30수-반팔-남녀공용아동용.jpg'),
    colors: ['흰색', '멜란지', '연노랑', '노랑', '연핑크', '체리핑크', '연두', '소라', '물색', '오렌지', '빨강', '초록', '자주', '보라', '코발트', '곤색', '검정', '연보라', '연옥', '카키', '수박'],
    sizes: [{'label': '아동-13호', 'extraPrice': -500}, {'label': '아동-14호', 'extraPrice': -500}, {'label': '아동-15호', 'extraPrice': -500}, {'label': '아동-16호', 'extraPrice': -500}, {'label': '아동-17호', 'extraPrice': -500}, {'label': '아동-18호', 'extraPrice': -500}, {'label': 'S', 'extraPrice': 0}, {'label': 'M', 'extraPrice': 0}, {'label': 'L', 'extraPrice': 0}, {'label': 'XL', 'extraPrice': 0}, {'label': '2XL', 'extraPrice': 0}, {'label': '3XL', 'extraPrice': 500}, {'label': '4XL', 'extraPrice': 1500}, {'label': '5XL', 'extraPrice': 3000}],
    tags: ['반팔티셔츠', '아동/여성티셔츠', 'Basic 단체티셔츠'],
  },
  {
    id: 'p-038',
    name: '[페플] 오리지널 반팔',
    price: 14000,
    originalPrice: null,
    priceText: formatPrice(
      14000
    ),
    url: 'https://www.customzone.co.kr/상품/fp01/',
    mainImage: resolveImage('downloads/[페플]_오리지널_반팔/main_image.gif', 'https://www.customzone.co.kr/wp-content/uploads/2019/03/페플_오리지널반팔티_썸네일_수정.gif'),
    detailImage: resolveImage('downloads/[페플]_오리지널_반팔/detail_1.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2019/03/페플_오리지날반팔_최종최종최종_수정.jpg'),
    colors: ['흰색', '회색', '검정', '곤색', '카키'],
    sizes: [{'label': 'M', 'extraPrice': 0}, {'label': 'L', 'extraPrice': 0}, {'label': 'XL', 'extraPrice': 0}, {'label': '2XL', 'extraPrice': 0}, {'label': '3XL', 'extraPrice': 0}],
    tags: ['반팔티셔츠', '페플 FP142'],
  },
  {
    id: 'p-039',
    name: '[프린트스타] 083 30수 반팔 (남녀공용&아동용)',
    price: 4900,
    originalPrice: null,
    priceText: formatPrice(
      4900
    ),
    url: 'https://www.customzone.co.kr/상품/printstar-bbt083-30tshirt/',
    mainImage: resolveImage('downloads/[프린트스타]_083_30수_반팔_(남녀공용&아동용)/main_image.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2019/01/프린트스타-083-30수-반팔-남녀공용_썸네일_최종.jpg'),
    detailImage: resolveImage('downloads/[프린트스타]_083_30수_반팔_(남녀공용&아동용)/detail_1.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2019/01/프린트스타-083-30수-반팔-남녀공용_수정.jpg'),
    colors: ['화이트', '모쿠그레이', '블랙', '라이트브루', '버건디', '네이비', '퍼플', '로얄블루'],
    sizes: [{'label': '160', 'extraPrice': -1000}, {'label': 'S', 'extraPrice': 0}, {'label': 'M', 'extraPrice': 0}, {'label': 'L', 'extraPrice': 0}, {'label': 'XL', 'extraPrice': 0}, {'label': '2XL', 'extraPrice': 1000}],
    tags: ['반팔티셔츠', '아동/여성티셔츠', '프린트스타 Printstar'],
  },
  {
    id: 'p-040',
    name: '[Fill It] 시그니쳐 오버핏 쮸리 후드집업 (남녀공용)',
    price: 39000,
    originalPrice: null,
    priceText: formatPrice(
      39000
    ),
    url: 'https://www.customzone.co.kr/상품/fill-it-%ec%8b%9c%ea%b7%b8%eb%8b%88%ec%b3%90-%ec%98%a4%eb%b2%84%ed%95%8f-%ec%ae%b8%eb%a6%ac-%ed%9b%84%eb%93%9c%ec%a7%91%ec%97%85/',
    mainImage: resolveImage('downloads/[Fill_It]_시그니쳐_오버핏_쮸리_후드집업_(남녀공용)/main_image.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2024/03/필잇-쭈리후드집업.jpg'),
    detailImage: resolveImage('downloads/[Fill_It]_시그니쳐_오버핏_쮸리_후드집업_(남녀공용)/detail_1.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2024/03/16-Fill-It-시그니쳐-오버핏-쮸리-후드집업_상세페이지.jpg'),
    colors: ['블랙', '먹색', '그린', '스카이', '네이비', '코랄', '퍼플', '애쉬멜로우', '화이트', '멜란지', '브라운', '라임', '핑크', '카멜'],
    sizes: [{'label': 'XS', 'extraPrice': 0}, {'label': 'S', 'extraPrice': 0}, {'label': 'M', 'extraPrice': 0}, {'label': 'L', 'extraPrice': 0}, {'label': 'XL', 'extraPrice': 0}, {'label': '2XL', 'extraPrice': 0}, {'label': '3XL', 'extraPrice': 2000}, {'label': '4XL', 'extraPrice': 4000}, {'label': '5XL', 'extraPrice': 6500}, {'label': '6XL', 'extraPrice': 8500}],
    tags: ['후드집업', '필잇 FILL IT'],
  },
  {
    id: 'p-041',
    name: '[Fill It] 시그니쳐 오버핏 쮸리 후드 (남녀공용)',
    price: 35000,
    originalPrice: null,
    priceText: formatPrice(
      35000
    ),
    url: 'https://www.customzone.co.kr/상품/fill-it-%ec%8b%9c%ea%b7%b8%eb%8b%88%ec%b3%90-%ec%98%a4%eb%b2%84%ed%95%8f-%ec%ae%b8%eb%a6%ac-%ed%9b%84%eb%93%9c/',
    mainImage: resolveImage('downloads/[Fill_It]_시그니쳐_오버핏_쮸리_후드_(남녀공용)/main_image.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2024/03/필잇-쭈리후드.jpg'),
    detailImage: resolveImage('downloads/[Fill_It]_시그니쳐_오버핏_쮸리_후드_(남녀공용)/detail_1.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2024/03/수정페이지.jpg'),
    colors: ['블랙', '먹색', '그린', '스카이', '네이비', '코랄', '퍼플', '애쉬멜로우', '화이트', '멜란지', '브라운', '라임', '핑크'],
    sizes: [{'label': 'XS', 'extraPrice': 0}, {'label': 'S', 'extraPrice': 0}, {'label': 'M', 'extraPrice': 0}, {'label': 'L', 'extraPrice': 0}, {'label': 'XL', 'extraPrice': 0}, {'label': '2XL', 'extraPrice': 0}, {'label': '3XL', 'extraPrice': 2000}, {'label': '4XL', 'extraPrice': 4000}, {'label': '5XL', 'extraPrice': 6500}, {'label': '6XL', 'extraPrice': 8500}],
    tags: ['후드', '필잇 FILL IT'],
  },
  {
    id: 'p-042',
    name: '[Fill It] 시그니쳐 오버핏 쮸리 맨투맨 (남녀공용)',
    price: 26000,
    originalPrice: null,
    priceText: formatPrice(
      26000
    ),
    url: 'https://www.customzone.co.kr/상품/fill-it-%ec%8b%9c%ea%b7%b8%eb%8b%88%ec%b3%90-%ec%98%a4%eb%b2%84%ed%95%8f-%ec%ae%b8%eb%a6%ac-%eb%a7%a8%ed%88%ac%eb%a7%a8/',
    mainImage: resolveImage('downloads/[Fill_It]_시그니쳐_오버핏_쮸리_맨투맨_(남녀공용)/main_image.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2024/03/필잇-쭈리맨투맨.jpg'),
    detailImage: resolveImage('downloads/[Fill_It]_시그니쳐_오버핏_쮸리_맨투맨_(남녀공용)/detail_1.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2024/03/14-Fill-It-시그니쳐-오버핏-쮸리-맨투맨_상세페이지.jpg'),
    colors: ['블랙', '먹색', '그린', '네이비', '코랄', '퍼플', '애쉬옐로우', '화이트', '메란지', '브라운', '라임', '핑크'],
    sizes: [{'label': 'XS', 'extraPrice': 0}, {'label': 'S', 'extraPrice': 0}, {'label': 'M', 'extraPrice': 0}, {'label': 'L', 'extraPrice': 0}, {'label': 'XL', 'extraPrice': 0}, {'label': '2XL', 'extraPrice': 0}, {'label': '3XL', 'extraPrice': 2000}, {'label': '4XL', 'extraPrice': 4000}, {'label': '5XL', 'extraPrice': 6500}, {'label': '6XL', 'extraPrice': 8500}],
    tags: ['맨투맨', '필잇 FILL IT'],
  },
  {
    id: 'p-043',
    name: '[Fill It] 16수 COTTON WIDE OVERFIT',
    price: 15000,
    originalPrice: null,
    priceText: formatPrice(
      15000
    ),
    url: 'https://www.customzone.co.kr/상품/fill-it-16%ec%88%98-cotton-wide-overfit/',
    mainImage: resolveImage('downloads/[Fill_It]_16수_COTTON_WIDE_OVERFIT/main_image.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2024/03/필잇-WIDE.jpg'),
    detailImage: resolveImage('downloads/[Fill_It]_16수_COTTON_WIDE_OVERFIT/detail_1.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2024/03/13-Fill-It-16수-COTTON-WIDE-OVERFIT_상세페이지.jpg'),
    colors: ['블랙', '화이트'],
    sizes: [{'label': 'XS', 'extraPrice': 0}, {'label': 'S', 'extraPrice': 0}, {'label': 'M', 'extraPrice': 0}, {'label': 'L', 'extraPrice': 0}, {'label': 'XL', 'extraPrice': 0}, {'label': '2XL', 'extraPrice': 0}, {'label': '3XL', 'extraPrice': 1500}, {'label': '4XL', 'extraPrice': 3000}, {'label': '5XL', 'extraPrice': 4000}, {'label': '6XL', 'extraPrice': 5000}],
    tags: ['반팔티셔츠', '필잇 FILL IT'],
  },
  {
    id: 'p-044',
    name: '[Fill It] 시그니쳐 라운드 긴팔 티셔츠',
    price: 16000,
    originalPrice: null,
    priceText: formatPrice(
      16000
    ),
    url: 'https://www.customzone.co.kr/상품/fill-it-%ec%8b%9c%ea%b7%b8%eb%8b%88%ec%b3%90-%eb%9d%bc%ec%9a%b4%eb%93%9c-%ea%b8%b4%ed%8c%94-%ed%8b%b0%ec%85%94%ec%b8%a0/',
    mainImage: resolveImage('downloads/[Fill_It]_시그니쳐_라운드_긴팔_티셔츠/main_image.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2024/03/필잇-긴팔.jpg'),
    detailImage: resolveImage('downloads/[Fill_It]_시그니쳐_라운드_긴팔_티셔츠/detail_1.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2024/03/12-Fill-It-시그니쳐-라운드-긴팔-티셔츠_상세페이지.jpg'),
    colors: ['블랙', '코발트', '수박', '퍼플', '네이비', '카멜', '크림', '막색', '핑크', '차콜', '화이트', '샌드', '카키'],
    sizes: [{'label': 'XS', 'extraPrice': 0}, {'label': 'S', 'extraPrice': 0}, {'label': 'M', 'extraPrice': 0}, {'label': 'L', 'extraPrice': 0}, {'label': 'XL', 'extraPrice': 0}, {'label': '2XL', 'extraPrice': 0}, {'label': '3XL', 'extraPrice': 1000}, {'label': '4XL', 'extraPrice': 2500}, {'label': '5XL', 'extraPrice': 3500}, {'label': '6XL', 'extraPrice': 4500}],
    tags: ['긴팔티셔츠', '필잇 FILL IT'],
  },
  {
    id: 'p-045',
    name: '[글리머] 353 라이트 드라이 민소매',
    price: 5500,
    originalPrice: 5900,
    priceText: formatPrice(
      5500
    ),
    url: 'https://www.customzone.co.kr/상품/%ea%b8%80%eb%a6%ac%eb%a8%b8-353-%eb%9d%bc%ec%9d%b4%ed%8a%b8-%eb%93%9c%eb%9d%bc%ec%9d%b4-%eb%af%bc%ec%86%8c%eb%a7%a4/',
    mainImage: resolveImage('downloads/[글리머]_353_라이트_드라이_민소매/main_image.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2024/03/353-썸네일.jpg'),
    detailImage: resolveImage('downloads/[글리머]_353_라이트_드라이_민소매/detail_1.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2024/03/10-글리머-353-라이트-드라이-민소매_상세페이지.jpg'),
    colors: ['다크그레이', '네이비', '블랙'],
    sizes: [{'label': 'S', 'extraPrice': 0}, {'label': 'M', 'extraPrice': 0}, {'label': 'L', 'extraPrice': 0}, {'label': 'XL', 'extraPrice': 0}, {'label': '2XL', 'extraPrice': 0}],
    tags: ['민소매티셔츠', '글리머 glimmer'],
  },
  {
    id: 'p-046',
    name: '[프린트스타] 780 투톤 토트백 (12수2합)',
    price: 3500,
    originalPrice: null,
    priceText: formatPrice(
      3500
    ),
    url: 'https://www.customzone.co.kr/상품/%ed%94%84%eb%a6%b0%ed%8a%b8%ec%8a%a4%ed%83%80-780-%ed%88%ac%ed%86%a4-%ed%86%a0%ed%8a%b8%eb%b0%b1-12%ec%88%982%ed%95%a9/',
    mainImage: resolveImage('downloads/[프린트스타]_780_투톤_토트백_(12수2합)/main_image.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2024/03/780-썸네일.jpg'),
    detailImage: resolveImage('downloads/[프린트스타]_780_투톤_토트백_(12수2합)/detail_1.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2024/03/9-프린트스타-780-투톤-토트백-12수2합_상세페이지.jpg'),
    colors: ['핫핑크', '터코이즈', '네이비', '블랙'],
    sizes: [{'label': 'S', 'extraPrice': 0}, {'label': 'M', 'extraPrice': 1000}],
    tags: ['에코백/파우치', '에코백'],
  },
  {
    id: 'p-047',
    name: '[프린트스타] 778 캔버스 토트백 (12수2합)',
    price: 3500,
    originalPrice: null,
    priceText: formatPrice(
      3500
    ),
    url: 'https://www.customzone.co.kr/상품/%ed%94%84%eb%a6%b0%ed%8a%b8%ec%8a%a4%ed%83%80-778-%ec%ba%94%eb%b2%84%ec%8a%a4-%ed%86%a0%ed%8a%b8%eb%b0%b1-12%ec%88%982%ed%95%a9/',
    mainImage: resolveImage('downloads/[프린트스타]_778_캔버스_토트백_(12수2합)/main_image.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2024/03/778-썸네일.jpg'),
    detailImage: resolveImage('downloads/[프린트스타]_778_캔버스_토트백_(12수2합)/detail_1.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2024/03/8-프린트스타-778-캔버스-토트백-12수2합_상세페이지.jpg'),
    colors: ['내츄럴', '블랙', '핫핑크', '라이트블루', '타코이즈', '네이비'],
    sizes: [{'label': 'S', 'extraPrice': 0}, {'label': 'SM', 'extraPrice': 500}, {'label': 'M', 'extraPrice': 1000}, {'label': 'L', 'extraPrice': 2000}],
    tags: ['에코백/파우치', '에코백'],
  },
  {
    id: 'p-048',
    name: '[프린트스타] 189 헤비 후드집업 (남녀공용)',
    price: 26500,
    originalPrice: 28000,
    priceText: formatPrice(
      26500
    ),
    url: 'https://www.customzone.co.kr/상품/%ed%94%84%eb%a6%b0%ed%8a%b8%ec%8a%a4%ed%83%80-189-%ed%97%a4%eb%b9%84-%ed%9b%84%eb%93%9c%ec%a7%91%ec%97%85-%eb%82%a8%eb%85%80%ea%b3%b5%ec%9a%a9/',
    mainImage: resolveImage('downloads/[프린트스타]_189_헤비_후드집업_(남녀공용)/main_image.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2024/03/189-썸네일.jpg'),
    detailImage: resolveImage('downloads/[프린트스타]_189_헤비_후드집업_(남녀공용)/detail_1.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2024/03/7-프린트스타-189-헤비-후드집업-남녀공용_상세페이지.jpg'),
    colors: ['모쿠그레이', '블랙', '네이비', '화이트', '오트밀', '버건디', '로얄블루'],
    sizes: [{'label': 'S', 'extraPrice': 0}, {'label': 'M', 'extraPrice': 0}, {'label': 'L', 'extraPrice': 0}, {'label': 'XL', 'extraPrice': 0}, {'label': '2XL', 'extraPrice': 4000}, {'label': '3XL', 'extraPrice': 4000}, {'label': '4XL', 'extraPrice': 4000}],
    tags: ['후드집업', '프린트스타 Printstar'],
  },
  {
    id: 'p-049',
    name: '[프린트스타] 188 헤비 후드 (남녀공용)',
    price: 23500,
    originalPrice: 24500,
    priceText: formatPrice(
      23500
    ),
    url: 'https://www.customzone.co.kr/상품/%ed%94%84%eb%a6%b0%ed%8a%b8%ec%8a%a4%ed%83%80-188-%ed%97%a4%eb%b9%84-%ed%9b%84%eb%93%9c-%eb%82%a8%eb%85%80%ea%b3%b5%ec%9a%a9/',
    mainImage: resolveImage('downloads/[프린트스타]_188_헤비_후드_(남녀공용)/main_image.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2024/03/188-썸네일.jpg'),
    detailImage: resolveImage('downloads/[프린트스타]_188_헤비_후드_(남녀공용)/detail_1.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2024/03/6-프린트스타-188-헤비-후드-남녀공용_상세페이지.jpg'),
    colors: ['모쿠그레이', '블랙', '네이비', '화이트', '오트밀', '버건디', '로얄블루'],
    sizes: [{'label': 'S', 'extraPrice': 0}, {'label': 'M', 'extraPrice': 0}, {'label': 'L', 'extraPrice': 0}, {'label': 'XL', 'extraPrice': 0}, {'label': '2XL', 'extraPrice': 3500}, {'label': '3XL', 'extraPrice': 3500}, {'label': '4XL', 'extraPrice': 3500}],
    tags: ['후드', '프린트스타 Printstar'],
  },
  {
    id: 'p-050',
    name: '[프린트스타] 183 헤비 맨투맨 (남녀공용)',
    price: 17000,
    originalPrice: 18000,
    priceText: formatPrice(
      17000
    ),
    url: 'https://www.customzone.co.kr/상품/%ed%94%84%eb%a6%b0%ed%8a%b8%ec%8a%a4%ed%83%80-183-%ed%97%a4%eb%b9%84-%eb%a7%a8%ed%88%ac%eb%a7%a8-%eb%82%a8%eb%85%80%ea%b3%b5%ec%9a%a9/',
    mainImage: resolveImage('downloads/[프린트스타]_183_헤비_맨투맨_(남녀공용)/main_image.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2024/03/183-썸네일.jpg'),
    detailImage: resolveImage('downloads/[프린트스타]_183_헤비_맨투맨_(남녀공용)/detail_1.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2024/03/5-프린트스타-183-헤비-맨투맨-남녀공용_상세페이지.jpg'),
    colors: ['모쿠그레이', '블랙', '네이비', '화이트', '오트밀', '버건디', '로얄블루'],
    sizes: [{'label': 'S', 'extraPrice': 0}, {'label': 'M', 'extraPrice': 0}, {'label': 'L', 'extraPrice': 0}, {'label': 'XL', 'extraPrice': 0}, {'label': '2XL', 'extraPrice': 3500}, {'label': '3XL', 'extraPrice': 3500}, {'label': '4XL', 'extraPrice': 3500}],
    tags: ['맨투맨', '프린트스타 Printstar'],
  },
  {
    id: 'p-051',
    name: '[프린트스타] 149 헤비라운드 긴팔 소매시보리 (남녀공용)',
    price: 11000,
    originalPrice: null,
    priceText: formatPrice(
      11000
    ),
    url: 'https://www.customzone.co.kr/상품/%ed%94%84%eb%a6%b0%ed%8a%b8%ec%8a%a4%ed%83%80-149-%ed%97%a4%eb%b9%84%eb%9d%bc%ec%9a%b4%eb%93%9c-%ea%b8%b4%ed%8c%94-%ec%86%8c%eb%a7%a4%ec%8b%9c%eb%b3%b4%eb%a6%ac-%eb%82%a8%eb%85%80%ea%b3%b5%ec%9a%a9/',
    mainImage: resolveImage('downloads/[프린트스타]_149_헤비라운드_긴팔_소매시보리_(남녀공용)/main_image.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2024/03/149-썸네일.jpg'),
    detailImage: resolveImage('downloads/[프린트스타]_149_헤비라운드_긴팔_소매시보리_(남녀공용)/detail_1.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2024/03/4-프린트스타-149-헤비라운드-긴팔-소매시보리-남녀공용_상세페이지.jpg'),
    colors: ['WHITE', '네이비', '블랙'],
    sizes: [{'label': 'XS', 'extraPrice': 0}, {'label': 'S', 'extraPrice': 0}, {'label': 'M', 'extraPrice': 0}, {'label': 'L', 'extraPrice': 0}, {'label': 'XL', 'extraPrice': 0}, {'label': '2XL', 'extraPrice': 1500}, {'label': '3XL', 'extraPrice': 1500}],
    tags: ['긴팔티셔츠', '프린트스타 Printstar'],
  },
  {
    id: 'p-052',
    name: '[프린트스타] 110 17수 긴팔 소매시보리 (남녀공용)',
    price: 10000,
    originalPrice: null,
    priceText: formatPrice(
      10000
    ),
    url: 'https://www.customzone.co.kr/상품/%ed%94%84%eb%a6%b0%ed%8a%b8%ec%8a%a4%ed%83%80-110-17%ec%88%98-%ea%b8%b4%ed%8c%94-%ec%86%8c%eb%a7%a4%ec%8b%9c%eb%b3%b4%eb%a6%ac-%eb%82%a8%eb%85%80%ea%b3%b5%ec%9a%a9/',
    mainImage: resolveImage('downloads/[프린트스타]_110_17수_긴팔_소매시보리_(남녀공용)/main_image.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2024/03/110-썸네일.jpg'),
    detailImage: resolveImage('downloads/[프린트스타]_110_17수_긴팔_소매시보리_(남녀공용)/detail_1.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2024/03/3-프린트스타-110-17수-긴팔-소매시보리-남녀공용_상세페이지-1.jpg'),
    colors: ['화이트', '아이보리', '모쿠그레이', '네이비', '블랙'],
    sizes: [{'label': 'XS', 'extraPrice': 0}, {'label': 'S', 'extraPrice': 0}, {'label': 'M', 'extraPrice': 0}, {'label': 'L', 'extraPrice': 0}, {'label': 'XL', 'extraPrice': 0}, {'label': '2XL', 'extraPrice': 1500}, {'label': '3XL', 'extraPrice': 1500}],
    tags: ['긴팔티셔츠', '프린트스타 Printstar'],
  },
  {
    id: 'p-053',
    name: '[길단] HA00 20수 헤머 반팔라운드 (남녀공용)',
    price: 8000,
    originalPrice: null,
    priceText: formatPrice(
      8000
    ),
    url: 'https://www.customzone.co.kr/상품/%ea%b8%b8%eb%8b%a8-ha00-20%ec%88%98-%ed%97%a4%eb%a8%b8-%eb%b0%98%ed%8c%94%eb%9d%bc%ec%9a%b4%eb%93%9c-%eb%82%a8%eb%85%80%ea%b3%b5%ec%9a%a9/',
    mainImage: resolveImage('downloads/[길단]_HA00_20수_헤머_반팔라운드_(남녀공용)/main_image.gif', 'https://www.customzone.co.kr/wp-content/uploads/2022/05/메인_길단-HA00-20수-헤머-반팔라운드-남녀공용.gif'),
    detailImage: resolveImage('downloads/[길단]_HA00_20수_헤머_반팔라운드_(남녀공용)/detail_1.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2022/05/길단-HA00-20수-헤머-반팔라운드-남녀공용_-1.jpg'),
    colors: ['블랙', '네이비', '화이트', '씨포엠', '스포트블루', '스포트그레이', '베리', '마룬', '인디고블루', '오렌지', '샌드', '레드'],
    sizes: [{'label': 'XS', 'extraPrice': 0}, {'label': 'S', 'extraPrice': 0}, {'label': 'M', 'extraPrice': 0}, {'label': 'L', 'extraPrice': 0}, {'label': 'XL', 'extraPrice': 0}, {'label': '2XL', 'extraPrice': 1000}, {'label': '3XL', 'extraPrice': 1000}],
    tags: ['반팔티셔츠', '길단 GILDAN'],
  },
  {
    id: 'p-054',
    name: '[길단] 18500B 아동 후드 (아동용)',
    price: 18000,
    originalPrice: 21000,
    priceText: formatPrice(
      18000
    ),
    url: 'https://www.customzone.co.kr/상품/%ea%b8%b8%eb%8b%a8-18500b-%ec%95%84%eb%8f%99-%ed%9b%84%eb%93%9c-%ec%95%84%eb%8f%99%ec%9a%a9/',
    mainImage: resolveImage('downloads/[길단]_18500B_아동_후드_(아동용)/main_image.gif', 'https://www.customzone.co.kr/wp-content/uploads/2022/05/메인_길단-18500B-아동-후드-아동용.gif'),
    detailImage: resolveImage('downloads/[길단]_18500B_아동_후드_(아동용)/detail_1.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2022/05/길단-18500B-아동-후드-아동용-1.jpg'),
    colors: ['화이트', '블랙', '포레스트 그린', '네이비', '로얄블루', '스포트그레이'],
    sizes: [{'label': 'S', 'extraPrice': 0}, {'label': 'M', 'extraPrice': 0}, {'label': 'L', 'extraPrice': 0}, {'label': 'XL', 'extraPrice': 0}],
    tags: ['아동/여성티셔츠', '길단 GILDAN'],
  },
  {
    id: 'p-055',
    name: '[길단] 18000B 아동 맨투맨 (아동용)',
    price: 14000,
    originalPrice: 17000,
    priceText: formatPrice(
      14000
    ),
    url: 'https://www.customzone.co.kr/상품/%ea%b8%b8%eb%8b%a8-18000b-%ec%95%84%eb%8f%99-%eb%a7%a8%ed%88%ac%eb%a7%a8-%ec%95%84%eb%8f%99%ec%9a%a9/',
    mainImage: resolveImage('downloads/[길단]_18000B_아동_맨투맨_(아동용)/main_image.gif', 'https://www.customzone.co.kr/wp-content/uploads/2022/05/메인_길단-18000B-아동-맨투맨-아동용.gif'),
    detailImage: resolveImage('downloads/[길단]_18000B_아동_맨투맨_(아동용)/detail_1.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2022/05/길단-18000B-아동-맨투맨-아동용-1.jpg'),
    colors: ['화이트', '블랙', '포레스트 그린', '네이비', '로얄블루', '스포트그레이'],
    sizes: [{'label': 'S', 'extraPrice': 0}, {'label': 'M', 'extraPrice': 0}, {'label': 'L', 'extraPrice': 0}, {'label': 'XL', 'extraPrice': 0}],
    tags: ['아동/여성티셔츠', '길단 GILDAN'],
  },
  {
    id: 'p-056',
    name: '[길단] 5100 18수 반팔라운드 (남녀공용)',
    price: 7000,
    originalPrice: 10000,
    priceText: formatPrice(
      7000
    ),
    url: 'https://www.customzone.co.kr/상품/%ea%b8%b8%eb%8b%a8-5100-18%ec%88%98-%eb%b0%98%ed%8c%94%eb%9d%bc%ec%9a%b4%eb%93%9c-%eb%82%a8%eb%85%80%ea%b3%b5%ec%9a%a9/',
    mainImage: resolveImage('downloads/[길단]_5100_18수_반팔라운드_(남녀공용)/main_image.gif', 'https://www.customzone.co.kr/wp-content/uploads/2022/05/메인_길단-5100-18수-반팔라운드-남녀공용.gif'),
    detailImage: resolveImage('downloads/[길단]_5100_18수_반팔라운드_(남녀공용)/detail_1.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2022/05/길단-5100-18수-반팔라운드-남녀공용-1.jpg'),
    colors: ['white', 'black'],
    sizes: [{'label': 'S', 'extraPrice': 0}, {'label': 'M', 'extraPrice': 0}, {'label': 'L', 'extraPrice': 0}, {'label': 'XL', 'extraPrice': 0}, {'label': '2XL', 'extraPrice': 1500}],
    tags: ['길단 GILDAN'],
  },
  {
    id: 'p-057',
    name: '[프린트스타] 220 쮸리 하프 팬츠 (남녀공용&아동용)',
    price: 13000,
    originalPrice: 14900,
    priceText: formatPrice(
      13000
    ),
    url: 'https://www.customzone.co.kr/상품/%ed%94%84%eb%a6%b0%ed%8a%b8%ec%8a%a4%ed%83%80-220-%ec%ae%b8%eb%a6%ac-%ed%95%98%ed%94%84-%ed%8c%ac%ec%b8%a0-%eb%82%a8%eb%85%80%ea%b3%b5%ec%9a%a9/',
    mainImage: resolveImage('downloads/[프린트스타]_220_쮸리_하프_팬츠_(남녀공용&아동용)/main_image.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2022/05/220쮸리하프팬트_메인.jpg'),
    detailImage: resolveImage('downloads/[프린트스타]_220_쮸리_하프_팬츠_(남녀공용&아동용)/detail_1.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2022/05/프린트스타-220-쮸리-하프-팬츠-남녀공용.jpg'),
    colors: ['그레이', '딥네이비', '블랙'],
    sizes: [{'label': '110', 'extraPrice': -2900}, {'label': '130', 'extraPrice': -2900}, {'label': '150', 'extraPrice': -2900}, {'label': 'S', 'extraPrice': 0}, {'label': 'M', 'extraPrice': 0}, {'label': 'L', 'extraPrice': 0}, {'label': 'XL', 'extraPrice': 0}, {'label': '2XL', 'extraPrice': 0}],
    tags: ['바지', '프린트스타 Printstar'],
  },
  {
    id: 'p-058',
    name: '[프린트스타] 218 쮸리 팬츠 (남녀공용&아동용)',
    price: 16900,
    originalPrice: null,
    priceText: formatPrice(
      16900
    ),
    url: 'https://www.customzone.co.kr/상품/%ed%94%84%eb%a6%b0%ed%8a%b8%ec%8a%a4%ed%83%80-218-%ec%ae%b8%eb%a6%ac-%ed%8c%ac%ec%b8%a0-%eb%82%a8%eb%85%80%ea%b3%b5%ec%9a%a9/',
    mainImage: resolveImage('downloads/[프린트스타]_218_쮸리_팬츠_(남녀공용&아동용)/main_image.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2022/05/218_쭈리팬츠_메인.jpg'),
    detailImage: resolveImage('downloads/[프린트스타]_218_쮸리_팬츠_(남녀공용&아동용)/detail_1.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2022/05/프린트스타-218-쮸리-팬츠-남녀공용.jpg'),
    colors: ['그레이', '네이비', '버건디', '블랙', '블루', '오트밀', '화이트'],
    sizes: [{'label': '100', 'extraPrice': -3000}, {'label': '110', 'extraPrice': -3000}, {'label': '120', 'extraPrice': -3000}, {'label': '130', 'extraPrice': -3000}, {'label': '140', 'extraPrice': -3000}, {'label': '150', 'extraPrice': -3000}, {'label': 'WM', 'extraPrice': 0}, {'label': 'S', 'extraPrice': 0}, {'label': 'M', 'extraPrice': 0}, {'label': 'L', 'extraPrice': 0}, {'label': 'XL', 'extraPrice': 0}, {'label': '2XL', 'extraPrice': 0}],
    tags: ['바지', '프린트스타 Printstar'],
  },
  {
    id: 'p-059',
    name: '[프린트스타] 102 라운드 17수 긴팔 (남녀공용&아동용)',
    price: 9000,
    originalPrice: 9500,
    priceText: formatPrice(
      9000
    ),
    url: 'https://www.customzone.co.kr/상품/%ed%94%84%eb%a6%b0%ed%8a%b8%ec%8a%a4%ed%83%80-102-%eb%9d%bc%ec%9a%b4%eb%93%9c-17%ec%88%98-%ea%b8%b4%ed%8c%94-%eb%82%a8%eb%85%80%ea%b3%b5%ec%9a%a9/',
    mainImage: resolveImage('downloads/[프린트스타]_102_라운드_17수_긴팔_(남녀공용&아동용)/main_image.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2022/05/102_라운드_17수_메인.jpg'),
    detailImage: resolveImage('downloads/[프린트스타]_102_라운드_17수_긴팔_(남녀공용&아동용)/detail_1.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2022/05/프린트스타-102-라운드-17수-긴팔-남녀공용.jpg'),
    colors: ['모쿠그레이', '네이비', '레드', '로얄블루', '버건디', '블랙', '아미그린', '화이트'],
    sizes: [{'label': '110', 'extraPrice': -1000}, {'label': '130', 'extraPrice': -1000}, {'label': '150', 'extraPrice': -1000}, {'label': 'XS', 'extraPrice': 0}, {'label': 'S', 'extraPrice': 0}, {'label': 'M', 'extraPrice': 0}, {'label': 'L', 'extraPrice': 0}, {'label': 'XL', 'extraPrice': 0}, {'label': '2XL', 'extraPrice': 1000}, {'label': '3XL', 'extraPrice': 1000}],
    tags: ['긴팔티셔츠', '프린트스타 Printstar'],
  },
  {
    id: 'p-060',
    name: '[글리머] 304 드라이 라운드 긴팔 (남녀공용)',
    price: 7000,
    originalPrice: 9000,
    priceText: formatPrice(
      7000
    ),
    url: 'https://www.customzone.co.kr/상품/%ea%b8%80%eb%a6%ac%eb%a8%b8-304-%eb%93%9c%eb%9d%bc%ec%9d%b4-%eb%9d%bc%ec%9a%b4%eb%93%9c-%ea%b8%b4%ed%8c%94-%eb%82%a8%eb%85%80%ea%b3%b5%ec%9a%a9/',
    mainImage: resolveImage('downloads/[글리머]_304_드라이_라운드_긴팔_(남녀공용)/main_image.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2022/04/304_글리머_메인.jpg'),
    detailImage: resolveImage('downloads/[글리머]_304_드라이_라운드_긴팔_(남녀공용)/detail_1.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2022/04/글리머-304-드라이-라운드-긴팔-남녀공용-1.jpg'),
    colors: ['화이트', '그레이', '블랙', '레드', '퍼플', '라이트그린', '그린', '네이비', '로얄블루', '터콰이즈', '버건디', '라이트블루'],
    sizes: [{'label': 'SS', 'extraPrice': 0}, {'label': 'S', 'extraPrice': 0}, {'label': 'M', 'extraPrice': 0}, {'label': 'L', 'extraPrice': 0}, {'label': 'XL', 'extraPrice': 0}, {'label': '2XL', 'extraPrice': 1000}, {'label': '3XL', 'extraPrice': 1000}],
    tags: ['긴팔티셔츠', '글리머 glimmer'],
  },
  {
    id: 'p-061',
    name: '항균 쿨링 마스크',
    price: 3500,
    originalPrice: 4000,
    priceText: formatPrice(
      3500
    ),
    url: 'https://www.customzone.co.kr/상품/%ed%95%ad%ea%b7%a0-%ec%bf%a8%eb%a7%81-%eb%a7%88%ec%8a%a4%ed%81%ac/',
    mainImage: resolveImage('downloads/항균_쿨링_마스크/main_image.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2022/03/cool_list.jpg'),
    detailImage: resolveImage('downloads/항균_쿨링_마스크/detail_1.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2022/03/220318_마스크페이지_수정.jpg'),
    colors: ['navy', 'white', 'khaki', 'black', 'Beige', 'yellow green', 'sky blue', 'light pink'],
    sizes: [{'label': 'ONE SIZE', 'extraPrice': 0}],
    tags: ['마스크'],
  },
  {
    id: 'p-062',
    name: '[글리머] 330 드라이 반팔 포켓 폴로셔츠 (남녀공용)',
    price: 8500,
    originalPrice: 9500,
    priceText: formatPrice(
      8500
    ),
    url: 'https://www.customzone.co.kr/상품/glimmer-avp330/',
    mainImage: resolveImage('downloads/[글리머]_330_드라이_반팔_포켓_폴로셔츠_(남녀공용)/main_image.gif', 'https://www.customzone.co.kr/wp-content/uploads/2021/04/글리머_avp330_상품목록.gif'),
    detailImage: resolveImage('downloads/[글리머]_330_드라이_반팔_포켓_폴로셔츠_(남녀공용)/detail_1.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2021/04/글리머-330-드라이-반팔-포켓-폴로셔츠-남녀공용.jpg'),
    colors: ['화이트', '그레이', '블랙', '라이트 핑크', '데이지', '레드', '라임', '라이트 블루', '터코이즈', '로얄블루', '네이비', '버건디'],
    sizes: [{'label': 'XS', 'extraPrice': 0}, {'label': 'S', 'extraPrice': 0}, {'label': 'M', 'extraPrice': 0}, {'label': 'L', 'extraPrice': 0}, {'label': 'XL', 'extraPrice': 0}, {'label': '2XL', 'extraPrice': 0}, {'label': '3XL', 'extraPrice': 0}],
    tags: ['카라티셔츠', '글리머 glimmer'],
  },
  {
    id: 'p-063',
    name: '[글리머] 339 드라이 레이어드 포켓 폴로셔츠 (남녀공용)',
    price: 8500,
    originalPrice: 9500,
    priceText: formatPrice(
      8500
    ),
    url: 'https://www.customzone.co.kr/상품/glimmer-ayp339/',
    mainImage: resolveImage('downloads/[글리머]_339_드라이_레이어드_포켓_폴로셔츠_(남녀공용)/main_image.gif', 'https://www.customzone.co.kr/wp-content/uploads/2021/04/글리머_ayp339_상품목록.gif'),
    detailImage: resolveImage('downloads/[글리머]_339_드라이_레이어드_포켓_폴로셔츠_(남녀공용)/detail_1.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2021/04/글리머-339-드라이-레이어드-포켓-폴로셔츠-남녀공용.jpg'),
    colors: ['화이트/레드', '화이트/로얄블루', '블랙/터코이즈', '라이트블루/로얄블루', '네이비/옐로우', '라이트핑크/핫핑크', '네이비/핫핑크'],
    sizes: [{'label': 'XS', 'extraPrice': 0}, {'label': 'S', 'extraPrice': 0}, {'label': 'M', 'extraPrice': 0}, {'label': 'L', 'extraPrice': 0}, {'label': 'XL', 'extraPrice': 0}, {'label': '2XL', 'extraPrice': 0}, {'label': '3XL', 'extraPrice': 0}],
    tags: ['카라티셔츠', '글리머 glimmer'],
  },
  {
    id: 'p-064',
    name: '[글리머] 라이트 쿨론 350 반팔 (남녀공용&아동용)',
    price: 5000,
    originalPrice: 5900,
    priceText: formatPrice(
      5000
    ),
    url: 'https://www.customzone.co.kr/상품/glimmer-ait350-lcoolon-tshirt/',
    mainImage: resolveImage('downloads/[글리머]_라이트_쿨론_350_반팔_(남녀공용&아동용)/main_image.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2020/04/글리머_ait350_상품목록_1.jpg'),
    detailImage: resolveImage('downloads/[글리머]_라이트_쿨론_350_반팔_(남녀공용&아동용)/detail_1.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2020/04/글리머-라이트-쿨론-350-반팔-남녀공용-1.jpg'),
    colors: ['화이트', '다크그레이', '블랙', '라이트블루', '로얄블루', '네이비', '레드', '퍼플'],
    sizes: [{'label': '150', 'extraPrice': 0}, {'label': 'XS', 'extraPrice': 0}, {'label': 'S', 'extraPrice': 0}, {'label': 'M', 'extraPrice': 0}, {'label': 'L', 'extraPrice': 0}, {'label': 'XL', 'extraPrice': 0}, {'label': '2XL', 'extraPrice': 0}],
    tags: ['기능성티셔츠', '글리머 glimmer'],
  },
  {
    id: 'p-065',
    name: '[페플] 오리지널 기모 후드집업',
    price: 38000,
    originalPrice: null,
    priceText: formatPrice(
      38000
    ),
    url: 'https://www.customzone.co.kr/상품/fw-hoodzip/',
    mainImage: resolveImage('downloads/[페플]_오리지널_기모_후드집업/main_image.gif', 'https://www.customzone.co.kr/wp-content/uploads/2019/09/페플_오리지널기모후드집업_상품목록.gif'),
    detailImage: resolveImage('downloads/[페플]_오리지널_기모_후드집업/detail_1.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2019/09/페플-오리지널-기모-후드집업_사이즈수정.jpg'),
    colors: ['회색', '검정', '보카시챠콜'],
    sizes: [{'label': 'M', 'extraPrice': 0}, {'label': 'L', 'extraPrice': 0}, {'label': 'XL', 'extraPrice': 0}, {'label': '2XL', 'extraPrice': 0}, {'label': '3XL', 'extraPrice': 0}],
    tags: ['후드집업', '페플 FP142'],
  },
  {
    id: 'p-066',
    name: '[페플] 오리지널 기모 후드',
    price: 35000,
    originalPrice: null,
    priceText: formatPrice(
      35000
    ),
    url: 'https://www.customzone.co.kr/상품/fw-hood/',
    mainImage: resolveImage('downloads/[페플]_오리지널_기모_후드/main_image.gif', 'https://www.customzone.co.kr/wp-content/uploads/2019/09/페플_오리지널기모후드_상품목록.gif'),
    detailImage: resolveImage('downloads/[페플]_오리지널_기모_후드/detail_1.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2019/09/페플-오리지널-기모-후드_사이즈수정.jpg'),
    colors: ['회색', '곤색', '검정', '라이트그레이', '코코아', '흰색', '수박', '진카키', '밤색', '보카시챠콜', '오트밀'],
    sizes: [{'label': 'M', 'extraPrice': 0}, {'label': 'L', 'extraPrice': 0}, {'label': 'XL', 'extraPrice': 0}, {'label': '2XL', 'extraPrice': 0}, {'label': '3XL', 'extraPrice': 0}],
    tags: ['후드', '페플 FP142'],
  },
  {
    id: 'p-067',
    name: '[페플] 오리지널 기모 맨투맨',
    price: 29000,
    originalPrice: null,
    priceText: formatPrice(
      29000
    ),
    url: 'https://www.customzone.co.kr/상품/fw-mtm/',
    mainImage: resolveImage('downloads/[페플]_오리지널_기모_맨투맨/main_image.gif', 'https://www.customzone.co.kr/wp-content/uploads/2019/09/페플_오리지널기모맨투맨_상품목록.gif'),
    detailImage: resolveImage('downloads/[페플]_오리지널_기모_맨투맨/detail_1.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2019/09/페플-오리지널-기모-맨투맨_사이즈수정.jpg'),
    colors: ['회색', '검정'],
    sizes: [{'label': 'M', 'extraPrice': 0}, {'label': 'L', 'extraPrice': 0}, {'label': 'XL', 'extraPrice': 0}, {'label': '2XL', 'extraPrice': 0}],
    tags: ['맨투맨', '페플 FP142'],
  },
  {
    id: 'p-068',
    name: '[글리머] 쿨론 302 폴로셔츠 (남녀공용)',
    price: 8000,
    originalPrice: 8400,
    priceText: formatPrice(
      8000
    ),
    url: 'https://www.customzone.co.kr/상품/glimmer-adp302-coolon-poloshirt/',
    mainImage: resolveImage('downloads/[글리머]_쿨론_302_폴로셔츠_(남녀공용)/main_image.gif', 'https://www.customzone.co.kr/wp-content/uploads/2019/06/글리머_adt302_상품목록B.gif'),
    detailImage: resolveImage('downloads/[글리머]_쿨론_302_폴로셔츠_(남녀공용)/detail_1.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2019/06/글리머-쿨론-302-폴로셔츠-남녀공용.jpg'),
    colors: ['화이트', '그레이', '블랙', '라이트 핑크', '핑크', '핫핑크', '데이지', '오렌지', '레드', '라임', '민트 그린', '그린', '라이트 블루', '터코이즈', '로얄블루', '네이비', '퍼플', '버건디'],
    sizes: [{'label': 'XS', 'extraPrice': 0}, {'label': 'S', 'extraPrice': 0}, {'label': 'M', 'extraPrice': 0}, {'label': 'L', 'extraPrice': 0}, {'label': 'XL', 'extraPrice': 0}, {'label': '2XL', 'extraPrice': 0}, {'label': '3XL', 'extraPrice': 0}, {'label': '4XL', 'extraPrice': 0}],
    tags: ['카라티셔츠', '글리머 glimmer'],
  },
  {
    id: 'p-069',
    name: '[페플] 오리지널 쭉티',
    price: 18000,
    originalPrice: null,
    priceText: formatPrice(
      18000
    ),
    url: 'https://www.customzone.co.kr/상품/fp04/',
    mainImage: resolveImage('downloads/[페플]_오리지널_쭉티/main_image.gif', 'https://www.customzone.co.kr/wp-content/uploads/2019/04/페플_오리지널쭉티_상품목록B_수정.gif'),
    detailImage: resolveImage('downloads/[페플]_오리지널_쭉티/detail_1.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2019/04/페플_오리지날_쭉티_수정_사이즈수정.jpg'),
    colors: ['흰색', '회색', '검정', '카키', '곤색', '다크그레이', '다크네이비', '딥그레이', '아이보리'],
    sizes: [{'label': 'M', 'extraPrice': 0}, {'label': 'L', 'extraPrice': 0}, {'label': 'XL', 'extraPrice': 0}, {'label': '2XL', 'extraPrice': 0}, {'label': '3XL', 'extraPrice': 0}],
    tags: ['긴팔티셔츠', '페플 FP142'],
  },
  {
    id: 'p-070',
    name: '[페플] 오리지널 쮸리 후드',
    price: 36000,
    originalPrice: null,
    priceText: formatPrice(
      36000
    ),
    url: 'https://www.customzone.co.kr/상품/fp03h/',
    mainImage: resolveImage('downloads/[페플]_오리지널_쮸리_후드/main_image.gif', 'https://www.customzone.co.kr/wp-content/uploads/2019/03/페플_오리지널쮸리후드_상품목록B.gif'),
    detailImage: resolveImage('downloads/[페플]_오리지널_쮸리_후드/detail_1.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2019/03/페플-오리지널-쮸리-후드_사이즈수정.jpg'),
    colors: ['회색', '곤색', '검정', '보카시차콜', '카키'],
    sizes: [{'label': 'M', 'extraPrice': 0}, {'label': 'L', 'extraPrice': 0}, {'label': 'XL', 'extraPrice': 0}, {'label': '2XL', 'extraPrice': 0}, {'label': '3XL', 'extraPrice': 0}],
    tags: ['후드', '페플 FP142'],
  },
  {
    id: 'p-071',
    name: '[페플] 오리지널 쮸리 맨투맨',
    price: 28000,
    originalPrice: null,
    priceText: formatPrice(
      28000
    ),
    url: 'https://www.customzone.co.kr/상품/fp02m/',
    mainImage: resolveImage('downloads/[페플]_오리지널_쮸리_맨투맨/main_image.gif', 'https://www.customzone.co.kr/wp-content/uploads/2019/03/페플_오리지널쮸리맨투맨_상품목록B.gif'),
    detailImage: resolveImage('downloads/[페플]_오리지널_쮸리_맨투맨/detail_1.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2019/03/페플-오리지널-쮸리-맨투맨_사이즈수정.jpg'),
    colors: ['회색', '보카시차콜', '검정', '곤색'],
    sizes: [{'label': 'M', 'extraPrice': 0}, {'label': 'L', 'extraPrice': 0}, {'label': 'XL', 'extraPrice': 0}, {'label': '2XL', 'extraPrice': 0}],
    tags: ['맨투맨', '페플 FP142'],
  },
  {
    id: 'p-072',
    name: '[글리머] 쿨론 300 반팔 (남녀공용/아동용)',
    price: 6000,
    originalPrice: 6900,
    priceText: formatPrice(
      6000
    ),
    url: 'https://www.customzone.co.kr/상품/glimmer-act300-coolon-tshirt/',
    mainImage: resolveImage('downloads/[글리머]_쿨론_300_반팔_(남녀공용아동용)/main_image.gif', 'https://www.customzone.co.kr/wp-content/uploads/2019/01/글리머-쿨론-300-반팔-남녀공용_리스트.gif'),
    detailImage: resolveImage('downloads/[글리머]_쿨론_300_반팔_(남녀공용아동용)/detail_1.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2019/01/글리머-쿨론-300-반팔-남녀공용.jpg'),
    colors: ['화이트', '그레이', '다크그레이', '블랙', '데이지', '오렌지', '핫핑크', '레드', '퍼플', '로얄블루', '네이비', '그린', '라이트핑크', '라이트블루', '라이트퍼플', '라임', '올리브', '아미그린', '버건디', '믹스그레이', '믹스레드', '믹스블루'],
    sizes: [{'label': '아동-110', 'extraPrice': -1000}, {'label': '아동-120', 'extraPrice': -1000}, {'label': '아동-130', 'extraPrice': -1000}, {'label': '아동-140', 'extraPrice': -1000}, {'label': '아동-150', 'extraPrice': -1000}, {'label': 'XS', 'extraPrice': 0}, {'label': 'S', 'extraPrice': 0}, {'label': 'M', 'extraPrice': 0}, {'label': 'L', 'extraPrice': 0}, {'label': 'XL', 'extraPrice': 0}, {'label': '2XL', 'extraPrice': 0}, {'label': '3XL', 'extraPrice': 0}],
    tags: ['아동/여성티셔츠', '기능성티셔츠', '글리머 glimmer'],
  },
  {
    id: 'p-073',
    name: '[글리머] 346 기모 맨투맨 (남녀공용)',
    price: 12000,
    originalPrice: 16000,
    priceText: formatPrice(
      12000
    ),
    url: 'https://www.customzone.co.kr/상품/glimmer-afc346-fleece-mtm/',
    mainImage: resolveImage('downloads/[글리머]_346_기모_맨투맨_(남녀공용)/main_image.gif', 'https://www.customzone.co.kr/wp-content/uploads/2018/12/글리머_기모맨투맨_상품목록B.gif'),
    detailImage: resolveImage('downloads/[글리머]_346_기모_맨투맨_(남녀공용)/detail_1.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2018/12/글리머-346-기모-맨투맨-남녀공용.jpg'),
    colors: ['화이트', '블랙', '모쿠그레이', '네이비', '로얄블루', '라이트 핑크', '버건디'],
    sizes: [{'label': 'XS', 'extraPrice': 0}, {'label': 'S', 'extraPrice': 0}, {'label': 'M', 'extraPrice': 0}, {'label': 'L', 'extraPrice': 0}, {'label': 'XL', 'extraPrice': 0}, {'label': '2XL', 'extraPrice': 0}, {'label': '3XL', 'extraPrice': 0}, {'label': '4XL', 'extraPrice': 0}],
    tags: ['맨투맨', '글리머 glimmer'],
  },
  {
    id: 'p-074',
    name: '[글리머] 347 기모 후드 (남녀공용)',
    price: 17000,
    originalPrice: 21000,
    priceText: formatPrice(
      17000
    ),
    url: 'https://www.customzone.co.kr/상품/glimmer-afh347-fleece-hoodie/',
    mainImage: resolveImage('downloads/[글리머]_347_기모_후드_(남녀공용)/main_image.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2018/12/글리머_기모후드_상품목록B.jpg'),
    detailImage: resolveImage('downloads/[글리머]_347_기모_후드_(남녀공용)/detail_1.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2018/12/글리머-347-기모-후드-남녀공용.jpg'),
    colors: ['화이트', '모쿠그레이', '블랙', '로얄블루', '네이비', '라이트 핑크', '버건디'],
    sizes: [{'label': 'XS', 'extraPrice': 0}, {'label': 'S', 'extraPrice': 0}, {'label': 'M', 'extraPrice': 0}, {'label': 'L', 'extraPrice': 0}, {'label': 'XL', 'extraPrice': 0}, {'label': '2XL', 'extraPrice': 0}, {'label': '3XL', 'extraPrice': 0}, {'label': '4XL', 'extraPrice': 0}],
    tags: ['후드', '글리머 glimmer'],
  },
  {
    id: 'p-075',
    name: '[글리머] 348 기모 후드집업 (남녀공용)',
    price: 19000,
    originalPrice: 24000,
    priceText: formatPrice(
      19000
    ),
    url: 'https://www.customzone.co.kr/상품/glimmer-afz348-fleece-ziphoodie/',
    mainImage: resolveImage('downloads/[글리머]_348_기모_후드집업_(남녀공용)/main_image.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2018/12/글리머_기모후드집업_상품목록B.jpg'),
    detailImage: resolveImage('downloads/[글리머]_348_기모_후드집업_(남녀공용)/detail_1.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2018/12/글리머-348-기모-후드집업-남녀공용.jpg'),
    colors: ['화이트', '블랙', '모쿠그레이', '네이비', '버건디'],
    sizes: [{'label': 'XS', 'extraPrice': 0}, {'label': 'S', 'extraPrice': 0}, {'label': 'M', 'extraPrice': 0}, {'label': 'L', 'extraPrice': 0}, {'label': 'XL', 'extraPrice': 0}, {'label': '2XL', 'extraPrice': 0}, {'label': '3XL', 'extraPrice': 0}, {'label': '4XL', 'extraPrice': 0}],
    tags: ['후드집업', '글리머 glimmer'],
  },
  {
    id: 'p-076',
    name: 'CZ 볼캡 모자',
    price: 9000,
    originalPrice: null,
    priceText: formatPrice(
      9000
    ),
    url: 'https://www.customzone.co.kr/상품/cz-ballcap/',
    mainImage: resolveImage('downloads/CZ_볼캡_모자/main_image.gif', 'https://www.customzone.co.kr/wp-content/uploads/2018/10/볼캡_상품목록B.gif'),
    detailImage: resolveImage('downloads/CZ_볼캡_모자/detail_1.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2018/10/CZ-볼캡-모자.jpg'),
    colors: ['블랙', '화이트', '옐로우', '레드', '네이비', '아쿠아', '그린', '베이지', '핑크', '코발트'],
    sizes: [{'label': 'ONE SIZE', 'extraPrice': 0}],
    tags: ['모자', '모자'],
  },
  {
    id: 'p-077',
    name: '광목 파우치',
    price: 3000,
    originalPrice: null,
    priceText: formatPrice(
      3000
    ),
    url: 'https://www.customzone.co.kr/상품/cz-001p-pouch/',
    mainImage: resolveImage('downloads/광목_파우치/main_image.png', 'https://www.customzone.co.kr/wp-content/uploads/2018/10/광목파우치2.png'),
    detailImage: resolveImage('downloads/광목_파우치/detail_1.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2018/10/광목-파우치.jpg'),
    colors: ['아이보리'],
    sizes: [{'label': 'ONE SIZE', 'extraPrice': 0}],
    tags: ['에코백/파우치', '파우치'],
  },
  {
    id: 'p-078',
    name: '광목 주머니',
    price: 3500,
    originalPrice: null,
    priceText: formatPrice(
      3500
    ),
    url: 'https://www.customzone.co.kr/상품/cz-007pc-canvas-pocket/',
    mainImage: resolveImage('downloads/광목_주머니/main_image.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2018/11/pouch_01_thumbnail-600x839.jpg'),
    detailImage: resolveImage('downloads/광목_주머니/detail_1.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2018/10/광목-주머니-1.jpg'),
    colors: ['아이보리'],
    sizes: [{'label': 'ONE SIZE', 'extraPrice': 0}],
    tags: ['인기상품', '에코백/파우치', '파우치'],
  },
  {
    id: 'p-079',
    name: '스트라이프 에코백 Light Grey',
    price: 6000,
    originalPrice: null,
    priceText: formatPrice(
      6000
    ),
    url: 'https://www.customzone.co.kr/상품/cz-5008a-stripe-lightgrey-ecobag/',
    mainImage: resolveImage('downloads/스트라이프_에코백_Light_Grey/main_image.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2018/11/canvas_08_thumbnail-600x839.jpg'),
    detailImage: resolveImage('downloads/스트라이프_에코백_Light_Grey/detail_1.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2018/10/스트라이프-에코백-Light-Grey.jpg'),
    colors: ['연그레이'],
    sizes: [{'label': 'ONE SIZE', 'extraPrice': 0}],
    tags: ['에코백'],
  },
  {
    id: 'p-080',
    name: '스트라이프 에코백 Navy',
    price: 6000,
    originalPrice: null,
    priceText: formatPrice(
      6000
    ),
    url: 'https://www.customzone.co.kr/상품/cz-5011a-stripe-navy-ecobag/',
    mainImage: resolveImage('downloads/스트라이프_에코백_Navy/main_image.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2018/11/canvas_10_thumbnail-600x839.jpg'),
    detailImage: resolveImage('downloads/스트라이프_에코백_Navy/detail_1.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2018/10/스트라이프-에코백-Navy.jpg'),
    colors: ['네이비'],
    sizes: [{'label': 'ONE SIZE', 'extraPrice': 0}],
    tags: ['에코백'],
  },
  {
    id: 'p-081',
    name: '스트라이프 에코백 Brown',
    price: 6000,
    originalPrice: null,
    priceText: formatPrice(
      6000
    ),
    url: 'https://www.customzone.co.kr/상품/cz-5010a-stripe-brown-ecobag/',
    mainImage: resolveImage('downloads/스트라이프_에코백_Brown/main_image.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2018/11/canvas_07_thumbnail-600x839.jpg'),
    detailImage: resolveImage('downloads/스트라이프_에코백_Brown/detail_1.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2018/10/스트라이프-에코백-Brown.jpg'),
    colors: ['브라운'],
    sizes: [{'label': 'ONE SIZE', 'extraPrice': 0}],
    tags: ['에코백'],
  },
  {
    id: 'p-082',
    name: '코튼 에코백 Charcoal',
    price: 8000,
    originalPrice: null,
    priceText: formatPrice(
      8000
    ),
    url: 'https://www.customzone.co.kr/상품/cz-5012a-cotton-charcoal-ecobag/',
    mainImage: resolveImage('downloads/코튼_에코백_Charcoal/main_image.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2018/11/canvas_11_thumbnail-600x839.jpg'),
    detailImage: resolveImage('downloads/코튼_에코백_Charcoal/detail_1.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2018/10/코튼-에코백-Charcoal.jpg'),
    colors: ['챠콜'],
    sizes: [{'label': 'ONE SIZE', 'extraPrice': 0}],
    tags: ['에코백'],
  },
  {
    id: 'p-083',
    name: '데님 에코백',
    price: 8000,
    originalPrice: null,
    priceText: formatPrice(
      8000
    ),
    url: 'https://www.customzone.co.kr/상품/cz-5001a-denim-ecobag/',
    mainImage: resolveImage('downloads/데님_에코백/main_image.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2018/11/canvas_15_thumbnail-600x839.jpg'),
    detailImage: resolveImage('downloads/데님_에코백/detail_1.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2018/10/데님-에코백.jpg'),
    colors: ['데님'],
    sizes: [{'label': 'ONE SIZE', 'extraPrice': 0}],
    tags: ['에코백'],
  },
  {
    id: 'p-084',
    name: '린넨 에코백 Sky Blue',
    price: 8000,
    originalPrice: null,
    priceText: formatPrice(
      8000
    ),
    url: 'https://www.customzone.co.kr/상품/cz-5005a-linen-skyblue-ecobag/',
    mainImage: resolveImage('downloads/린넨_에코백_Sky_Blue/main_image.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2018/11/canvas_04_thumbnail-600x839.jpg'),
    detailImage: resolveImage('downloads/린넨_에코백_Sky_Blue/detail_1.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2018/10/린넨-에코백-Sky-Blue.jpg'),
    colors: ['스카이블루'],
    sizes: [{'label': 'ONE SIZE', 'extraPrice': 0}],
    tags: ['에코백'],
  },
  {
    id: 'p-085',
    name: '린넨 에코백 Khaki',
    price: 8000,
    originalPrice: null,
    priceText: formatPrice(
      8000
    ),
    url: 'https://www.customzone.co.kr/상품/cz-5003a-linen-khaki-ecobag/',
    mainImage: resolveImage('downloads/린넨_에코백_Khaki/main_image.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2018/11/canvas_05_thumbnail-600x839.jpg'),
    detailImage: resolveImage('downloads/린넨_에코백_Khaki/detail_1.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2018/10/린넨-에코백-Khaki.jpg'),
    colors: ['카키'],
    sizes: [{'label': 'ONE SIZE', 'extraPrice': 0}],
    tags: ['에코백'],
  },
  {
    id: 'p-086',
    name: '린넨 에코백 Russet',
    price: 8000,
    originalPrice: null,
    priceText: formatPrice(
      8000
    ),
    url: 'https://www.customzone.co.kr/상품/cz-5002a-linen-russet-ecobag/',
    mainImage: resolveImage('downloads/린넨_에코백_Russet/main_image.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2018/11/canvas_03_thumbnail-600x839.jpg'),
    detailImage: resolveImage('downloads/린넨_에코백_Russet/detail_1.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2018/10/린넨-에코백-Russet.jpg'),
    colors: ['팥색'],
    sizes: [{'label': 'ONE SIZE', 'extraPrice': 0}],
    tags: ['에코백'],
  },
  {
    id: 'p-087',
    name: '린넨 에코백 Blue',
    price: 8000,
    originalPrice: null,
    priceText: formatPrice(
      8000
    ),
    url: 'https://www.customzone.co.kr/상품/cz-5006a-linen-blue-ecobag/',
    mainImage: resolveImage('downloads/린넨_에코백_Blue/main_image.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2018/11/canvas_06_thumbnail-600x839.jpg'),
    detailImage: resolveImage('downloads/린넨_에코백_Blue/detail_1.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2018/10/린넨-에코백-Blue.jpg'),
    colors: ['블루'],
    sizes: [{'label': 'ONE SIZE', 'extraPrice': 0}],
    tags: ['에코백'],
  },
  {
    id: 'p-088',
    name: 'CZ 스냅백',
    price: 8000,
    originalPrice: null,
    priceText: formatPrice(
      8000
    ),
    url: 'https://www.customzone.co.kr/상품/cz-snapback/',
    mainImage: resolveImage('downloads/CZ_스냅백/main_image.gif', 'https://www.customzone.co.kr/wp-content/uploads/2018/10/스냅백_상품목록B.gif'),
    detailImage: resolveImage('downloads/CZ_스냅백/detail_1.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2018/10/CZ-스냅백.jpg'),
    colors: ['블랙', '화이트', '그레이', '챠콜', '네이비', '로얄블루', '진노랑', '레드', '와인', '브라운', '연핑크', '진핑크', '퍼플', '형광연두', '디지털카모'],
    sizes: [{'label': 'ONE SIZE', 'extraPrice': 0}],
    tags: ['모자', '모자'],
  },
  {
    id: 'p-089',
    name: '[BASIC단체티] 2128 30수 브이넥 반팔 (남녀공용)',
    price: 6000,
    originalPrice: null,
    priceText: formatPrice(
      6000
    ),
    url: 'https://www.customzone.co.kr/상품/cz-at2128-30vneck-tshirt/',
    mainImage: resolveImage('downloads/[BASIC단체티]_2128_30수_브이넥_반팔_(남녀공용)/main_image.gif', 'https://www.customzone.co.kr/wp-content/uploads/2018/10/CZ_2128_브이넥_상품목록B.gif'),
    detailImage: resolveImage('downloads/[BASIC단체티]_2128_30수_브이넥_반팔_(남녀공용)/detail_1.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2018/10/BASIC단체티-2128-30수-브이넥-반팔.jpg'),
    colors: ['흰색', '연미', '멜란지', '검정', '연핑크', '체리', '빨강', '연두', '옥색', '소라', '물색', '연보라', '곤색'],
    sizes: [{'label': 'S', 'extraPrice': 0}, {'label': 'M', 'extraPrice': 0}, {'label': 'L', 'extraPrice': 0}, {'label': 'XL', 'extraPrice': 0}, {'label': '2XL', 'extraPrice': 0}],
    tags: ['반팔티셔츠', 'Basic 단체티셔츠'],
  },
  {
    id: 'p-090',
    name: '[길단] 76000B 24수 반팔 (아동용)',
    price: 4500,
    originalPrice: null,
    priceText: formatPrice(
      4500
    ),
    url: 'https://www.customzone.co.kr/상품/gildan-ts76000b-24round-tshirt/',
    mainImage: resolveImage('downloads/[길단]_76000B_24수_반팔_(아동용)/main_image.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2018/10/길단_76000B아동반팔_상품목록B.jpg'),
    detailImage: resolveImage('downloads/[길단]_76000B_24수_반팔_(아동용)/detail_1.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2018/10/길단-76000B-24수-반팔-아동용-1.jpg'),
    colors: ['라이트핑크', '아젤리아', '라임', '사파이어', '레드', '데이지', '화이트', '스포트그레이', '블랙'],
    sizes: [{'label': '아동-XS', 'extraPrice': 0}, {'label': '아동-S', 'extraPrice': 0}, {'label': '아동-M', 'extraPrice': 0}, {'label': '아동-L', 'extraPrice': 0}, {'label': '아동-XL', 'extraPrice': 0}],
    tags: ['아동/여성티셔츠', '길단 GILDAN'],
  },
  {
    id: 'p-091',
    name: '[BASIC단체티] 2117 민소매 (남녀공용)',
    price: 5000,
    originalPrice: null,
    priceText: formatPrice(
      5000
    ),
    url: 'https://www.customzone.co.kr/상품/cz-at2117-tanktop/',
    mainImage: resolveImage('downloads/[BASIC단체티]_2117_민소매_(남녀공용)/main_image.gif', 'https://www.customzone.co.kr/wp-content/uploads/2018/10/CZ_2117_민소매_상품목록B.gif'),
    detailImage: resolveImage('downloads/[BASIC단체티]_2117_민소매_(남녀공용)/detail_1.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2018/10/CZ-2117_민소매_제품컬러-2024.jpg'),
    colors: ['검정', '흰색'],
    sizes: [{'label': 'M', 'extraPrice': 0}, {'label': 'L', 'extraPrice': 0}, {'label': 'XL', 'extraPrice': 0}, {'label': '2XL', 'extraPrice': 0}],
    tags: ['민소매티셔츠', 'Basic 단체티셔츠'],
  },
  {
    id: 'p-092',
    name: '[BASIC단체티] 3161 나그랑 7부 (남녀공용)',
    price: 6000,
    originalPrice: null,
    priceText: formatPrice(
      6000
    ),
    url: 'https://www.customzone.co.kr/상품/cz-at3161-7raglan-tshirt/',
    mainImage: resolveImage('downloads/[BASIC단체티]_3161_나그랑_7부_(남녀공용)/main_image.gif', 'https://www.customzone.co.kr/wp-content/uploads/2018/10/CZ_3161_나그랑7부_상품목록B.gif'),
    detailImage: resolveImage('downloads/[BASIC단체티]_3161_나그랑_7부_(남녀공용)/detail_1.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2018/10/BASIC단체티-3161-나그랑-7부-남녀공용.jpg'),
    colors: ['흰색/녹색', '흰색/검정', '흰색/곤색', '흰색/노랑', '흰색/보라', '흰색/빨강', '흰색/소라', '흰색/자주', '흰색/코발트', '흰색/핑크', '코발트/검정', '회색/검정'],
    sizes: [{'label': 'S', 'extraPrice': 0}, {'label': 'M', 'extraPrice': 0}, {'label': 'L', 'extraPrice': 0}, {'label': 'XL', 'extraPrice': 0}, {'label': '2XL', 'extraPrice': 0}, {'label': '3XL', 'extraPrice': 500}],
    tags: ['긴팔티셔츠', 'Basic 단체티셔츠'],
  },
  {
    id: 'p-093',
    name: '[BASIC단체티] 3104 나그랑 반팔 (남녀공용&아동용)',
    price: 5500,
    originalPrice: null,
    priceText: formatPrice(
      5500
    ),
    url: 'https://www.customzone.co.kr/상품/cz-at3104-raglan-tshirt/',
    mainImage: resolveImage('downloads/[BASIC단체티]_3104_나그랑_반팔_(남녀공용&아동용)/main_image.gif', 'https://www.customzone.co.kr/wp-content/uploads/2018/10/CZ_3104_나그랑반팔_상품목록B.gif'),
    detailImage: resolveImage('downloads/[BASIC단체티]_3104_나그랑_반팔_(남녀공용&아동용)/detail_1.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2018/10/BASIC단체티-3104-나그랑-반팔-남녀공용아동용.jpg'),
    colors: ['흰색/옥색', '흰색/곤색', '흰색/수박', '흰색/노랑', '흰색/빨강', '흰색/오렌지', '흰색/연두', '흰색/보라', '흰색/물색', '흰색/검정', '흰색/체리핑크', '흰색/코발트'],
    sizes: [{'label': '아동-14호', 'extraPrice': 0}, {'label': '아동-15호', 'extraPrice': 0}, {'label': '아동-16호', 'extraPrice': 0}, {'label': '아동-17호', 'extraPrice': 0}, {'label': '아동-18호', 'extraPrice': 0}, {'label': 'S', 'extraPrice': 0}, {'label': 'M', 'extraPrice': 0}, {'label': 'L', 'extraPrice': 0}, {'label': 'XL', 'extraPrice': 0}, {'label': '2XL', 'extraPrice': 0}, {'label': '3XL', 'extraPrice': 500}],
    tags: ['반팔티셔츠', '아동/여성티셔츠', 'Basic 단체티셔츠'],
  },
  {
    id: 'p-094',
    name: '[길단] 76000L 24수 반팔 (여성용)',
    price: 5500,
    originalPrice: 6500,
    priceText: formatPrice(
      5500
    ),
    url: 'https://www.customzone.co.kr/상품/gildan-ts76000l-24round-tshirt/',
    mainImage: resolveImage('downloads/[길단]_76000L_24수_반팔_(여성용)/main_image.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2018/10/길단_76000L여성반팔_상품목록B.jpg'),
    detailImage: resolveImage('downloads/[길단]_76000L_24수_반팔_(여성용)/detail_1.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2018/10/길단-76000L-24수-반팔-여성용.jpg'),
    colors: ['헬리코니아', '라이트핑크', '데이지', '레드', '라임', '사파이어', '화이트', '스포트그레이', '블랙'],
    sizes: [{'label': 'S', 'extraPrice': 0}, {'label': 'M', 'extraPrice': 0}, {'label': 'L', 'extraPrice': 0}, {'label': 'XL', 'extraPrice': 0}],
    tags: ['아동/여성티셔츠', '길단 GILDAN'],
  },
  {
    id: 'p-095',
    name: '[길단] 76600 24수 링거티 (남녀공용)',
    price: 7500,
    originalPrice: null,
    priceText: formatPrice(
      7500
    ),
    url: 'https://www.customzone.co.kr/상품/gildan-ts76600-24ringer-tshirt/',
    mainImage: resolveImage('downloads/[길단]_76600_24수_링거티_(남녀공용)/main_image.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2018/10/길단_76600링거티_상품목록B.jpg'),
    detailImage: resolveImage('downloads/[길단]_76600_24수_링거티_(남녀공용)/detail_1.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2018/10/길단-76600-24수-링거티-남녀공용.jpg'),
    colors: ['화이트/레드', '스포트그레이/네이비', '화이트/네이비'],
    sizes: [{'label': 'S', 'extraPrice': 0}, {'label': 'M', 'extraPrice': 0}, {'label': 'L', 'extraPrice': 0}, {'label': 'XL', 'extraPrice': 0}, {'label': '2XL', 'extraPrice': 1000}],
    tags: ['길단 GILDAN'],
  },
  {
    id: 'p-096',
    name: '[트리플에이] 1304 18수 긴팔 (남녀공용)',
    price: 12000,
    originalPrice: 14000,
    priceText: formatPrice(
      12000
    ),
    url: 'https://www.customzone.co.kr/상품/aaa-1304-longsleeve/',
    mainImage: resolveImage('downloads/[트리플에이]_1304_18수_긴팔_(남녀공용)/main_image.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2018/10/AAA1304_상품목록B.jpg'),
    detailImage: resolveImage('downloads/[트리플에이]_1304_18수_긴팔_(남녀공용)/detail_1.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2022/03/트리플에이-1304-18수-긴팔-남녀공용.jpg'),
    colors: ['애쉬', '애틀레틱헤더', '블랙', '버건디', '챠콜', '챠콜헤더', '포레스트그린', '골드', '하버블루', '밀리터리그린', '네이비', '오렌지', '핑크', '레드', '로얄블루', '세이프티그린', '샌드', '화이트'],
    sizes: [{'label': 'S', 'extraPrice': 0}, {'label': 'M', 'extraPrice': 0}, {'label': 'L', 'extraPrice': 0}, {'label': 'XL', 'extraPrice': 0}, {'label': '2XL', 'extraPrice': 1500}, {'label': '3XL', 'extraPrice': 3000}],
    tags: ['트리플에이 AAA'],
  },
  {
    id: 'p-097',
    name: '[길단] 2400 18수 US핏 긴팔 (남녀공용)',
    price: 11000,
    originalPrice: 12000,
    priceText: formatPrice(
      11000
    ),
    url: 'https://www.customzone.co.kr/상품/gildan-ls2400-usfit-18longsleeve/',
    mainImage: resolveImage('downloads/[길단]_2400_18수_US핏_긴팔_(남녀공용)/main_image.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2018/10/길단_2400긴팔_상품목록B.jpg'),
    detailImage: resolveImage('downloads/[길단]_2400_18수_US핏_긴팔_(남녀공용)/detail_1.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2018/10/길단-2400-18수-US핏-긴팔-남녀공용.jpg'),
    colors: ['화이트', '스포트그레이', '네이비', '블랙', '골드'],
    sizes: [{'label': 'S', 'extraPrice': 0}, {'label': 'M', 'extraPrice': 0}, {'label': 'L', 'extraPrice': 0}, {'label': 'XL', 'extraPrice': 0}, {'label': '2XL', 'extraPrice': 3000}, {'label': '3XL', 'extraPrice': 3000}],
    tags: ['긴팔티셔츠', '길단 GILDAN'],
  },
  {
    id: 'p-098',
    name: '[길단] 76700 24수 7부 나그랑 (남녀공용)',
    price: 8000,
    originalPrice: null,
    priceText: formatPrice(
      8000
    ),
    url: 'https://www.customzone.co.kr/상품/gildan-rt76700-24round-7raglan/',
    mainImage: resolveImage('downloads/[길단]_76700_24수_7부_나그랑_(남녀공용)/main_image.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2018/10/길단_76700나그랑_상품목록B.jpg'),
    detailImage: resolveImage('downloads/[길단]_76700_24수_7부_나그랑_(남녀공용)/detail_1.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2018/10/길단-76700-24수-7부-나그랑-남녀공용.jpg'),
    colors: ['레드', '로얄블루'],
    sizes: [{'label': 'S', 'extraPrice': 0}, {'label': 'M', 'extraPrice': 0}, {'label': 'L', 'extraPrice': 0}, {'label': 'XL', 'extraPrice': 0}],
    tags: ['긴팔티셔츠', '길단 GILDAN'],
  },
  {
    id: 'p-099',
    name: '[BASIC단체티] 2134 특양면 맨투맨 (남녀공용&아동용)',
    price: 12000,
    originalPrice: null,
    priceText: formatPrice(
      12000
    ),
    url: 'https://www.customzone.co.kr/상품/cz-at2134-doublecotton-mtm/',
    mainImage: resolveImage('downloads/[BASIC단체티]_2134_특양면_맨투맨_(남녀공용&아동용)/main_image.gif', 'https://www.customzone.co.kr/wp-content/uploads/2018/10/CZ_2134_특양맨투맨_상품목록B.gif'),
    detailImage: resolveImage('downloads/[BASIC단체티]_2134_특양면_맨투맨_(남녀공용&아동용)/detail_1.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2018/10/BASIC단체티-2134-특양면-맨투맨-남녀공용아동용.jpg'),
    colors: ['연두', '노랑', '오렌지', '연분홍', '체리', '물색', '코발트', '곤색', '빨강', '자주', '보라', '수박', '아이보리', '멜란지', '진회색', '검정'],
    sizes: [{'label': '14호', 'extraPrice': 0}, {'label': '15호', 'extraPrice': 0}, {'label': '16호', 'extraPrice': 0}, {'label': '17호', 'extraPrice': 0}, {'label': '18호', 'extraPrice': 0}, {'label': 'S', 'extraPrice': 0}, {'label': 'M', 'extraPrice': 0}, {'label': 'L', 'extraPrice': 0}, {'label': 'XL', 'extraPrice': 0}, {'label': '2XL', 'extraPrice': 0}, {'label': '3XL', 'extraPrice': 1000}],
    tags: ['아동/여성티셔츠', '맨투맨', 'Basic 단체티셔츠'],
  },
  {
    id: 'p-100',
    name: '[BASIC단체티] 2134 기모맨투맨 (남녀공용)',
    price: 13000,
    originalPrice: null,
    priceText: formatPrice(
      13000
    ),
    url: 'https://www.customzone.co.kr/상품/cz-at2134-fleece-mtm/',
    mainImage: resolveImage('downloads/[BASIC단체티]_2134_기모맨투맨_(남녀공용)/main_image.gif', 'https://www.customzone.co.kr/wp-content/uploads/2018/10/CZ_2134_기모맨투맨_상품목록B.gif'),
    detailImage: resolveImage('downloads/[BASIC단체티]_2134_기모맨투맨_(남녀공용)/detail_1.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2018/10/BASIC단체티-2134-기모맨투맨-남녀공용.jpg'),
    colors: ['아이보리', '멜란지', '진회색', '검정'],
    sizes: [{'label': 'S', 'extraPrice': 0}, {'label': 'M', 'extraPrice': 0}, {'label': 'L', 'extraPrice': 0}, {'label': 'XL', 'extraPrice': 0}, {'label': '2XL', 'extraPrice': 0}, {'label': '3XL', 'extraPrice': 1000}],
    tags: ['맨투맨', 'Basic 단체티셔츠'],
  },
  {
    id: 'p-101',
    name: '[트리플에이] 1309 18수 링거티 (남녀공용)',
    price: 10000,
    originalPrice: 12000,
    priceText: formatPrice(
      10000
    ),
    url: 'https://www.customzone.co.kr/상품/aaa-1309-ringer-tshirt/',
    mainImage: resolveImage('downloads/[트리플에이]_1309_18수_링거티_(남녀공용)/main_image.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2018/10/AAA1309_상품목록B_수정.jpg'),
    detailImage: resolveImage('downloads/[트리플에이]_1309_18수_링거티_(남녀공용)/detail_1.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2022/03/트리플에이-1309-18수-링거티-남녀공용.jpg'),
    colors: ['애틀레틱헤더/블랙', '챠콜헤더/블랙'],
    sizes: [{'label': 'S', 'extraPrice': 0}, {'label': 'M', 'extraPrice': 0}, {'label': 'L', 'extraPrice': 0}, {'label': 'XL', 'extraPrice': 0}],
    tags: ['트리플에이 AAA'],
  },
  {
    id: 'p-102',
    name: '[BASIC단체티] 2135 특양면후드 (남녀공용&아동용)',
    price: 16000,
    originalPrice: null,
    priceText: formatPrice(
      16000
    ),
    url: 'https://www.customzone.co.kr/상품/cz-at2135-doublecotton-hoodie/',
    mainImage: resolveImage('downloads/[BASIC단체티]_2135_특양면후드_(남녀공용&아동용)/main_image.gif', 'https://www.customzone.co.kr/wp-content/uploads/2018/10/CZ_2135_특양면후드_상품목록B.gif'),
    detailImage: resolveImage('downloads/[BASIC단체티]_2135_특양면후드_(남녀공용&아동용)/detail_1.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2018/10/BASIC단체티-2135-특양면후드-남녀공용아동용.jpg'),
    colors: ['아이보리', '자주', '핑크', '연분홍', '곤색', '멜란지', '수박', '진회색', '노랑', '오렌지', '빨강', '검정', '연두', '물색', '코발트', '보라'],
    sizes: [{'label': '14호', 'extraPrice': 0}, {'label': '15호', 'extraPrice': 0}, {'label': '16호', 'extraPrice': 0}, {'label': '17호', 'extraPrice': 0}, {'label': '18호', 'extraPrice': 0}, {'label': 'S', 'extraPrice': 0}, {'label': 'M', 'extraPrice': 0}, {'label': 'L', 'extraPrice': 0}, {'label': 'XL', 'extraPrice': 0}, {'label': '2XL', 'extraPrice': 0}, {'label': '3XL', 'extraPrice': 1000}, {'label': '4XL', 'extraPrice': 2000}],
    tags: ['아동/여성티셔츠', '후드', 'Basic 단체티셔츠'],
  },
  {
    id: 'p-103',
    name: '[프린트스타] 141 폴로셔츠 (남녀공용)',
    price: 10000,
    originalPrice: null,
    priceText: formatPrice(
      10000
    ),
    url: 'https://www.customzone.co.kr/상품/printstar-nvp141-poloshirt/',
    mainImage: resolveImage('downloads/[프린트스타]_141_폴로셔츠_(남녀공용)/main_image.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2018/10/프린트스타_폴로_상품목록B_수정.jpg'),
    detailImage: resolveImage('downloads/[프린트스타]_141_폴로셔츠_(남녀공용)/detail_1.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2018/10/프린트스타-141-폴로셔츠-남녀공용.jpg'),
    colors: ['화이트', '데이지', '오렌지', '레드', '블랙', '라이트블루', '로얄블루', '네이비', '퍼플', '그린'],
    sizes: [{'label': 'XS', 'extraPrice': 0}, {'label': 'S', 'extraPrice': 0}, {'label': 'M', 'extraPrice': 0}, {'label': 'L', 'extraPrice': 0}, {'label': 'XL', 'extraPrice': 0}, {'label': '2XL', 'extraPrice': 1000}],
    tags: ['카라티셔츠', '프린트스타 Printstar'],
  },
  {
    id: 'p-104',
    name: '[프린트스타] 219 쮸리 맨투맨 (남녀공용,아동용)',
    price: 14000,
    originalPrice: 15000,
    priceText: formatPrice(
      14000
    ),
    url: 'https://www.customzone.co.kr/상품/printstar-mlc219-terry-mtm/',
    mainImage: resolveImage('downloads/[프린트스타]_219_쮸리_맨투맨_(남녀공용,아동용)/main_image.gif', 'https://www.customzone.co.kr/wp-content/uploads/2018/10/젤란_맨투맨_상품목록_2021.gif'),
    detailImage: resolveImage('downloads/[프린트스타]_219_쮸리_맨투맨_(남녀공용,아동용)/detail_1.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2018/10/프린트스타-219-쮸리-맨투맨-남녀공용.jpg'),
    colors: ['화이트', '모쿠그레이', '브라이트레드', '버건디', '블랙', '블루', '딥네이비', '오트밀'],
    sizes: [{'label': '100', 'extraPrice': -3000}, {'label': '110', 'extraPrice': -3000}, {'label': '120', 'extraPrice': -3000}, {'label': '130', 'extraPrice': -3000}, {'label': '140', 'extraPrice': -3000}, {'label': '150', 'extraPrice': -3000}, {'label': 'WM', 'extraPrice': 0}, {'label': 'S', 'extraPrice': 0}, {'label': 'M', 'extraPrice': 0}, {'label': 'L', 'extraPrice': 0}, {'label': 'XL', 'extraPrice': 0}, {'label': '2XL', 'extraPrice': 0}],
    tags: ['아동/여성티셔츠', '맨투맨', '프린트스타 Printstar'],
  },
  {
    id: 'p-105',
    name: '[BASIC단체티] 2136 특양면후드집업 (남녀공용)',
    price: 20000,
    originalPrice: null,
    priceText: formatPrice(
      20000
    ),
    url: 'https://www.customzone.co.kr/상품/cz-at2136-doublecotton-ziphoodie/',
    mainImage: resolveImage('downloads/[BASIC단체티]_2136_특양면후드집업_(남녀공용)/main_image.gif', 'https://www.customzone.co.kr/wp-content/uploads/2018/10/CZ_2136_특양면후드집업_상품목록B.gif'),
    detailImage: resolveImage('downloads/[BASIC단체티]_2136_특양면후드집업_(남녀공용)/detail_1.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2018/10/BASIC단체티-2136-특양면후드집업-남녀공용.jpg'),
    colors: ['아이보리', '멜란지', '진회색', '검정', '자주', '노랑', '오렌지', '연분홍', '핑크', '빨강', '연두', '물색', '코발트', '보라', '곤색', '수박'],
    sizes: [{'label': 'S', 'extraPrice': 0}, {'label': 'M', 'extraPrice': 0}, {'label': 'L', 'extraPrice': 0}, {'label': 'XL', 'extraPrice': 0}, {'label': '2XL', 'extraPrice': 0}, {'label': '3XL', 'extraPrice': 1000}],
    tags: ['후드집업', 'Basic 단체티셔츠'],
  },
  {
    id: 'p-106',
    name: '[BASIC단체티] 2137 기모후드 (남녀공용)',
    price: 18000,
    originalPrice: null,
    priceText: formatPrice(
      18000
    ),
    url: 'https://www.customzone.co.kr/상품/cz-at2137-fleece-hoodie/',
    mainImage: resolveImage('downloads/[BASIC단체티]_2137_기모후드_(남녀공용)/main_image.gif', 'https://www.customzone.co.kr/wp-content/uploads/2018/10/CZ_2136_기모후드_상품목록B.gif'),
    detailImage: resolveImage('downloads/[BASIC단체티]_2137_기모후드_(남녀공용)/detail_1.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2018/10/BASIC단체티-2137-기모후드-남녀공용.jpg'),
    colors: ['아이보리', '멜란지', '진회색', '검정', '자주', '노랑', '오렌지', '연분홍', '핑크', '빨강', '연두', '물색', '코발트', '보라', '곤색', '수박'],
    sizes: [{'label': 'S', 'extraPrice': 0}, {'label': 'M', 'extraPrice': 0}, {'label': 'L', 'extraPrice': 0}, {'label': 'XL', 'extraPrice': 0}, {'label': '2XL', 'extraPrice': 0}, {'label': '3XL', 'extraPrice': 1000}],
    tags: ['후드', 'Basic 단체티셔츠'],
  },
  {
    id: 'p-107',
    name: '[프린트스타] 216 쮸리 후드 (남녀공용,아동용)',
    price: 18000,
    originalPrice: 19000,
    priceText: formatPrice(
      18000
    ),
    url: 'https://www.customzone.co.kr/상품/printstar-mlh216-terry-hoodie/',
    mainImage: resolveImage('downloads/[프린트스타]_216_쮸리_후드_(남녀공용,아동용)/main_image.gif', 'https://www.customzone.co.kr/wp-content/uploads/2018/10/젤란_후드_상품목록_2021.gif'),
    detailImage: resolveImage('downloads/[프린트스타]_216_쮸리_후드_(남녀공용,아동용)/detail_1.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2018/10/프린트스타-216-쮸리-후드-남녀공용.jpg'),
    colors: ['화이트', '모쿠그레이', '딥네이비', '블랙', '블루', '버건디', '오트밀'],
    sizes: [{'label': '100', 'extraPrice': -3000}, {'label': '110', 'extraPrice': -3000}, {'label': '120', 'extraPrice': -3000}, {'label': '130', 'extraPrice': -3000}, {'label': '140', 'extraPrice': -3000}, {'label': '150', 'extraPrice': -3000}, {'label': 'WM', 'extraPrice': 0}, {'label': 'S', 'extraPrice': 0}, {'label': 'M', 'extraPrice': 0}, {'label': 'L', 'extraPrice': 0}, {'label': 'XL', 'extraPrice': 0}, {'label': '2XL', 'extraPrice': 0}],
    tags: ['아동/여성티셔츠', '후드', '프린트스타 Printstar'],
  },
  {
    id: 'p-108',
    name: '[BASIC단체티] 2138 기모후드집업 (남녀공용)',
    price: 21000,
    originalPrice: null,
    priceText: formatPrice(
      21000
    ),
    url: 'https://www.customzone.co.kr/상품/cz-at2138-fleece-ziphoodie/',
    mainImage: resolveImage('downloads/[BASIC단체티]_2138_기모후드집업_(남녀공용)/main_image.gif', 'https://www.customzone.co.kr/wp-content/uploads/2018/10/CZ_2138_기모후드집업_상품목록B.gif'),
    detailImage: resolveImage('downloads/[BASIC단체티]_2138_기모후드집업_(남녀공용)/detail_1.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2018/10/BASIC단체티-2138-기모후드집업-남녀공용.jpg'),
    colors: ['멜란지', '아이보리', '진회색', '검정', '곤색', '자주', '노랑', '오렌지', '연분홍', '핑크', '빨강', '연두', '수박', '물색', '코발트', '보라'],
    sizes: [{'label': 'S', 'extraPrice': 0}, {'label': 'M', 'extraPrice': 0}, {'label': 'L', 'extraPrice': 0}, {'label': 'XL', 'extraPrice': 0}, {'label': '2XL', 'extraPrice': 0}, {'label': '3XL', 'extraPrice': 1000}],
    tags: ['후드집업', 'Basic 단체티셔츠'],
  },
  {
    id: 'p-109',
    name: '[길단] 88000 기모 맨투맨(남녀공용)',
    price: 13000,
    originalPrice: 17000,
    priceText: formatPrice(
      13000
    ),
    url: 'https://www.customzone.co.kr/상품/gildan-mm88000-fleece-mtm/',
    mainImage: resolveImage('downloads/[길단]_88000_기모_맨투맨(남녀공용)/main_image.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2018/10/길단_88000맨투맨_상품목록B.jpg'),
    detailImage: resolveImage('downloads/[길단]_88000_기모_맨투맨(남녀공용)/detail_1.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2018/10/길단-88000-기모-맨투맨남녀공용.jpg'),
    colors: ['화이트', '스포트그레이', '레드', '로얄블루', '네이비', '블랙'],
    sizes: [{'label': 'XS', 'extraPrice': 0}, {'label': 'S', 'extraPrice': 0}, {'label': 'M', 'extraPrice': 0}, {'label': 'L', 'extraPrice': 0}, {'label': 'XL', 'extraPrice': 0}, {'label': '2XL', 'extraPrice': 2000}],
    tags: ['맨투맨', '브랜드 티셔츠', '길단 GILDAN'],
  },
  {
    id: 'p-110',
    name: '[길단] 12000 US핏 기모 맨투맨 (남녀공용)',
    price: 20000,
    originalPrice: 22000,
    priceText: formatPrice(
      20000
    ),
    url: 'https://www.customzone.co.kr/상품/gildan-mm12000-fleece-mtm/',
    mainImage: resolveImage('downloads/[길단]_12000_US핏_기모_맨투맨_(남녀공용)/main_image.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2018/10/길단_12000US맨투맨_상품목록B.jpg'),
    detailImage: resolveImage('downloads/[길단]_12000_US핏_기모_맨투맨_(남녀공용)/detail_1.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2018/10/길단-12000-US핏-기모-맨투맨-남녀공용.jpg'),
    colors: ['화이트', '스포트그레이', '네이비', '블랙'],
    sizes: [{'label': 'S', 'extraPrice': 0}, {'label': 'M', 'extraPrice': 0}, {'label': 'L', 'extraPrice': 0}, {'label': 'XL', 'extraPrice': 0}, {'label': '2XL', 'extraPrice': 2000}, {'label': '3XL', 'extraPrice': 2000}],
    tags: ['맨투맨', '길단 GILDAN'],
  },
  {
    id: 'p-111',
    name: '[프린트스타] 217 쮸리 후드집업 (남녀공용,아동용)',
    price: 22000,
    originalPrice: 23000,
    priceText: formatPrice(
      22000
    ),
    url: 'https://www.customzone.co.kr/상품/printstar-mlz217-terry-ziphoodie/',
    mainImage: resolveImage('downloads/[프린트스타]_217_쮸리_후드집업_(남녀공용,아동용)/main_image.gif', 'https://www.customzone.co.kr/wp-content/uploads/2018/10/젤란_후드집업_상품목록_2021.gif'),
    detailImage: resolveImage('downloads/[프린트스타]_217_쮸리_후드집업_(남녀공용,아동용)/detail_1.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2018/10/프린트스타-217-쮸리-후드집업-남녀공용.jpg'),
    colors: ['화이트', '모쿠그레이', '버건디', '블랙', '블루', '딥네이비', '오트밀'],
    sizes: [{'label': '100', 'extraPrice': -3000}, {'label': '110', 'extraPrice': -3000}, {'label': '120', 'extraPrice': -3000}, {'label': '130', 'extraPrice': -3000}, {'label': '140', 'extraPrice': -3000}, {'label': '150', 'extraPrice': -3000}, {'label': 'WM', 'extraPrice': 0}, {'label': 'S', 'extraPrice': 0}, {'label': 'M', 'extraPrice': 0}, {'label': 'L', 'extraPrice': 0}, {'label': 'XL', 'extraPrice': 0}, {'label': '2XL', 'extraPrice': 0}],
    tags: ['아동/여성티셔츠', '후드집업', '프린트스타 Printstar'],
  },
  {
    id: 'p-112',
    name: '[길단] 12500 US핏 기모 후드 (남녀공용)',
    price: 26000,
    originalPrice: 28000,
    priceText: formatPrice(
      26000
    ),
    url: 'https://www.customzone.co.kr/상품/gildan-ht12500-usfit-fleece-hoodie/',
    mainImage: resolveImage('downloads/[길단]_12500_US핏_기모_후드_(남녀공용)/main_image.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2018/10/리스트_길단_12500후드.jpg'),
    detailImage: resolveImage('downloads/[길단]_12500_US핏_기모_후드_(남녀공용)/detail_1.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2018/10/길단-12500-US핏-기모-후드-남녀공용.jpg'),
    colors: ['화이트', '애쉬그레이', '스포트그레이', '블랙', '로얄블루', '네이비', '레드', '마룬', '포레스트그린', '오렌지'],
    sizes: [{'label': 'S', 'extraPrice': 0}, {'label': 'M', 'extraPrice': 0}, {'label': 'L', 'extraPrice': 0}, {'label': 'XL', 'extraPrice': 0}, {'label': '2XL', 'extraPrice': 3000}, {'label': '3XL', 'extraPrice': 3000}],
    tags: ['후드', '길단 GILDAN'],
  },
  {
    id: 'p-113',
    name: '[길단] 18500 US핏 기모 후드 (남녀공용)',
    price: 26000,
    originalPrice: 28000,
    priceText: formatPrice(
      26000
    ),
    url: 'https://www.customzone.co.kr/상품/gildan-ht18500-usfit-fleece-hoodie/',
    mainImage: resolveImage('downloads/[길단]_18500_US핏_기모_후드_(남녀공용)/main_image.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2018/10/길단_18500후드_상품목록B.jpg'),
    detailImage: resolveImage('downloads/[길단]_18500_US핏_기모_후드_(남녀공용)/detail_1.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2018/10/길단-18500-US핏-기모-후드-남녀공용.jpg'),
    colors: ['샌드', '골드', '라이트핑크', '스포트그레이', '블랙'],
    sizes: [{'label': 'S', 'extraPrice': 0}, {'label': 'M', 'extraPrice': 0}, {'label': 'L', 'extraPrice': 0}, {'label': 'XL', 'extraPrice': 0}, {'label': '2XL', 'extraPrice': 2000}, {'label': '3XL', 'extraPrice': 4000}, {'label': '4XL', 'extraPrice': 6000}],
    tags: ['후드', '길단 GILDAN'],
  },
  {
    id: 'p-114',
    name: '[길단] 88500 기모 후드 (남녀공용)',
    price: 19000,
    originalPrice: 21000,
    priceText: formatPrice(
      19000
    ),
    url: 'https://www.customzone.co.kr/상품/gildan-ht88500-fleece-hoodie/',
    mainImage: resolveImage('downloads/[길단]_88500_기모_후드_(남녀공용)/main_image.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2018/10/길단_88500후드_상품목록B.jpg'),
    detailImage: resolveImage('downloads/[길단]_88500_기모_후드_(남녀공용)/detail_1.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2018/10/길단-88500-기모-후드-남녀공용.jpg'),
    colors: ['화이트', '스포트그레이', '다크헤더', '블랙', '로얄블루', '네이비', '레드'],
    sizes: [{'label': 'XS', 'extraPrice': 0}, {'label': 'S', 'extraPrice': 0}, {'label': 'M', 'extraPrice': 0}, {'label': 'L', 'extraPrice': 0}, {'label': 'XL', 'extraPrice': 0}, {'label': '2XL', 'extraPrice': 1000}],
    tags: ['후드', '길단 GILDAN'],
  },
  {
    id: 'p-115',
    name: '[길단] 88600 기모 후드집업 (남녀공용)',
    price: 21000,
    originalPrice: 24000,
    priceText: formatPrice(
      21000
    ),
    url: 'https://www.customzone.co.kr/상품/gildan-hz88600-fleece-ziphoodie/',
    mainImage: resolveImage('downloads/[길단]_88600_기모_후드집업_(남녀공용)/main_image.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2018/10/길단_88600후드_상품목록B.jpg'),
    detailImage: resolveImage('downloads/[길단]_88600_기모_후드집업_(남녀공용)/detail_1.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2018/10/길단-88600-기모-후드집업-남녀공용.jpg'),
    colors: ['화이트', '스포트그레이', '네이비', '다크헤더', '레드', '블랙'],
    sizes: [{'label': 'XS', 'extraPrice': 0}, {'label': 'S', 'extraPrice': 0}, {'label': 'M', 'extraPrice': 0}, {'label': 'L', 'extraPrice': 0}, {'label': 'XL', 'extraPrice': 0}, {'label': '2XL', 'extraPrice': 2000}],
    tags: ['후드집업', '길단 GILDAN'],
  },
  {
    id: 'p-116',
    name: '[Fill It] 시그니쳐 오버핏 기모 후드 (남여공용&아동용)',
    price: 35000,
    originalPrice: null,
    priceText: formatPrice(
      35000
    ),
    url: 'https://www.customzone.co.kr/상품/fillit-overfit-fleece-hoodie/',
    mainImage: resolveImage('downloads/[Fill_It]_시그니쳐_오버핏_기모_후드_(남여공용&아동용)/main_image.gif', 'https://www.customzone.co.kr/wp-content/uploads/2018/10/필잇_시그니쳐기모후드_상품목록B.gif'),
    detailImage: resolveImage('downloads/[Fill_It]_시그니쳐_오버핏_기모_후드_(남여공용&아동용)/detail_1.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2018/10/Fill-It-시그니쳐-오버핏-기모-후드.jpg'),
    colors: ['멜란지', '민트', '먹색', '블랙', '카키', '베이지', '겨자', '레드', '카멜', '와인', '공군', '네이비', '핑크', '퍼플', '코발트'],
    sizes: [{'label': '아동-110', 'extraPrice': -1000}, {'label': '아동-120', 'extraPrice': -1000}, {'label': '아동-130', 'extraPrice': -1000}, {'label': '아동-140', 'extraPrice': -1000}, {'label': '아동-150', 'extraPrice': -1000}, {'label': '아동-160', 'extraPrice': -1000}, {'label': 'S', 'extraPrice': 0}, {'label': 'M', 'extraPrice': 0}, {'label': 'L', 'extraPrice': 0}, {'label': 'XL', 'extraPrice': 0}, {'label': '2XL', 'extraPrice': 0}, {'label': '3XL', 'extraPrice': 2000}, {'label': '4XL', 'extraPrice': 4000}, {'label': '5XL', 'extraPrice': 6500}, {'label': '6XL', 'extraPrice': 8500}],
    tags: ['후드', '필잇 FILL IT'],
  },
  {
    id: 'p-117',
    name: '[Fill It] 시그니쳐 오버핏 기모 맨투맨 (남녀공용)',
    price: 25000,
    originalPrice: null,
    priceText: formatPrice(
      25000
    ),
    url: 'https://www.customzone.co.kr/상품/fillit-overfit-fleece-mtm/',
    mainImage: resolveImage('downloads/[Fill_It]_시그니쳐_오버핏_기모_맨투맨_(남녀공용)/main_image.gif', 'https://www.customzone.co.kr/wp-content/uploads/2018/10/필잇_기모맨투맨_상품목록B.gif'),
    detailImage: resolveImage('downloads/[Fill_It]_시그니쳐_오버핏_기모_맨투맨_(남녀공용)/detail_1.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2018/10/Fill-It-시그니쳐-오버핏-기모-맨투맨-남녀공용.jpg'),
    colors: ['화이트', '크림', '그레이', '블랙', '멜란지', '챠콜', '라임', '레드', '네이비', '퍼플', '핑크'],
    sizes: [{'label': 'S', 'extraPrice': 0}, {'label': 'M', 'extraPrice': 0}, {'label': 'L', 'extraPrice': 0}, {'label': 'XL', 'extraPrice': 0}, {'label': '2XL', 'extraPrice': 0}, {'label': '3XL', 'extraPrice': 2000}, {'label': '4XL', 'extraPrice': 4000}, {'label': '5XL', 'extraPrice': 6500}, {'label': '6XL', 'extraPrice': 8500}],
    tags: ['맨투맨', '필잇 FILL IT'],
  },
  {
    id: 'p-118',
    name: '[Fill It] 시그니쳐 오버핏 기모 후드집업 (남녀공용)',
    price: 39000,
    originalPrice: null,
    priceText: formatPrice(
      39000
    ),
    url: 'https://www.customzone.co.kr/상품/fillit-overfit-fleece-ziphoodie/',
    mainImage: resolveImage('downloads/[Fill_It]_시그니쳐_오버핏_기모_후드집업_(남녀공용)/main_image.gif', 'https://www.customzone.co.kr/wp-content/uploads/2018/10/필잇_시그니쳐기모후드집업_상품목록B.gif'),
    detailImage: resolveImage('downloads/[Fill_It]_시그니쳐_오버핏_기모_후드집업_(남녀공용)/detail_1.jpg', 'https://www.customzone.co.kr/wp-content/uploads/2018/10/Fill-It시그니쳐오버핏기모후드집업남녀공용_사이즈표.jpg'),
    colors: ['멜란지', '민트', '먹색', '블랙', '코코아', '카멜', '와인', '핑크', '카키', '공군', '네이비', '수박', '연그레이'],
    sizes: [{'label': 'S', 'extraPrice': 0}, {'label': 'M', 'extraPrice': 0}, {'label': 'L', 'extraPrice': 0}, {'label': 'XL', 'extraPrice': 0}, {'label': '2XL', 'extraPrice': 0}, {'label': '3XL', 'extraPrice': 2000}, {'label': '4XL', 'extraPrice': 4000}, {'label': '5XL', 'extraPrice': 6500}, {'label': '6XL', 'extraPrice': 8500}],
    tags: ['후드집업', '필잇 FILL IT'],
  },
];
