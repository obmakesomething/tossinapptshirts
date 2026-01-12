export type PrintOption = {
  id: 'standard' | 'large';
  label: string;
  description: string;
  price: number;
  designScale: number;
};

export const printOptions: PrintOption[] = [
  {
    id: 'standard',
    label: 'A4 미만',
    description: '일반 크기',
    price: 6000,
    designScale: 0.7,
  },
  {
    id: 'large',
    label: 'A4 초과 (A3)',
    description: '큰 전면 인쇄',
    price: 8000,
    designScale: 0.9,
  },
];
