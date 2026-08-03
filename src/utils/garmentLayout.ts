import { useEffect, useState } from 'react';
import { Image, type ImageSourcePropType } from 'react-native';
import type { MockupTemplate, PrintArea } from '../data/mockupTemplates';

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
  const garment = containRect({
    boxWidth: width,
    boxHeight: height * (1 - hemTrimRatio),
    imageAspect: aspect,
  });
  return { garment, printArea: printAreaRect(garment, template.printArea) };
}
