import { useRef } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import type { EditorElement, Rect, SnapLines } from '../types';
import { clamp, distance, isOutOfPrintArea, snapElementPosition } from '../utils/geometry';

type UseGestureTransformArgs = {
  printAreaRect: Rect | null;
  getElementById: (id: string) => EditorElement | undefined;
  updateElement: (
    id: string,
    updater: (element: EditorElement) => EditorElement,
  ) => void;
  getElementSizePx: (
    element: EditorElement,
    printAreaRect: Rect,
  ) => { width: number; height: number };
  onSelect: (id: string) => void;
  onSnapLinesChange: (lines: SnapLines) => void;
  onOutOfBoundsChange: (value: boolean) => void;
  onGestureStart?: () => void;
  onGestureEnd?: () => void;
  onGestureUsed?: () => void;
};

type Point = { x: number; y: number };

type DragState = {
  pointerStart: Point;
  elementStartX: number;
  elementStartY: number;
};

type PinchState = {
  elementStartX: number;
  elementStartY: number;
  elementStartScale: number;
  centroidStart: Point;
  distanceStart: number;
};

export const useGestureTransform = ({
  printAreaRect,
  getElementById,
  updateElement,
  getElementSizePx,
  onSelect,
  onSnapLinesChange,
  onOutOfBoundsChange,
  onGestureStart,
  onGestureEnd,
  onGestureUsed,
}: UseGestureTransformArgs) => {
  const activeElementIdRef = useRef<string | null>(null);
  const pointersRef = useRef<Map<number, Point>>(new Map());
  const dragStateRef = useRef<DragState | null>(null);
  const pinchStateRef = useRef<PinchState | null>(null);
  const interactionActiveRef = useRef(false);

  const endGesture = () => {
    pointersRef.current.clear();
    dragStateRef.current = null;
    pinchStateRef.current = null;
    activeElementIdRef.current = null;
    onSnapLinesChange({});

    if (interactionActiveRef.current) {
      interactionActiveRef.current = false;
      onGestureEnd?.();
      onGestureUsed?.();
    }
  };

  const syncOutOfBounds = (elementId: string, nextX: number, nextY: number) => {
    if (!printAreaRect) return;
    const element = getElementById(elementId);
    if (!element) return;
    const size = getElementSizePx(element, printAreaRect);
    onOutOfBoundsChange(
      isOutOfPrintArea({
        x: nextX,
        y: nextY,
        elementWidthPx: size.width,
        elementHeightPx: size.height,
        printAreaWidthPx: printAreaRect.width,
        printAreaHeightPx: printAreaRect.height,
      }),
    );
  };

  const onElementPointerDown = (
    event: ReactPointerEvent<HTMLElement>,
    elementId: string,
  ) => {
    if (!printAreaRect) return;
    event.preventDefault();

    const point = { x: event.clientX, y: event.clientY };
    if (event.currentTarget && 'setPointerCapture' in event.currentTarget) {
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    pointersRef.current.set(event.pointerId, point);

    if (!interactionActiveRef.current) {
      interactionActiveRef.current = true;
      onGestureStart?.();
    }

    activeElementIdRef.current = elementId;
    onSelect(elementId);

    const element = getElementById(elementId);
    if (!element) return;

    if (pointersRef.current.size === 1) {
      dragStateRef.current = {
        pointerStart: point,
        elementStartX: element.x,
        elementStartY: element.y,
      };
      pinchStateRef.current = null;
      return;
    }

    if (pointersRef.current.size >= 2) {
      const [a, b] = Array.from(pointersRef.current.values());
      pinchStateRef.current = {
        elementStartX: element.x,
        elementStartY: element.y,
        elementStartScale: element.scale,
        centroidStart: {
          x: (a.x + b.x) / 2,
          y: (a.y + b.y) / 2,
        },
        distanceStart: distance(a, b),
      };
      dragStateRef.current = null;
    }
  };

  const onStagePointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    if (!printAreaRect) return;
    const activeId = activeElementIdRef.current;
    if (!activeId) return;

    if (!pointersRef.current.has(event.pointerId)) return;
    pointersRef.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });

    const element = getElementById(activeId);
    if (!element) return;

    if (pointersRef.current.size >= 2 && pinchStateRef.current) {
      const [a, b] = Array.from(pointersRef.current.values());
      const nextDistance = distance(a, b);
      const nextCentroid = {
        x: (a.x + b.x) / 2,
        y: (a.y + b.y) / 2,
      };

      const distanceRatio =
        pinchStateRef.current.distanceStart > 0
          ? nextDistance / pinchStateRef.current.distanceStart
          : 1;

      const nextScale = clamp(
        pinchStateRef.current.elementStartScale * distanceRatio,
        0.2,
        3,
      );

      const deltaX =
        (nextCentroid.x - pinchStateRef.current.centroidStart.x) /
        printAreaRect.width;
      const deltaY =
        (nextCentroid.y - pinchStateRef.current.centroidStart.y) /
        printAreaRect.height;

      const nextX = pinchStateRef.current.elementStartX + deltaX;
      const nextY = pinchStateRef.current.elementStartY + deltaY;

      updateElement(activeId, (prev) => ({
        ...prev,
        x: nextX,
        y: nextY,
        scale: nextScale,
      }));

      syncOutOfBounds(activeId, nextX, nextY);
      onSnapLinesChange({});
      return;
    }

    if (dragStateRef.current && pointersRef.current.size === 1) {
      const pointer = Array.from(pointersRef.current.values())[0];
      const deltaX =
        (pointer.x - dragStateRef.current.pointerStart.x) / printAreaRect.width;
      const deltaY =
        (pointer.y - dragStateRef.current.pointerStart.y) / printAreaRect.height;

      let nextX = dragStateRef.current.elementStartX + deltaX;
      let nextY = dragStateRef.current.elementStartY + deltaY;

      const size = getElementSizePx(element, printAreaRect);
      const snapped = snapElementPosition({
        x: nextX,
        y: nextY,
        elementWidthPx: size.width,
        elementHeightPx: size.height,
        printAreaWidthPx: printAreaRect.width,
        printAreaHeightPx: printAreaRect.height,
        thresholdPx: 7,
      });

      nextX = snapped.x;
      nextY = snapped.y;

      onSnapLinesChange(snapped.snapLines);

      updateElement(activeId, (prev) => ({
        ...prev,
        x: nextX,
        y: nextY,
      }));

      syncOutOfBounds(activeId, nextX, nextY);
    }
  };

  const onStagePointerUp = (event: ReactPointerEvent<HTMLElement>) => {
    if (!pointersRef.current.has(event.pointerId)) return;
    pointersRef.current.delete(event.pointerId);

    const activeId = activeElementIdRef.current;
    if (!activeId) {
      endGesture();
      return;
    }

    if (pointersRef.current.size === 0) {
      endGesture();
      return;
    }

    const element = getElementById(activeId);
    if (!element) {
      endGesture();
      return;
    }

    if (pointersRef.current.size === 1) {
      const pointer = Array.from(pointersRef.current.values())[0];
      dragStateRef.current = {
        pointerStart: pointer,
        elementStartX: element.x,
        elementStartY: element.y,
      };
      pinchStateRef.current = null;
    }
  };

  const onStagePointerCancel = () => {
    endGesture();
  };

  return {
    onElementPointerDown,
    onStagePointerMove,
    onStagePointerUp,
    onStagePointerCancel,
  };
};
