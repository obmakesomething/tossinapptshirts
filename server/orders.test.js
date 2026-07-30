const {
  toAmount,
  summarizeLines,
  resolvePrintSides,
  toSummary,
  toDetail,
} = require('./orders');

describe('toAmount', () => {
  it('recovers an integer from the pre-formatted currency the client sends', () => {
    // order.tsx builds pricing with formatPrice(), so the server never receives
    // a number here.
    expect(toAmount('₩24,000')).toBe(24000);
    expect(toAmount('24,000원')).toBe(24000);
  });

  it('treats non-numeric labels as zero', () => {
    expect(toAmount('무료')).toBe(0);
    expect(toAmount(undefined)).toBe(0);
    expect(toAmount(null)).toBe(0);
    expect(toAmount('')).toBe(0);
  });

  it('passes numbers through, rounding floats', () => {
    expect(toAmount(24000)).toBe(24000);
    expect(toAmount(24000.4)).toBe(24000);
    expect(toAmount(Number.NaN)).toBe(0);
  });
});

describe('summarizeLines', () => {
  it('renders the per-size summary both order screens display', () => {
    expect(
      summarizeLines([
        { size: 'M', quantity: 1 },
        { size: 'L', quantity: 2 },
      ]),
    ).toBe('M 1개 · L 2개');
  });

  it('defaults a missing quantity to one and drops sizeless items', () => {
    expect(summarizeLines([{ size: 'M' }, { quantity: 3 }])).toBe('M 1개');
  });

  it('survives an absent items array', () => {
    expect(summarizeLines()).toBe('');
    expect(summarizeLines([])).toBe('');
  });
});

describe('resolvePrintSides', () => {
  it('reports both sides when any item prints on the back', () => {
    expect(resolvePrintSides([{ print: { placement: 'front/back' } }])).toBe('앞면 + 뒷면');
  });

  it('reports front only otherwise', () => {
    expect(resolvePrintSides([{ print: { placement: 'front' } }])).toBe('앞면');
    expect(resolvePrintSides([{}])).toBe('앞면');
    expect(resolvePrintSides()).toBe('앞면');
  });
});

describe('row mapping', () => {
  const row = {
    order_id: 'MG-1750000000000',
    user_id: 'uk_123',
    status: 'producing',
    product_name: '베이직 티셔츠',
    color: '블랙',
    lines: 'M 1개',
    print_sides: '앞면',
    total_amount: 24000,
    recipient: '홍길동',
    phone: '010-0000-0000',
    address: '서울시 어딘가 101호',
    memo: null,
    tracking_carrier: null,
    tracking_number: null,
    created_at: new Date('2026-07-30T04:05:06.000Z'),
  };

  it('maps to the summary shape the list screen types', () => {
    expect(toSummary(row)).toEqual({
      id: 'MG-1750000000000',
      orderNumber: 'MG-1750000000000',
      productName: '베이직 티셔츠',
      color: '블랙',
      lines: 'M 1개',
      total: 24000,
      status: 'producing',
      statusLabel: '제작 중',
      expectedDate: undefined,
    });
  });

  it('marks the timeline complete up to the current status', () => {
    const detail = toDetail(row);
    expect(detail.timeline.map((step) => step.completed)).toEqual([true, true, false, false]);
    expect(detail.timeline.map((step) => step.label)).toEqual([
      '주문 접수',
      '제작 중',
      '배송 중',
      '배송 완료',
    ]);
  });

  it('formats the order date and omits absent optional fields', () => {
    const detail = toDetail(row);
    expect(detail.orderDate).toBe('2026-07-30');
    expect(detail.memo).toBeUndefined();
    expect(detail.trackingNumber).toBeUndefined();
  });

  it('does not leak the user id or raw row into the detail payload', () => {
    // The detail response goes straight to the client, so it must not carry
    // the Toss user key.
    expect(Object.keys(toDetail(row))).not.toContain('user_id');
    expect(JSON.stringify(toDetail(row))).not.toContain('uk_123');
  });
});
