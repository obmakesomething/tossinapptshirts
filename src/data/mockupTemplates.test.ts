import {
  printAreaByMockup,
  printSizeByCategory,
  type PrintArea,
} from './mockupTemplates';

/** Pixel dimensions of each mockup, so canvas fractions convert to a real shape. */
const MOCKUP_CANVAS: Record<string, { width: number; height: number }> = {
  'tshirt_white_front.png': { width: 1040, height: 1560 },
  'tshirt_white_back.png': { width: 1040, height: 1560 },
  'tshirt_black_front.png': { width: 421, height: 457 },
  'tshirt_black_back.png': { width: 421, height: 457 },
  'hoodie_grey_front.png': { width: 800, height: 800 },
  'hoodie_black_front.png': { width: 400, height: 400 },
  'sweatshirt_grey_front.png': { width: 800, height: 800 },
  'sweatshirt_black_front.png': { width: 400, height: 400 },
};

const CATEGORY_OF: Record<string, string> = {
  'tshirt_white_front.png': '티셔츠',
  'tshirt_white_back.png': '티셔츠',
  'tshirt_black_front.png': '티셔츠',
  'tshirt_black_back.png': '티셔츠',
  'hoodie_grey_front.png': '후드',
  'hoodie_black_front.png': '후드',
  'sweatshirt_grey_front.png': '맨투맨',
  'sweatshirt_black_front.png': '맨투맨',
};

function drawnAspect(area: PrintArea, canvas: { width: number; height: number }) {
  return (area.width * canvas.width) / (area.height * canvas.height);
}

describe('printAreaByMockup', () => {
  it('covers every mockup the catalog can show', () => {
    expect(Object.keys(printAreaByMockup).sort()).toEqual(
      Object.keys(MOCKUP_CANVAS).sort(),
    );
  });

  it.each(Object.keys(MOCKUP_CANVAS))(
    'draws %s at the shape its category is sold as',
    (file) => {
      const size = printSizeByCategory[CATEGORY_OF[file]!]!;
      const expected = size.widthCm / size.heightCm;
      const actual = drawnAspect(printAreaByMockup[file]!, MOCKUP_CANVAS[file]!);
      // The box on the garment and the canvas the press file is composed onto
      // have to be the same rectangle, or the preview is not what ships.
      expect(Math.abs(actual - expected)).toBeLessThan(0.02);
    },
  );

  it.each(Object.keys(MOCKUP_CANVAS))('keeps %s inside the image', (file) => {
    const area = printAreaByMockup[file]!;
    expect(area.x).toBeGreaterThanOrEqual(0);
    expect(area.y).toBeGreaterThanOrEqual(0);
    expect(area.x + area.width).toBeLessThanOrEqual(1);
    expect(area.y + area.height).toBeLessThanOrEqual(1);
  });

  it('keeps the hoodie print clear of the kangaroo pocket', () => {
    // Pocket openings measured off the photographs: y=515 of 800 (grey),
    // y=262 of 400 (black). A print that crosses them cannot be pressed.
    const grey = printAreaByMockup['hoodie_grey_front.png']!;
    expect((grey.y + grey.height) * 800).toBeLessThan(515);
    const black = printAreaByMockup['hoodie_black_front.png']!;
    expect((black.y + black.height) * 400).toBeLessThan(262);
  });

  it('keeps the sweatshirt print above the waistband rib', () => {
    // Rib tops: y=624 of 800 (grey), y=337 of 400 (black).
    const grey = printAreaByMockup['sweatshirt_grey_front.png']!;
    expect((grey.y + grey.height) * 800).toBeLessThan(624);
    const black = printAreaByMockup['sweatshirt_black_front.png']!;
    expect((black.y + black.height) * 400).toBeLessThan(337);
  });
});
