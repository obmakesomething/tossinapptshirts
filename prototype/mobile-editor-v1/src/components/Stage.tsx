import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { useGestureTransform } from '../hooks/useGestureTransform';
import type {
  EditorElement,
  PrintAreaNorm,
  Rect,
  SnapLines,
  StageMetrics,
  TextElement,
} from '../types';
import { getContainRect, normalizedRectToPx } from '../utils/geometry';

type StageProps = {
  baseImageSrc: string;
  printAreaNorm: PrintAreaNorm;
  elements: EditorElement[];
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  updateElement: (
    id: string,
    updater: (element: EditorElement) => EditorElement,
  ) => void;
  snapLines: SnapLines;
  setSnapLines: (lines: SnapLines) => void;
  setOutOfBounds: (value: boolean) => void;
  onGestureStart: () => void;
  onGestureEnd: () => void;
  onGestureUsed: () => void;
  onOpenTextEdit: (id: string) => void;
  onMetricsChange: (metrics: StageMetrics | null) => void;
  showOutOfBounds: boolean;
};

const getElementPixelSize = (
  element: EditorElement,
  printAreaRect: Rect,
): { width: number; height: number } => {
  if (element.type === 'image') {
    const width = printAreaRect.width * element.baseWidthRatio * element.scale;
    const height =
      width * (element.naturalH / Math.max(element.naturalW, 1));
    return { width, height };
  }

  const fontPx = Math.max(14, element.fontSize * printAreaRect.height * element.scale);
  const width = Math.max(72, fontPx * Math.max(1, element.text.length * 0.6));
  const height = fontPx * 1.35;
  return { width, height };
};

const getTextStyle = (
  element: TextElement,
  printAreaRect: Rect,
): CSSProperties => {
  const centerX = printAreaRect.x + element.x * printAreaRect.width;
  const centerY = printAreaRect.y + element.y * printAreaRect.height;
  const fontPx = Math.max(14, element.fontSize * printAreaRect.height * element.scale);

  return {
    position: 'absolute',
    left: centerX,
    top: centerY,
    transform: `translate(-50%, -50%) rotate(${element.rotation}deg)`,
    fontSize: `${fontPx}px`,
    fontWeight: element.fontWeight,
    color: element.color,
    textAlign: element.align,
    whiteSpace: 'nowrap',
    userSelect: 'none',
    touchAction: 'none',
    lineHeight: 1.2,
    pointerEvents: 'auto',
  };
};

export const Stage = ({
  baseImageSrc,
  printAreaNorm,
  elements,
  selectedId,
  setSelectedId,
  updateElement,
  snapLines,
  setSnapLines,
  setOutOfBounds,
  onGestureStart,
  onGestureEnd,
  onGestureUsed,
  onOpenTextEdit,
  onMetricsChange,
  showOutOfBounds,
}: StageProps) => {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const lastTapRef = useRef<{ id: string; at: number }>({ id: '', at: 0 });

  const [stageRect, setStageRect] = useState<Rect | null>(null);
  const [imageRatio, setImageRatio] = useState(1);
  const [imageLoaded, setImageLoaded] = useState(true);

  useEffect(() => {
    const image = new Image();
    image.onload = () => {
      const ratio = image.naturalWidth / Math.max(image.naturalHeight, 1);
      setImageRatio(ratio || 1);
      setImageLoaded(true);
    };
    image.onerror = () => setImageLoaded(false);
    image.src = baseImageSrc;
  }, [baseImageSrc]);

  useEffect(() => {
    const node = stageRef.current;
    if (!node) return;

    const update = () => {
      const rect = node.getBoundingClientRect();
      setStageRect({
        x: 0,
        y: 0,
        width: rect.width,
        height: rect.height,
      });
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const shirtRect = useMemo(() => {
    if (!stageRect) return null;
    return getContainRect(stageRect, imageRatio);
  }, [imageRatio, stageRect]);

  const printAreaRect = useMemo(() => {
    if (!shirtRect) return null;
    return normalizedRectToPx(shirtRect, printAreaNorm);
  }, [printAreaNorm, shirtRect]);

  useEffect(() => {
    if (!stageRect || !shirtRect || !printAreaRect) {
      onMetricsChange(null);
      return;
    }

    onMetricsChange({
      stageRect,
      shirtRect,
      printAreaRect,
    });
  }, [onMetricsChange, printAreaRect, shirtRect, stageRect]);

  const getElementById = useCallback(
    (id: string) => elements.find((element) => element.id === id),
    [elements],
  );

  const gesture = useGestureTransform({
    printAreaRect,
    getElementById,
    updateElement,
    getElementSizePx: getElementPixelSize,
    onSelect: setSelectedId,
    onSnapLinesChange: setSnapLines,
    onOutOfBoundsChange: setOutOfBounds,
    onGestureStart,
    onGestureEnd,
    onGestureUsed,
  });

  const onStagePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      setSelectedId(null);
      setSnapLines({});
      setOutOfBounds(false);
    }
  };

  const onElementClick = (id: string) => {
    const now = performance.now();
    if (
      lastTapRef.current.id === id &&
      now - lastTapRef.current.at < 280
    ) {
      onOpenTextEdit(id);
    }

    lastTapRef.current = { id, at: now };
    setSelectedId(id);
  };

  const renderElement = (element: EditorElement) => {
    if (!printAreaRect) return null;

    const size = getElementPixelSize(element, printAreaRect);
    const centerX = printAreaRect.x + element.x * printAreaRect.width;
    const centerY = printAreaRect.y + element.y * printAreaRect.height;
    const isSelected = element.id === selectedId;

    const commonStyle: CSSProperties = {
      position: 'absolute',
      left: centerX - size.width / 2,
      top: centerY - size.height / 2,
      width: size.width,
      height: size.height,
      transform: `rotate(${element.rotation}deg)`,
      zIndex: element.zIndex,
      touchAction: 'none',
      pointerEvents: 'auto',
      outline: isSelected ? '2px solid rgba(255,255,255,0.95)' : 'none',
      boxShadow: isSelected
        ? '0 0 0 2px rgba(0, 122, 255, 0.9), 0 0 20px rgba(0, 122, 255, 0.4)'
        : 'none',
      borderRadius: '4px',
    };

    const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
      gesture.onElementPointerDown(event, element.id);
    };

    if (element.type === 'image') {
      return (
        <div
          key={element.id}
          className="stage-item"
          style={commonStyle}
          onPointerDown={onPointerDown}
          onClick={() => onElementClick(element.id)}
        >
          <img
            src={element.src}
            alt="디자인 요소"
            className="stage-item-image"
            style={{ opacity: element.opacity }}
            draggable={false}
          />
        </div>
      );
    }

    return (
      <div
        key={element.id}
        className={`stage-text ${isSelected ? 'selected' : ''}`}
        style={getTextStyle(element, printAreaRect)}
        onPointerDown={onPointerDown}
        onClick={() => onElementClick(element.id)}
      >
        {element.text}
      </div>
    );
  };

  return (
    <div
      ref={stageRef}
      className="stage"
      onPointerDown={onStagePointerDown}
      onPointerMove={gesture.onStagePointerMove}
      onPointerUp={gesture.onStagePointerUp}
      onPointerCancel={gesture.onStagePointerCancel}
      onPointerLeave={gesture.onStagePointerCancel}
      data-coach-id="coach-stage"
    >
      {imageLoaded ? (
        <img
          src={baseImageSrc}
          alt="티셔츠 베이스"
          className="shirt-image"
          draggable={false}
        />
      ) : (
        <div className="shirt-placeholder">티셔츠 이미지 준비중</div>
      )}

      {printAreaRect ? (
        <div
          className="print-area-guide"
          style={{
            left: printAreaRect.x,
            top: printAreaRect.y,
            width: printAreaRect.width,
            height: printAreaRect.height,
          }}
        />
      ) : null}

      {showOutOfBounds ? <div className="out-of-bounds-banner">영역 밖</div> : null}

      {[...elements].sort((a, b) => a.zIndex - b.zIndex).map(renderElement)}

      {printAreaRect && snapLines.vertical !== undefined ? (
        <div
          className="snap-line vertical"
          style={{ left: printAreaRect.x + snapLines.vertical }}
        />
      ) : null}

      {printAreaRect && snapLines.horizontal !== undefined ? (
        <div
          className="snap-line horizontal"
          style={{ top: printAreaRect.y + snapLines.horizontal }}
        />
      ) : null}
    </div>
  );
};
