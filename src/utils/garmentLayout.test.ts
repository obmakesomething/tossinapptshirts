import { containRect, printAreaRect } from './garmentLayout';

describe('containRect', () => {
  it('letterboxes a tall mockup inside a wider box', () => {
    // 2:3 image in a 1:1 box: full height, centred horizontally.
    expect(
      containRect({ boxWidth: 600, boxHeight: 600, imageAspect: 2 / 3 }),
    ).toEqual({ left: 100, top: 0, width: 400, height: 600 });
  });

  it('letterboxes a wide mockup inside a taller box', () => {
    expect(
      containRect({ boxWidth: 600, boxHeight: 600, imageAspect: 2 }),
    ).toEqual({ left: 0, top: 150, width: 600, height: 300 });
  });

  it('fills the box exactly when the aspects match', () => {
    expect(
      containRect({ boxWidth: 400, boxHeight: 600, imageAspect: 2 / 3 }),
    ).toEqual({ left: 0, top: 0, width: 400, height: 600 });
  });

  it('falls back to the whole box while the size is still unknown', () => {
    expect(
      containRect({ boxWidth: 300, boxHeight: 500, imageAspect: null }),
    ).toEqual({ left: 0, top: 0, width: 300, height: 500 });
  });
});

describe('printAreaRect', () => {
  it('measures the print area against the garment, not the box', () => {
    // The garment is inset 100px from the left and 50px from the top of its box.
    const garment = { left: 100, top: 50, width: 400, height: 600 };
    expect(
      printAreaRect(garment, { x: 0.25, y: 0.2, width: 0.5, height: 0.3 }),
    ).toEqual({ left: 200, top: 170, width: 200, height: 180 });
  });
});

import { garmentFitRect } from './garmentLayout';
import { garmentBoxByMockup } from '../data/mockupTemplates';

/**
 * The mockups were cropped separately and disagree about how much of the frame
 * the garment fills — the white tee 63% of its height, the black one all of
 * it. Fitting the photograph made the shirt change size on a colour change,
 * and left the default garment sitting in a third of a screen of background.
 */
describe('the garment fills the stage, whichever photo it came from', () => {
  const STAGE = { boxWidth: 327, boxHeight: 552 };

  function drawnGarment(file: string, imageAspect: number) {
    const box = garmentBoxByMockup[file]!;
    const rect = garmentFitRect({ ...STAGE, imageAspect, garmentBox: box });
    return {
      width: rect.width * box.width,
      height: rect.height * box.height,
      centreX: rect.left + rect.width * (box.x + box.width / 2),
      centreY: rect.top + rect.height * (box.y + box.height / 2),
    };
  }

  it('draws the white and black tees at the same width', () => {
    // 1040x1560 and 421x457 — different crops of the same garment. On a stage
    // narrower than either, both are limited by width, so both fill it. Before
    // this the white one drew at about two thirds of the black one.
    const white = drawnGarment('tshirt_white_front.png', 1040 / 1560);
    const black = drawnGarment('tshirt_black_front.png', 421 / 457);
    expect(white.width).toBeCloseTo(STAGE.boxWidth, 0);
    expect(black.width).toBeCloseTo(STAGE.boxWidth, 0);
    expect(white.width).toBeCloseTo(black.width, 0);
  });

  it('centres the garment, not the photograph', () => {
    const white = drawnGarment('tshirt_white_front.png', 1040 / 1560);
    expect(white.centreX).toBeCloseTo(STAGE.boxWidth / 2, 0);
    expect(white.centreY).toBeCloseTo(STAGE.boxHeight / 2, 0);
  });

  it.each(Object.keys(garmentBoxByMockup))(
    'never draws %s larger than the stage',
    (file) => {
      const g = drawnGarment(file, 1040 / 1560);
      expect(g.width).toBeLessThanOrEqual(STAGE.boxWidth + 0.5);
      expect(g.height).toBeLessThanOrEqual(STAGE.boxHeight + 0.5);
    },
  );

  it('fills at least one dimension, so nothing floats in empty space', () => {
    for (const file of Object.keys(garmentBoxByMockup)) {
      const g = drawnGarment(file, 1040 / 1560);
      const fillsWidth = Math.abs(g.width - STAGE.boxWidth) < 1;
      const fillsHeight = Math.abs(g.height - STAGE.boxHeight) < 1;
      expect(fillsWidth || fillsHeight).toBe(true);
    }
  });

  it('falls back to containing the photo when the box is unknown', () => {
    const rect = garmentFitRect({
      ...STAGE,
      imageAspect: 1040 / 1560,
      garmentBox: undefined,
    });
    expect(rect.width).toBeCloseTo(STAGE.boxWidth, 0);
    expect(rect.left).toBe(0);
  });
});
