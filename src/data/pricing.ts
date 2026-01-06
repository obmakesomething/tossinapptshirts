export const FREE_SHIPPING_THRESHOLD = 70000;
export const SHIPPING_FEE = 3000;
export const MARGIN_TARGET = 0.22;
export const MARGIN_MIN = 0.2;
export const MARGIN_MAX = 0.25;
export const ROUND_STEP = 1000;

const roundToStep = (value: number, step: number) =>
  Math.round(value / step) * step;

const ceilToStep = (value: number, step: number) =>
  Math.ceil(value / step) * step;

const floorToStep = (value: number, step: number) =>
  Math.floor(value / step) * step;

export function calcPricing(baseSubtotal: number, quantity: number) {
  const subtotal = baseSubtotal * quantity;
  const shippingFee = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
  const baseTotal = subtotal + shippingFee;
  if (baseTotal <= 0) {
    return {
      subtotal,
      shippingFee,
      baseTotal,
      customerTotal: baseTotal,
      marginAmount: 0,
      marginRate: 0,
    };
  }
  const target = baseTotal * (1 + MARGIN_TARGET);
  let rounded = roundToStep(target, ROUND_STEP);
  let marginRate = (rounded - baseTotal) / baseTotal;
  if (marginRate < MARGIN_MIN) {
    rounded = ceilToStep(baseTotal * (1 + MARGIN_MIN), ROUND_STEP);
  } else if (marginRate > MARGIN_MAX) {
    rounded = floorToStep(baseTotal * (1 + MARGIN_MAX), ROUND_STEP);
  }
  marginRate = (rounded - baseTotal) / baseTotal;
  return {
    subtotal,
    shippingFee,
    baseTotal,
    customerTotal: rounded,
    marginAmount: rounded - baseTotal,
    marginRate,
  };
}
