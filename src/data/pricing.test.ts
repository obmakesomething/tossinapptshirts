import { BASE_PRICES, calcPricing, SHIPPING_FEE } from './pricing';
import { catalogProducts } from './catalog';

/**
 * The price on the screen and the price charged were two different tables that
 * had drifted apart: a hoodie displayed ₩55,000 and billed ₩45,000. These pin
 * the rule that replaced them — the catalogue is the only place a price lives.
 */
describe('a garment costs what the catalogue says it costs', () => {
  it.each(catalogProducts.map((p) => [p.name, p] as const))(
    '%s is charged at its listed price',
    (_name, product) => {
      const pricing = calcPricing({
        product,
        orderLines: [{ id: 'l1', sizeLabel: product.sizes[0]!.label, quantity: 1 }],
        printBackEnabled: false,
      });
      // The first size carries no surcharge, so the item total is the list price.
      expect(pricing.subtotal).toBe(product.price);
      expect(BASE_PRICES[product.category]).toBe(product.price);
    },
  );

  it('covers every category the catalogue sells and invents none', () => {
    expect(Object.keys(BASE_PRICES).sort()).toEqual(
      [...new Set(catalogProducts.map((p) => p.category))].sort(),
    );
  });

  it('adds the size surcharge on top of the listed price', () => {
    const product = catalogProducts.find((p) =>
      p.sizes.some((s) => s.extraPrice > 0),
    )!;
    const size = product.sizes.find((s) => s.extraPrice > 0)!;
    const pricing = calcPricing({
      product,
      orderLines: [{ id: 'l1', sizeLabel: size.label, quantity: 1 }],
      printBackEnabled: false,
    });
    expect(pricing.subtotal).toBe((product.price ?? 0) + size.extraPrice);
  });

  it('charges shipping until the order clears the free threshold', () => {
    const tee = catalogProducts.find((p) => p.category === '티셔츠')!;
    const one = calcPricing({
      product: tee,
      orderLines: [{ id: 'l1', sizeLabel: 'M', quantity: 1 }],
      printBackEnabled: false,
    });
    const three = calcPricing({
      product: tee,
      orderLines: [{ id: 'l1', sizeLabel: 'M', quantity: 3 }],
      printBackEnabled: false,
    });
    expect(one.shippingFee).toBe(SHIPPING_FEE);
    expect(three.shippingFee).toBe(0);
    expect(one.total).toBe(one.subtotal + SHIPPING_FEE);
  });
});
