import { getGarmentStageBackground, isLightGarmentColor } from './garmentContrast';

describe('garmentContrast', () => {
  test('detects light garment colors', () => {
    expect(isLightGarmentColor('화이트')).toBe(true);
    expect(isLightGarmentColor('White')).toBe(true);
    expect(isLightGarmentColor('아이보리')).toBe(true);
  });

  test('keeps non-light garment colors as false', () => {
    expect(isLightGarmentColor('블랙')).toBe(false);
    expect(isLightGarmentColor('네이비')).toBe(false);
  });

  test('returns gray background only for light garment colors', () => {
    expect(getGarmentStageBackground('화이트', 'transparent')).toBe('#E3E8EF');
    expect(getGarmentStageBackground('블랙', 'transparent')).toBe('transparent');
  });
});
