export type PrintOption = {
  id: 'logo' | 'a5' | 'a4' | 'a3';
  label: string;
  description: string;
  price: number;
  designScale: number;
};

export const printOptions: PrintOption[] = [
  {
    id: 'logo',
    label: '로고 (10cm 미만)',
    description: '작은 로고·심플',
    price: 2500,
    designScale: 0.35,
  },
  {
    id: 'a5',
    label: 'A5 (10~15cm)',
    description: '중간 크기',
    price: 5500,
    designScale: 0.5,
  },
  {
    id: 'a4',
    label: 'A4 (15~28cm)',
    description: '일반 포스터 크기',
    price: 7500,
    designScale: 0.7,
  },
  {
    id: 'a3',
    label: 'A3 (최대)',
    description: '큰 전면 인쇄',
    price: 9500,
    designScale: 0.9,
  },
];
