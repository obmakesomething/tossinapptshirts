import { formatPrice } from '../utils/format';
import { catalogProducts, type CatalogProduct } from './catalog';
import type { PrintOption } from './printOptions';

// 가격 정책
export const SHIPPING_FEE = 3000;
export const FREE_SHIPPING_THRESHOLD = 60000;

/**
 * One rendering of the shipping rule, for every screen that states it.
 *
 * The threshold was one constant and five hand-written sentences: 6만원 이상
 * 무료 on home and in the editor, ₩60,000 이상 무료배송 on the preview and
 * again on home, 60,000원 이상 무료 in the terms. The same rule in three
 * formats reads like three rules, and changing the threshold meant finding
 * five strings — the same drift that once had a hoodie showing one price and
 * charging another.
 */
export const FREE_SHIPPING_TEXT = `${formatPrice(FREE_SHIPPING_THRESHOLD)} 이상 무료배송`;
export const SHIPPING_SUMMARY_TEXT = `배송비 ${formatPrice(SHIPPING_FEE)} · ${FREE_SHIPPING_TEXT}`;

/**
 * Charge what the screen says. Not a second opinion about it.
 *
 * This was a hand-written table beside the catalogue's own prices, and the two
 * had drifted: a hoodie showed ₩55,000 and charged ₩45,000, a sweatshirt showed
 * ₩45,000 and charged ₩40,000. Only the t-shirt agreed. Deriving the table from
 * the catalogue means a price can only be wrong in one place, and the number a
 * customer reads is the number they pay.
 */
export const BASE_PRICES: Record<string, number> = Object.fromEntries(
  catalogProducts.map((product) => [product.category, product.price ?? 0]),
);

export type OrderLine = {
  id: string;
  sizeLabel: string;
  quantity: number;
};

export type PricingInput = {
  product: CatalogProduct;
  orderLines: OrderLine[];
  /** Kept on the input so callers need no change; nothing is priced off it. */
  printOption?: PrintOption;
  printBackEnabled: boolean;
};

export type PricingResult = {
  subtotal: number;
  shippingFee: number;
  total: number;
  // 추가 비용 표시용
  backPrintingFee: number;
};

export function calcPricing(input: PricingInput): PricingResult {
  const { product, orderLines, printBackEnabled } = input;

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

  // 소계
  const subtotal = itemsTotal + backPrintingFee;

  // 배송비 (60,000원 이상 무료)
  const shippingFee = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;

  // 최종 합계
  const total = subtotal + shippingFee;

  return {
    subtotal,
    shippingFee,
    total,
    backPrintingFee,
  };
}
