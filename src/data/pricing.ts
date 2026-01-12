import type { CatalogProduct, SizeOption } from './catalog';
import type { PrintOption } from './printOptions';

// 가격 정책
export const SHIPPING_FEE = 3000;
export const FREE_SHIPPING_THRESHOLD = 60000;

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
  itemsSubtotal: number;
  printingCost: number;
  subtotal: number;
  shippingFee: number;
  total: number;
  breakdown: Array<{
    size: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }>;
};

export function calcPricing(input: PricingInput): PricingResult {
  const { product, orderLines, printOption, printBackEnabled } = input;

  // 각 주문 라인별 계산
  const breakdown = orderLines.map((line) => {
    const sizeInfo = product.sizes.find((s) => s.label === line.sizeLabel);
    const sizeExtraPrice = sizeInfo?.extraPrice ?? 0;

    // 단가 = 블랭크 가격 + 사이즈 추가금
    const unitPrice = (product.price ?? 0) + sizeExtraPrice;
    const lineTotal = unitPrice * line.quantity;

    return {
      size: line.sizeLabel,
      quantity: line.quantity,
      unitPrice,
      lineTotal,
    };
  });

  // 상품 소계
  const itemsSubtotal = breakdown.reduce((sum, item) => sum + item.lineTotal, 0);

  // 총 수량
  const totalQuantity = orderLines.reduce((sum, line) => sum + line.quantity, 0);

  // 프린팅 비용 = (앞면 프린팅 비용 + 뒷면 프린팅 비용) × 총 수량
  const printCostPerItem = printOption.price + (printBackEnabled ? printOption.price : 0);
  const printingCost = printCostPerItem * totalQuantity;

  // 소계 (상품 + 프린팅)
  const subtotal = itemsSubtotal + printingCost;

  // 배송비 (60,000원 이상 무료)
  const shippingFee = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;

  // 최종 합계
  const total = subtotal + shippingFee;

  return {
    itemsSubtotal,
    printingCost,
    subtotal,
    shippingFee,
    total,
    breakdown,
  };
}
