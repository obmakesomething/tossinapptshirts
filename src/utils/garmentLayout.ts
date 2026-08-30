import { useEffect, useState } from 'react';
import { Image, type ImageSourcePropType } from 'react-native';
import type {
  GarmentBox,
  MockupTemplate,
  PrintArea,
} from '../data/mockupTemplates';

export type Rect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

function sourceUri(image: ImageSourcePropType): string | undefined {
  return typeof image === 'object' && image !== null && 'uri' in image
    ? (image as { uri?: string }).uri
    : undefined;
}

/**
 * Where the mockup actually lands inside its box.
 *
 * The garment is drawn with resizeMode="contain", so it is letterboxed by
 * however much the asset's aspect differs from the box it was given. Print
 * areas are expressed against the image, so anything derived from them has to
 * be measured against this rect — using the raw box stretches the print
 * boundary over the collar and past the hem.
 */
export function containRect({
  boxWidth,
  boxHeight,
  imageAspect,
}: {
  boxWidth: number;
  boxHeight: number;
  imageAspect: number | null;
}): Rect {
  if (!imageAspect || !(imageAspect > 0) || boxHeight <= 0) {
    return { left: 0, top: 0, width: boxWidth, height: boxHeight };
  }
  const boxAspect = boxWidth / boxHeight;
  if (imageAspect > boxAspect) {
    const drawnHeight = boxWidth / imageAspect;
    return {
      left: 0,
      top: (boxHeight - drawnHeight) / 2,
      width: boxWidth,
      height: drawnHeight,
    };
  }
  const drawnWidth = boxHeight * imageAspect;
  return {
    left: (boxWidth - drawnWidth) / 2,
    top: 0,
    width: drawnWidth,
    height: boxHeight,
  };
}

/**
 * Where the mockup lands when the garment, not the photograph, is what fits.
 *
 * The eight mockups were shot and cropped separately and disagree wildly: the
 * white tee is 1040x1560 with the shirt filling 63% of the height, the black
 * one 421x457 filling all of it, the hoodie 400x400 filling 74% of the width.
 * Fitting the photograph meant the garment changed size whenever the customer
 * switched colour — and the default, the white tee, came out the smallest of
 * the set, sitting in a third of a screen of empty background.
 *
 * This fits the garment's own box instead and lets the surrounding photograph
 * fall outside the canvas, which clips it. The returned rect is still the
 * whole image, so printAreaRect keeps mapping onto it unchanged: the print
 * area zooms with the shirt because it is measured against the same rect.
 */
export function garmentFitRect({
  boxWidth,
  boxHeight,
  imageAspect,
  garmentBox,
}: {
  boxWidth: number;
  boxHeight: number;
  imageAspect: number | null;
  garmentBox: GarmentBox | null | undefined;
}): Rect {
  if (
    !garmentBox ||
    !(garmentBox.width > 0) ||
    !(garmentBox.height > 0) ||
    !imageAspect ||
    !(imageAspect > 0) ||
    boxHeight <= 0
  ) {
    return containRect({ boxWidth, boxHeight, imageAspect });
  }

  // Work in units where the image is 1 wide; its height is then 1 / aspect.
  const imageHeightUnits = 1 / imageAspect;
  const scale = Math.min(
    boxWidth / garmentBox.width,
    boxHeight / (garmentBox.height * imageHeightUnits),
  );
  const width = scale;
  const height = scale * imageHeightUnits;

  return {
    width,
    height,
    left: boxWidth / 2 - (garmentBox.x + garmentBox.width / 2) * width,
    top: boxHeight / 2 - (garmentBox.y + garmentBox.height / 2) * height,
  };
}

/** Map image-relative print-area fractions onto the drawn garment. */
export function printAreaRect(garment: Rect, printArea: PrintArea): Rect {
  return {
    left: garment.left + garment.width * printArea.x,
    top: garment.top + garment.height * printArea.y,
    width: garment.width * printArea.width,
    height: garment.height * printArea.height,
  };
}

/**
 * Natural size of a remote mockup, once it is known.
 *
 * Returns null until the size arrives, so callers fall back to the raw box for
 * one frame rather than drawing the print area in the wrong place.
 */
export function useImageAspect(image: ImageSourcePropType): number | null {
  const uri = sourceUri(image);
  const [size, setSize] = useState<{ uri: string; aspect: number } | null>(null);

  useEffect(() => {
    if (!uri) return;
    let cancelled = false;
    Image.getSize(
      uri,
      (w, h) => {
        if (!cancelled && w > 0 && h > 0) {
          setSize({ uri, aspect: w / h });
        }
      },
      () => {
        // Leave it unknown; the caller falls back to the box it was given.
      },
    );
    return () => {
      cancelled = true;
    };
  }, [uri]);

  return size && size.uri === uri ? size.aspect : null;
}

/**
 * The print area of a template, placed inside a box of the given size.
 *
 * `hemTrimRatio` matches the inset the mockup image itself is drawn with, so
 * the print area follows the garment when a larger size shifts it up.
 */
export function useTemplatePrintArea({
  template,
  width,
  height,
  hemTrimRatio = 0,
}: {
  template: MockupTemplate;
  width: number;
  height: number;
  hemTrimRatio?: number;
}): { garment: Rect; printArea: Rect } {
  const aspect = useImageAspect(template.image);
  const garment = garmentFitRect({
    boxWidth: width,
    boxHeight: height * (1 - hemTrimRatio),
    imageAspect: aspect,
    garmentBox: template.garmentBox,
  });
  return { garment, printArea: printAreaRect(garment, template.printArea) };
}

/**
 * The garment's own aspect, for sizing the stage to it.
 *
 * A stage taller than the shirt fills the difference with background, and a
 * shirt centred in a third of a screen of empty grey reads as small however
 * large it actually is. Shaping the stage to the garment removes the dead
 * space instead of trying to zoom past it.
 *
 * Null until the image reports its size, so callers keep their existing box
 * for a frame rather than snapping.
 */
export function useGarmentAspect(template: MockupTemplate): number | null {
  const imageAspect = useImageAspect(template.image);
  const box = template.garmentBox;
  if (!imageAspect || !box || !(box.width > 0) || !(box.height > 0)) return null;
  return imageAspect * (box.width / box.height);
}
