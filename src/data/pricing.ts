export const UNIT_PRICE = 35000;
export const BULK_UNIT_PRICE = 30000;
export const BULK_UNIT_THRESHOLD = 3;
export const FREE_SHIPPING_THRESHOLD_QTY = 2;
export const SHIPPING_FEE = 3000;

export function calcPricing(quantity: number) {
  const safeQuantity = Math.max(1, quantity);
  const unitPrice =
    safeQuantity >= BULK_UNIT_THRESHOLD ? BULK_UNIT_PRICE : UNIT_PRICE;
  const subtotal = unitPrice * safeQuantity;
  const shippingFee = safeQuantity >= FREE_SHIPPING_THRESHOLD_QTY ? 0 : SHIPPING_FEE;
  const total = subtotal + shippingFee;
  return {
    unitPrice,
    subtotal,
    shippingFee,
    total,
  };
}
