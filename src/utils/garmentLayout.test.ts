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
