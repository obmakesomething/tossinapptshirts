import type { EditorElement, PrintAreaNorm } from '../types';

const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`이미지를 불러오지 못했습니다: ${src}`));
    image.src = src;
  });

const toBlob = (canvas: HTMLCanvasElement): Promise<Blob> =>
  new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('PNG 생성에 실패했습니다.'));
        return;
      }
      resolve(blob);
    }, 'image/png');
  });

type ExportOptions = {
  baseImageSrc: string;
  printAreaNorm: PrintAreaNorm;
  elements: EditorElement[];
  exportLongSide?: number;
};

export const exportEditorPng = async ({
  baseImageSrc,
  printAreaNorm,
  elements,
  exportLongSide = 2400,
}: ExportOptions): Promise<{
  blob: Blob;
  dataUrl: string;
  width: number;
  height: number;
}> => {
  const baseImage = await loadImage(baseImageSrc);

  const baseWidth = baseImage.naturalWidth;
  const baseHeight = baseImage.naturalHeight;
  const ratio = baseWidth / baseHeight;

  const width =
    baseWidth >= baseHeight
      ? exportLongSide
      : Math.round(exportLongSide * ratio);
  const height =
    baseWidth >= baseHeight
      ? Math.round(exportLongSide / ratio)
      : exportLongSide;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Canvas context를 생성할 수 없습니다.');
  }

  ctx.clearRect(0, 0, width, height);
  ctx.drawImage(baseImage, 0, 0, width, height);

  const printX = width * printAreaNorm.nx;
  const printY = height * printAreaNorm.ny;
  const printW = width * printAreaNorm.nw;
  const printH = height * printAreaNorm.nh;

  const ordered = [...elements].sort((a, b) => a.zIndex - b.zIndex);

  for (const element of ordered) {
    if (element.type === 'image') {
      const image = await loadImage(element.src);
      const centerX = printX + element.x * printW;
      const centerY = printY + element.y * printH;
      const drawW = printW * element.baseWidthRatio * element.scale;
      const drawH = drawW * (element.naturalH / Math.max(element.naturalW, 1));

      ctx.save();
      ctx.globalAlpha = element.opacity;
      ctx.translate(centerX, centerY);
      ctx.rotate((element.rotation * Math.PI) / 180);
      ctx.drawImage(image, -drawW / 2, -drawH / 2, drawW, drawH);
      ctx.restore();
      continue;
    }

    const centerX = printX + element.x * printW;
    const centerY = printY + element.y * printH;
    const fontPx = Math.max(14, element.fontSize * printH * element.scale);

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate((element.rotation * Math.PI) / 180);
    ctx.fillStyle = element.color;
    ctx.font = `${element.fontWeight} ${fontPx}px system-ui, -apple-system, BlinkMacSystemFont, sans-serif`;
    ctx.textAlign = element.align;
    ctx.textBaseline = 'middle';

    const alignOffset =
      element.align === 'left'
        ? -printW * 0.25
        : element.align === 'right'
          ? printW * 0.25
          : 0;

    ctx.fillText(element.text, alignOffset, 0);
    ctx.restore();
  }

  const blob = await toBlob(canvas);
  const dataUrl = canvas.toDataURL('image/png');

  return {
    blob,
    dataUrl,
    width,
    height,
  };
};
