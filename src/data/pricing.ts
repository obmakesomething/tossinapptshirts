import type { CatalogProduct } from './catalog';
import type { PrintOption } from './printOptions';

// 가격 정책
export const SHIPPING_FEE = 3000;
export const FREE_SHIPPING_THRESHOLD = 60000;

// 카테고리별 기본 가격 (프린팅 포함)
export const BASE_PRICES: Record<string, number> = {
  티셔츠: 30000,
  맨투맨: 40000,
  후드: 45000,
  에코백: 15000,
};

export type OrderLine = {
  id: string;
  sizeLabel: string;
  quantity: number;
};

export type PricingInput = {
  product: CatalogProduct;
  orderLines: OrderLine[];
  printOption: PrintOption;
  printBackEnabled: boolean;
};

export type PricingResult = {
  subtotal: number;
  shippingFee: number;
  total: number;
  // 추가 비용 표시용
  backPrintingFee: number;
  largePrintFee: number;
};

export function calcPricing(input: PricingInput): PricingResult {
  const { product, orderLines, printOption, printBackEnabled } = input;

  // 기본 단가 (카테고리별)
  const basePrice = BASE_PRICES[product.category] ?? 19000;

  // 총 수량
  const totalQuantity = orderLines.reduce(
    (sum, line) => sum + line.quantity,
    0,
  );

  // 기본 금액 계산 (사이즈 추가금 포함)
  let itemsTotal = 0;
  for (const line of orderLines) {
    const sizeInfo = product.sizes.find((s) => s.label === line.sizeLabel);
    const sizeExtraPrice = sizeInfo?.extraPrice ?? 0;
    itemsTotal += (basePrice + sizeExtraPrice) * line.quantity;
  }

  // 추가 옵션 계산
  const backPrintingFee = printBackEnabled ? 6000 * totalQuantity : 0;
  const largePrintFee = printOption.id === 'large' ? 2000 * totalQuantity : 0;

  // 소계
  const subtotal = itemsTotal + backPrintingFee + largePrintFee;

  // 배송비 (60,000원 이상 무료)
  const shippingFee = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;

  // 최종 합계
  const total = subtotal + shippingFee;

  return {
    subtotal,
    shippingFee,
    total,
    backPrintingFee,
    largePrintFee,
  };
}
