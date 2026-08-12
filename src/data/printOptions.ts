export type PrintOption = {
  id: 'standard';
  label: string;
  description: string;
  price: number;
  designScale: number;
};

/**
 * One tier. There was a second — A3, +₩2,000 — with no way to select it:
 * resolveAutoPrint always returned 'standard', so the fee could never apply and
 * the customer could never buy it. The printable size a design occupies is set
 * in the editor by scaling the artwork, which is the control that actually
 * exists.
 */
export const printOptions: PrintOption[] = [
  {
    id: 'standard',
    label: 'A4 미만',
    description: '일반 크기',
    price: 6000,
    designScale: 0.7,
  },
];
