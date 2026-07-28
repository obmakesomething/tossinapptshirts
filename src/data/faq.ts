export type FAQItem = {
  id: string;
  question: string;
  answer: string;
  category: string;
};

export type FAQCategory = {
  id: string;
  title: string;
};

export const faqCategories: FAQCategory[] = [
  { id: 'product', title: '제작/품질' },
  { id: 'delivery', title: '배송/사이즈' },
  { id: 'care', title: '세탁/관리' },
  { id: 'refund', title: '교환/환불' },
];

export const faqItems: FAQItem[] = [
  // ── 제작/품질 ──
  {
    id: 'product-1',
    question: '어떤 제품으로 제작하나요?',
    answer: 'Printstar 제품으로 제작합니다. 티셔츠 면100%(250g), 후드·맨투맨 면100%(285g, 쭈리 원단).',
    category: 'product',
  },
  {
    id: 'product-2',
    question: '화면 색이랑 실물이 다를 수 있나요?',
    answer: '디스플레이 환경과 원단/공정 특성상 색상·위치에 미세한 차이가 발생할 수 있습니다.',
    category: 'product',
  },

  // ── 배송/사이즈 ──
  {
    id: 'delivery-1',
    question: '제작·배송 기간이 얼마나 걸리나요?',
    answer: '보통 7-14일(제작+배송) 소요됩니다. 성수기에는 더 걸릴 수 있어요.',
    category: 'delivery',
  },
  {
    id: 'delivery-2',
    question: '사이즈 기준은 뭔가요?',
    answer: '상세페이지의 실측(단면) 사이즈표가 기준이며, 원단 특성상 약 2cm 오차가 있을 수 있습니다.',
    category: 'delivery',
  },

  // ── 세탁/관리 ──
  {
    id: 'care-1',
    question: '세탁은 어떻게 해야 하나요?',
    answer: '뒤집어서 찬물 단독 세탁, 중성세제, 세탁망 권장. 표백제·건조기는 피해 주세요.',
    category: 'care',
  },
  {
    id: 'care-2',
    question: '다림질 가능한가요?',
    answer: '인쇄면에 직접 열을 피해 주세요. 천을 덮고 낮은 온도로 진행하면 됩니다.',
    category: 'care',
  },

  // ── 교환/환불 ──
  {
    id: 'refund-1',
    question: '단순 변심 교환/환불 가능한가요?',
    answer: '주문 후 개별 제작 특성상 단순 변심은 교환·환불이 제한됩니다. 불량(프린팅 결함, 오배송)은 교환/재제작 가능.',
    category: 'refund',
  },
  {
    id: 'refund-2',
    question: '주문 취소나 변경은 가능한가요?',
    answer: '제작 시작 전에는 확인해 드려요. 제작 시작 후에는 제한됩니다. 1:1 문의로 주문번호와 함께 요청해 주세요.',
    category: 'refund',
  },
  {
    id: 'refund-3',
    question: '타 브랜드 로고/초상권 이미지로 제작 가능한가요?',
    answer: '불가합니다. 권리침해 소지가 있는 콘텐츠는 AI 생성 여부와 무관하게 제작하지 않습니다.',
    category: 'refund',
  },
];
