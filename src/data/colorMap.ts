const colorMap: Record<string, string> = {
  white: '#F8FAFC',
  black: '#111827',
  gray: '#9CA3AF',
  grey: '#9CA3AF',
  navy: '#1E3A8A',
  red: '#DC2626',
  blue: '#2563EB',
  lightblue: '#7DD3FC',
  lightpink: '#F9A8D4',
  burgundy: '#7F1D1D',
  khaki: '#6B7280',
  beige: '#E7D6C4',
  ivory: '#F5F5F4',
  charcoal: '#374151',
  melange: '#9CA3AF',
  yellow: '#FACC15',
  orange: '#FB923C',
  green: '#16A34A',
  mint: '#5EEAD4',
  purple: '#A78BFA',
  brown: '#92400E',
  pink: '#F472B6',
};

const koreanMap: Record<string, string> = {
  화이트: 'white',
  백색: 'white',
  블랙: 'black',
  블루: 'blue',
  네이비: 'navy',
  레드: 'red',
  버건디: 'burgundy',
  와인: 'burgundy',
  그레이: 'gray',
  회색: 'gray',
  차콜: 'charcoal',
  헤더그레이: 'gray',
  헤자차콜: 'charcoal',
  멜란지: 'melange',
  옐로우: 'yellow',
  옐로: 'yellow',
  오렌지: 'orange',
  그린: 'green',
  아미그린: 'green',
  카키: 'khaki',
  베이지: 'beige',
  아이보리: 'ivory',
  핑크: 'pink',
  라이트핑크: 'lightpink',
  라이트블루: 'lightblue',
  민트: 'mint',
  퍼플: 'purple',
  브라운: 'brown',
};

const fallbackColor = '#E2E8F0';

const normalizeKey = (value: string) =>
  value.toLowerCase().replace(/\s+/g, '').replace(/[-_]/g, '');

export function resolveColorValue(name: string) {
  const trimmed = name.trim();
  const mapped = koreanMap[trimmed];
  if (mapped) {
    return colorMap[mapped] ?? fallbackColor;
  }
  const normalized = normalizeKey(trimmed);
  return colorMap[normalized] ?? fallbackColor;
}
