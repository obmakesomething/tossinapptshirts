import type { PrintAreaNorm, Rect, SnapLines } from '../types';

export const clamp = (value: number, min: number, max: number): number => {
  if (max < min) return min;
  return Math.min(Math.max(value, min), max);
};

export const distance = (
  a: { x: number; y: number },
  b: { x: number; y: number },
): number => Math.hypot(b.x - a.x, b.y - a.y);

export const centroid = (
  a: { x: number; y: number },
  b: { x: number; y: number },
): { x: number; y: number } => ({
  x: (a.x + b.x) / 2,
  y: (a.y + b.y) / 2,
});

export const normalizedRectToPx = (
  parent: Rect,
  norm: PrintAreaNorm,
): Rect => ({
  x: parent.x + parent.width * norm.nx,
  y: parent.y + parent.height * norm.ny,
  width: parent.width * norm.nw,
  height: parent.height * norm.nh,
});

export const getContainRect = (
  container: Rect,
  imageRatio: number,
): Rect => {
  if (container.width <= 0 || container.height <= 0 || imageRatio <= 0) {
    return { ...container };
  }

  const containerRatio = container.width / container.height;

  if (containerRatio > imageRatio) {
    const height = container.height;
    const width = height * imageRatio;
    return {
      x: container.x + (container.width - width) / 2,
      y: container.y,
      width,
      height,
    };
  }

  const width = container.width;
  const height = width / imageRatio;

  return {
    x: container.x,
    y: container.y + (container.height - height) / 2,
    width,
    height,
  };
};

type SnapInput = {
  x: number;
  y: number;
  elementWidthPx: number;
  elementHeightPx: number;
  printAreaWidthPx: number;
  printAreaHeightPx: number;
  thresholdPx?: number;
};

export const snapElementPosition = ({
  x,
  y,
  elementWidthPx,
  elementHeightPx,
  printAreaWidthPx,
  printAreaHeightPx,
  thresholdPx = 7,
}: SnapInput): { x: number; y: number; snapLines: SnapLines } => {
  let centerXPx = x * printAreaWidthPx;
  let centerYPx = y * printAreaHeightPx;
  const snapLines: SnapLines = {};

  const candidatesX = [
    {
      delta: centerXPx - printAreaWidthPx / 2,
      snapped: printAreaWidthPx / 2,
      line: printAreaWidthPx / 2,
    },
    {
      delta: centerXPx - elementWidthPx / 2,
      snapped: elementWidthPx / 2,
      line: 0,
    },
    {
      delta: centerXPx + elementWidthPx / 2 - printAreaWidthPx,
      snapped: printAreaWidthPx - elementWidthPx / 2,
      line: printAreaWidthPx,
    },
  ];

  const bestX = candidatesX
    .map((candidate) => ({
      ...candidate,
      abs: Math.abs(candidate.delta),
    }))
    .sort((a, b) => a.abs - b.abs)[0];

  if (bestX && bestX.abs <= thresholdPx) {
    centerXPx = bestX.snapped;
    snapLines.vertical = bestX.line;
  }

  const candidatesY = [
    {
      delta: centerYPx - printAreaHeightPx / 2,
      snapped: printAreaHeightPx / 2,
      line: printAreaHeightPx / 2,
    },
    {
      delta: centerYPx - elementHeightPx / 2,
      snapped: elementHeightPx / 2,
      line: 0,
    },
    {
      delta: centerYPx + elementHeightPx / 2 - printAreaHeightPx,
      snapped: printAreaHeightPx - elementHeightPx / 2,
      line: printAreaHeightPx,
    },
  ];

  const bestY = candidatesY
    .map((candidate) => ({
      ...candidate,
      abs: Math.abs(candidate.delta),
    }))
    .sort((a, b) => a.abs - b.abs)[0];

  if (bestY && bestY.abs <= thresholdPx) {
    centerYPx = bestY.snapped;
    snapLines.horizontal = bestY.line;
  }

  return {
    x: centerXPx / printAreaWidthPx,
    y: centerYPx / printAreaHeightPx,
    snapLines,
  };
};

type OutOfBoundsInput = {
  x: number;
  y: number;
  elementWidthPx: number;
  elementHeightPx: number;
  printAreaWidthPx: number;
  printAreaHeightPx: number;
};

export const isOutOfPrintArea = ({
  x,
  y,
  elementWidthPx,
  elementHeightPx,
  printAreaWidthPx,
  printAreaHeightPx,
}: OutOfBoundsInput): boolean => {
  const centerXPx = x * printAreaWidthPx;
  const centerYPx = y * printAreaHeightPx;
  const left = centerXPx - elementWidthPx / 2;
  const right = centerXPx + elementWidthPx / 2;
  const top = centerYPx - elementHeightPx / 2;
  const bottom = centerYPx + elementHeightPx / 2;

  return left < 0 || top < 0 || right > printAreaWidthPx || bottom > printAreaHeightPx;
};
