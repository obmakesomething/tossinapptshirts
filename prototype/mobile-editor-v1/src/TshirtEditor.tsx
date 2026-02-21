import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ChangeEvent } from 'react';
import { BottomSheet } from './components/BottomSheet';
import { CoachMarkOverlay } from './components/CoachMarkOverlay';
import { Stage } from './components/Stage';
import { useBottomSheetHeights } from './hooks/useBottomSheetHeights';
import { useCoachMarks } from './hooks/useCoachMarks';
import { exportEditorPng } from './utils/exportPng';
import type {
  EditorElement,
  EditorSnapshot,
  ImageElement,
  PrintAreaNorm,
  SheetPage,
  StageMetrics,
  TextElement,
} from './types';

const BASE_IMAGE_SRC = '/tshirt.png';

const PRINT_AREA: PrintAreaNorm = {
  nx: 0.18,
  ny: 0.22,
  nw: 0.64,
  nh: 0.53,
};

const IMAGE_PRESETS = {
  S: 0.4,
  M: 0.6,
  L: 0.8,
} as const;

const TEXT_PRESETS = {
  S: 0.1,
  M: 0.14,
  L: 0.2,
} as const;

const COLOR_SWATCH = [
  '#111111',
  '#ffffff',
  '#f15f79',
  '#f1c40f',
  '#2ecc71',
  '#3498db',
  '#9b59b6',
  '#1abc9c',
  '#e67e22',
  '#34495e',
];

const MAX_HISTORY = 20;
const ANIMATION_TIME = 1000;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

const cloneElements = (elements: EditorElement[]): EditorElement[] =>
  elements.map((element) => ({ ...element }));

const cloneSnapshot = (snapshot: EditorSnapshot): EditorSnapshot => ({
  elements: cloneElements(snapshot.elements),
  selectedId: snapshot.selectedId,
});

const generateId = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const readFileAsDataURL = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('이미지 읽기 실패'));
    reader.readAsDataURL(file);
  });

const readImageSize = (src: string): Promise<{ width: number; height: number }> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () =>
      resolve({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () => reject(new Error('이미지 로드 실패'));
    image.src = src;
  });

const createAiImage = () => {
  const canvas = document.createElement('canvas');
  canvas.width = 900;
  canvas.height = 900;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 생성 실패');

  const hue = Math.floor(Math.random() * 360);
  const gradient = ctx.createLinearGradient(0, 0, 900, 900);
  gradient.addColorStop(0, `hsl(${hue},70%,62%)`);
  gradient.addColorStop(1, `hsl(${(hue + 48) % 360},80%,48%)`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.fillRect(180, 180, 540, 540);
  ctx.fillStyle = `hsl(${hue}, 82%, 45%)`;
  ctx.font = 'bold 70px system-ui';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('AI', 450, 430);
  ctx.fillText('IMAGE', 450, 520);
  return canvas.toDataURL('image/png');
};

export const TshirtEditor = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textInputRef = useRef<HTMLTextAreaElement>(null);
  const outOfBoundsTimerRef = useRef<number | undefined>(undefined);
  const replaceTargetRef = useRef<string | null>(null);

  const [elements, setElements] = useState<EditorElement[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [history, setHistory] = useState<EditorSnapshot[]>([
    { elements: [], selectedId: null },
  ]);
  const [future, setFuture] = useState<EditorSnapshot[]>([]);
  const [snap, setSnap] = useState<'collapsed' | 'expanded'>('collapsed');
  const [page, setPage] = useState<SheetPage>('add');
  const [metrics, setMetrics] = useState<StageMetrics | null>(null);
  const [snapLines, setSnapLines] = useState<Record<string, number>>({});
  const [showOutOfBounds, setShowOutOfBounds] = useState(false);
  const [textEditorId, setTextEditorId] = useState<string | null>(null);
  const [textDraft, setTextDraft] = useState('');
  const [isEditingImageOpacity, setIsEditingImageOpacity] = useState(false);

  const { collapsedHeight, expandedHeight, safeTop, safeBottom } = useBottomSheetHeights();
  const { isOpen, stepIndex, totalSteps, currentStep, next, skip, restart, signal } =
    useCoachMarks({ hasAnyElement: elements.length > 0 });

  const selectedElement = useMemo(
    () => elements.find((element) => element.id === selectedId) ?? null,
    [elements, selectedId],
  );

  const elementsRef = useRef(elements);
  const selectedIdRef = useRef<string | null>(null);

  useEffect(() => {
    elementsRef.current = elements;
  }, [elements]);

  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  useEffect(() => {
    console.log('[analytics] editor_open');
  }, []);

  useEffect(() => {
    if (snap === 'expanded' && page === 'add') {
      console.log('[analytics] add_open');
    }
  }, [page, snap]);

  useEffect(() => {
    if (!selectedElement) return;
    console.log('[analytics] element_select', {
      type: selectedElement.type,
    });
  }, [selectedElement]);

  const commitHistory = useCallback(
    (nextElements: EditorElement[], nextSelected: string | null) => {
      const nextSnapshot: EditorSnapshot = {
        elements: cloneElements(nextElements),
        selectedId: nextSelected,
      };

      setHistory((prev) => {
        const last = prev[prev.length - 1];
        if (
          last &&
          JSON.stringify(last.elements) === JSON.stringify(nextSnapshot.elements) &&
          last.selectedId === nextSelected
        ) {
          return prev;
        }
        const appended = [...prev, nextSnapshot];
        return appended.length > MAX_HISTORY
          ? appended.slice(appended.length - MAX_HISTORY)
          : appended;
      });
      setFuture([]);
    },
    [],
  );

  const restoreSnapshot = useCallback(
    (snapshot: EditorSnapshot) => {
      const stable = cloneSnapshot(snapshot);
      setElements(stable.elements);
      setSelectedId(stable.selectedId);
      selectedIdRef.current = stable.selectedId;
    },
    [],
  );

  const undo = useCallback(() => {
    if (history.length <= 1) return;
    const nextCurrent = history[history.length - 1];
    const prev = history[history.length - 2];
    setHistory((prevList) => prevList.slice(0, -1));
    setFuture((prevFuture) => [cloneSnapshot(nextCurrent), ...prevFuture]);
    restoreSnapshot(prev);
  }, [history, restoreSnapshot]);

  const redo = useCallback(() => {
    if (!future.length) return;
    const [nextSnapshot, ...rest] = future;
    setFuture(rest);
    setHistory((prev) => {
      const appended = [...prev, cloneSnapshot(nextSnapshot)];
      return appended.length > MAX_HISTORY
        ? appended.slice(appended.length - MAX_HISTORY)
        : appended;
    });
    restoreSnapshot(nextSnapshot);
  }, [future, restoreSnapshot]);

  const getDefaultFontSize = (printAreaHeight: number) =>
    clamp(0.14, 14 / Math.max(printAreaHeight, 1), 0.25);

  const updateElement = useCallback(
    (
      id: string,
      updater: (element: EditorElement) => EditorElement,
      shouldCommit = false,
    ) => {
      setElements((prev) => {
        const next = prev.map((element) =>
          element.id === id ? updater(element) : element,
        );
        if (shouldCommit) {
          commitHistory(next, selectedIdRef.current);
        }
        return next;
      });
    },
    [commitHistory],
  );

  const setOutOfBounds = useCallback((value: boolean) => {
    if (!value) {
      setShowOutOfBounds(false);
      return;
    }

    setShowOutOfBounds(true);
    if (outOfBoundsTimerRef.current) {
      window.clearTimeout(outOfBoundsTimerRef.current);
    }
    outOfBoundsTimerRef.current = window.setTimeout(() => {
      setShowOutOfBounds(false);
    }, ANIMATION_TIME);
  }, []);

  const openTextEditor = useCallback((id: string) => {
    const target = elements.find((element) => element.id === id);
    if (!target || target.type !== 'text') return;
    setTextDraft(target.text);
    setTextEditorId(id);
    setSnap('collapsed');
    setPage('textStyle');
    requestAnimationFrame(() => textInputRef.current?.focus());
    console.log('[analytics] text_edit_open');
  }, [elements, setSnap]);

  const closeTextEditor = useCallback(() => {
    const targetId = textEditorId;
    setTextEditorId(null);
    if (!targetId) {
      console.log('[analytics] text_edit_close', {
        reason: 'cancel',
      });
      return;
    }

    setElements((prev) => {
      const next = prev.map((element) => {
        if (element.id !== targetId || element.type !== 'text') return element;
        return { ...element, text: textDraft || '텍스트' };
      });
      commitHistory(next, selectedIdRef.current);
      return next;
    });
    console.log('[analytics] text_edit_close');
  }, [commitHistory, textEditorId, textDraft]);

  const saveTextEditor = useCallback(() => {
    closeTextEditor();
    if (textEditorId) {
      setTextEditorId(null);
    }
  }, [closeTextEditor, textEditorId]);

  const onAddImageFromDataUrl = useCallback(
    async (dataUrl: string, source: 'photo' | 'ai', replaceTarget: string | null) => {
      console.log(`[analytics] add_${source}`);
      const dimensions = await readImageSize(dataUrl);

      if (replaceTarget) {
        const nextElements = elementsRef.current.map((element) => {
          if (element.id !== replaceTarget || element.type !== 'image') return element;
          return {
            ...element,
            src: dataUrl,
            naturalW: dimensions.width,
            naturalH: dimensions.height,
            baseWidthRatio:
              (IMAGE_PRESETS[element.sizePreset] ?? 0.6) *
              clamp(dimensions.width / Math.max(dimensions.height, 1), 0.5, 1),
          };
        });
        setElements(nextElements);
        commitHistory(nextElements, replaceTarget);
        replaceTargetRef.current = null;
        return;
      }

      const next: ImageElement = {
        id: generateId(),
        type: 'image',
        x: 0.5,
        y: 0.5,
        scale: 1,
        rotation: 0,
        zIndex: elementsRef.current.length + 1,
        src: dataUrl,
        naturalW: dimensions.width,
        naturalH: dimensions.height,
        baseWidthRatio: 0.6,
        sizePreset: 'M',
        opacity: 1,
      };

      const nextElements = [...elementsRef.current, next];
      setElements(nextElements);
      setSelectedId(next.id);
      selectedIdRef.current = next.id;
      setPage('imageStyle');
      setSnap('expanded');
      commitHistory(nextElements, next.id);
      signal('add_clicked');
      console.log('[analytics] element_select', { type: 'image' });
    },
    [commitHistory, getDefaultFontSize, metrics, signal],
  );

  const onAddText = useCallback(() => {
    const printHeight = metrics?.printAreaRect.height ?? 360;
    const next: TextElement = {
      id: generateId(),
      type: 'text',
      x: 0.5,
      y: 0.5,
      scale: 1,
      rotation: 0,
      zIndex: elementsRef.current.length + 1,
      text: '텍스트',
      fontSize: getDefaultFontSize(printHeight),
      color: '#111111',
      align: 'center',
      fontWeight: 400,
    };

    const nextElements = [...elementsRef.current, next];
    setElements(nextElements);
    setSelectedId(next.id);
    selectedIdRef.current = next.id;
    setSnap('expanded');
    setPage('textStyle');
    setShowOutOfBounds(false);
    commitHistory(nextElements, next.id);
    signal('add_clicked');
    console.log('[analytics] add_text');
    console.log('[analytics] element_select', { type: 'text' });
  }, [commitHistory, getDefaultFontSize, metrics, signal]);

  const handlePhotoUpload = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = '';
      if (!file) return;
      const dataUrl = await readFileAsDataURL(file);
      const replaceTarget = replaceTargetRef.current;
      replaceTargetRef.current = null;
      await onAddImageFromDataUrl(dataUrl, 'photo', replaceTarget);
    },
    [onAddImageFromDataUrl],
  );

  const handleReplaceImage = useCallback(() => {
    if (!selectedElement || selectedElement.type !== 'image') return;
    replaceTargetRef.current = selectedElement.id;
    fileInputRef.current?.click();
    signal('add_clicked');
  }, [selectedElement, signal]);

  const handleAddPhoto = useCallback(() => {
    replaceTargetRef.current = null;
    fileInputRef.current?.click();
    signal('add_clicked');
  }, [signal]);

  const handleAddAiImage = useCallback(async () => {
    const dataUrl = createAiImage();
    signal('add_clicked');
    await onAddImageFromDataUrl(dataUrl, 'ai', null);
  }, [onAddImageFromDataUrl, signal]);

  const deleteSelected = useCallback(() => {
    if (!selectedElement) return;
    const nextElements = elementsRef.current.filter((item) => item.id !== selectedElement.id);
    setElements(nextElements);
    setSelectedId(null);
    selectedIdRef.current = null;
    setTextEditorId(null);
    commitHistory(nextElements, null);
    console.log('[analytics] element_delete', { type: selectedElement.type });
  }, [selectedElement, commitHistory]);

  const openStyleForType = useCallback(
    (type: 'image' | 'text') => {
      if (type === 'image') {
        setPage('imageStyle');
      } else {
        setPage('textStyle');
      }
      setSnap('expanded');
      signal('style_open');
    },
    [signal],
  );

  const applyImagePreset = useCallback(
    (preset: 'S' | 'M' | 'L') => {
      if (!selectedElement || selectedElement.type !== 'image') return;
      const ratio = IMAGE_PRESETS[preset];
      updateElement(
        selectedElement.id,
        (element) => ({ ...element, baseWidthRatio: ratio, sizePreset: preset, scale: 1 }),
        true,
      );
    },
    [selectedElement, updateElement],
  );

  const applyImageAlign = useCallback(
    (type: 'centerX' | 'centerY') => {
      if (!selectedElement || selectedElement.type !== 'image') return;
      updateElement(
        selectedElement.id,
        (element) => ({
          ...element,
          x: type === 'centerX' ? 0.5 : element.x,
          y: type === 'centerY' ? 0.5 : element.y,
        }),
        true,
      );
    },
    [selectedElement, updateElement],
  );

  const applyImageOpacity = useCallback(
    (opacity: number) => {
      if (!selectedElement || selectedElement.type !== 'image') return;
      updateElement(
        selectedElement.id,
        (element) => ({ ...element, opacity: clamp(opacity, 0.05, 1) }),
        true,
      );
    },
    [selectedElement, updateElement],
  );

  const applyTextAlign = useCallback(
    (align: 'left' | 'center' | 'right') => {
      if (!selectedElement || selectedElement.type !== 'text') return;
      updateElement(
        selectedElement.id,
        (element) => ({ ...element, align }),
        true,
      );
    },
    [selectedElement, updateElement],
  );

  const applyTextWeight = useCallback(() => {
    if (!selectedElement || selectedElement.type !== 'text') return;
    updateElement(
      selectedElement.id,
      (element) => {
        if (element.type !== 'text') return element;
        return { ...element, fontWeight: element.fontWeight === 400 ? 700 : 400 };
      },
      true,
    );
  }, [selectedElement, updateElement]);

  const applyTextPreset = useCallback(
    (preset: 'S' | 'M' | 'L') => {
      if (!selectedElement || selectedElement.type !== 'text') return;
      const size = TEXT_PRESETS[preset];
      updateElement(
        selectedElement.id,
        (element) => ({ ...element, fontSize: size }),
        true,
      );
    },
    [selectedElement, updateElement],
  );

  const moveToDone = useCallback(async () => {
    signal('done_tapped');
    try {
      const printArea = metrics?.printAreaRect
        ? {
            nx: PRINT_AREA.nx,
            ny: PRINT_AREA.ny,
            nw: PRINT_AREA.nw,
            nh: PRINT_AREA.nh,
          }
        : PRINT_AREA;
      console.log('[analytics] export_start');
      const result = await exportEditorPng({
        baseImageSrc: BASE_IMAGE_SRC,
        printAreaNorm: printArea,
        elements,
      });

      const url = URL.createObjectURL(result.blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `tshirt-mockup-${Date.now()}.png`;
      anchor.click();
      URL.revokeObjectURL(url);
      console.log('[analytics] export_success', {
        width: result.width,
        height: result.height,
      });
      return true;
    } catch (error) {
      console.error('[analytics] export_fail', error);
      return false;
    }
  }, [elements, metrics, signal]);

  const onMetricsChange = useCallback((next: StageMetrics | null) => {
    setMetrics(next);
  }, []);

  const collapsedActions = useMemo(() => {
    if (!selectedElement) {
      return [
        {
          key: 'add',
          label: '추가',
          onClick: () => {
            setPage('add');
            setSnap('expanded');
            signal('add_clicked');
            console.log('[analytics] add_open');
          },
          coachId: 'coach-add',
        },
      ];
    }

    if (selectedElement.type === 'image') {
      return [
        {
          key: 'style',
          label: '스타일',
          onClick: () => openStyleForType('image'),
          coachId: 'coach-style',
        },
        {
          key: 'replace',
          label: '교체',
          onClick: handleReplaceImage,
        },
        {
          key: 'delete',
          label: '삭제',
          onClick: deleteSelected,
        },
      ];
    }

    return [
      {
        key: 'style',
        label: '스타일',
        onClick: () => openStyleForType('text'),
        coachId: 'coach-style',
      },
      {
        key: 'edit',
        label: '편집',
        onClick: () => openTextEditor(selectedElement.id),
      },
      {
        key: 'delete',
        label: '삭제',
        onClick: deleteSelected,
      },
    ];
  }, [deleteSelected, handleReplaceImage, openStyleForType, openTextEditor, selectedElement, signal]);

  const addPage = (
    <div className="sheet-content">
      <button
        className="sheet-primary-btn"
        onClick={handleAddPhoto}
        type="button"
      >
        사진 추가
      </button>
      <button
        className="sheet-primary-btn"
        onClick={handleAddAiImage}
        type="button"
      >
        AI 이미지
      </button>
      <button
        className="sheet-primary-btn"
        onClick={onAddText}
        type="button"
      >
        텍스트 추가
      </button>
    </div>
  );

  const imageStylePage = selectedElement?.type === 'image' ? (
    <div className="sheet-content">
      <div className="form-group">
        <p className="sheet-label">크기</p>
        <div className="chip-group">
          {(['S', 'M', 'L'] as const).map((size) => (
            <button
              key={size}
              className={`chip ${selectedElement.sizePreset === size ? 'active' : ''}`}
              onClick={() => applyImagePreset(size)}
              type="button"
            >
              {size}
            </button>
          ))}
        </div>
      </div>
      <div className="button-row">
        <button
          className="ghost-btn"
          onClick={() => applyImageAlign('centerX')}
          type="button"
        >
          가로 가운데
        </button>
        <button
          className="ghost-btn"
          onClick={() => applyImageAlign('centerY')}
          type="button"
        >
          세로 가운데
        </button>
      </div>
      <button
        className="ghost-btn"
        onClick={() => setIsEditingImageOpacity((prev) => !prev)}
        type="button"
      >
        Opacity
      </button>
      {isEditingImageOpacity ? (
        <input
          className="sheet-range"
          type="range"
          min={0.05}
          max={1}
          step={0.05}
          value={selectedElement.opacity}
          onChange={(event) =>
            applyImageOpacity(Number(event.target.value))
          }
        />
      ) : null}
    </div>
  ) : (
    <div className="sheet-content">이미지를 먼저 선택해 주세요.</div>
  );

  const textStylePage = selectedElement?.type === 'text' ? (
    <div className="sheet-content">
      <div className="form-group">
        <p className="sheet-label">색상</p>
        <div className="swatch-group">
          {COLOR_SWATCH.map((color) => (
            <button
              key={color}
              className="swatch"
              style={{ background: color }}
              onClick={() => {
                updateElement(selectedElement.id, (element) => ({ ...element, color }), true);
              }}
              type="button"
              aria-label={`색상 ${color}`}
            />
          ))}
        </div>
      </div>
      <div className="form-group">
        <p className="sheet-label">크기</p>
        <div className="chip-group">
          {(['S', 'M', 'L'] as const).map((size) => (
            <button
              key={size}
              className={`chip ${selectedElement.fontSize === TEXT_PRESETS[size] ? 'active' : ''}`}
              onClick={() => applyTextPreset(size)}
              type="button"
            >
              {size}
            </button>
          ))}
        </div>
      </div>
      <div className="button-row">
        <button
          className={`ghost-btn ${selectedElement.align === 'left' ? 'active' : ''}`}
          onClick={() => applyTextAlign('left')}
          type="button"
        >
          좌
        </button>
        <button
          className={`ghost-btn ${selectedElement.align === 'center' ? 'active' : ''}`}
          onClick={() => applyTextAlign('center')}
          type="button"
        >
          중
        </button>
        <button
          className={`ghost-btn ${selectedElement.align === 'right' ? 'active' : ''}`}
          onClick={() => applyTextAlign('right')}
          type="button"
        >
          우
        </button>
      </div>
      <button className="ghost-btn" onClick={applyTextWeight} type="button">
        Bold {selectedElement.fontWeight === 700 ? 'ON' : 'OFF'}
      </button>
      <button
        className="ghost-btn"
        onClick={() => openTextEditor(selectedElement.id)}
        type="button"
      >
        텍스트 편집
      </button>
    </div>
  ) : (
    <div className="sheet-content">텍스트를 먼저 선택해 주세요.</div>
  );

  const pageContent = {
    add: addPage,
    imageStyle: imageStylePage,
    textStyle: textStylePage,
  } as const;

  return (
    <div className="editor-shell">
      <header className="topbar">
        <div className="topbar-left">
          <button
            className="icon-btn"
            type="button"
            onClick={() => {
              window.history.back();
            }}
          >
            뒤로
          </button>
          <button className="link-btn" type="button" onClick={restart}>
            도움말
          </button>
        </div>
        <div className="topbar-right">
          <button
            className="icon-btn"
            type="button"
            onClick={undo}
            disabled={history.length <= 1}
          >
            되돌리기
          </button>
          <button
            className="icon-btn"
            type="button"
            onClick={redo}
            disabled={!future.length}
          >
            다시하기
          </button>
          <button
            className="primary-btn"
            type="button"
            onClick={moveToDone}
            data-coach-id="coach-done"
          >
            완료
          </button>
        </div>
      </header>

      <section
        className="editor-stage-wrap"
        style={{ paddingTop: `${safeTop}px`, paddingBottom: `${safeBottom}px` }}
      >
        <Stage
          baseImageSrc={BASE_IMAGE_SRC}
          printAreaNorm={PRINT_AREA}
          elements={elements}
          selectedId={selectedId}
          setSelectedId={setSelectedId}
          updateElement={updateElement}
          snapLines={snapLines}
          setSnapLines={setSnapLines}
          setOutOfBounds={setOutOfBounds}
          onGestureStart={() => console.log('[analytics] element_adjust_move_start')}
          onGestureEnd={() => console.log('[analytics] element_adjust_move_end')}
          onGestureUsed={() => {
            signal('gesture_used');
            commitHistory(elementsRef.current, selectedIdRef.current);
            console.log('[analytics] element_adjust_pinch_end');
          }}
          onOpenTextEdit={openTextEditor}
          onMetricsChange={onMetricsChange}
          showOutOfBounds={showOutOfBounds}
        />
      </section>

      <BottomSheet
        snap={snap}
        setSnap={setSnap}
        collapsedHeight={collapsedHeight}
        expandedHeight={expandedHeight}
        page={page}
        setPage={setPage}
        collapsedActions={collapsedActions}
      >
        {pageContent[page]}
      </BottomSheet>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden-input"
        onChange={handlePhotoUpload}
      />

      {isOpen ? (
        <CoachMarkOverlay
          open={isOpen}
          step={currentStep}
          stepIndex={stepIndex}
          totalSteps={totalSteps}
          onNext={next}
          onSkip={skip}
        />
      ) : null}

      {textEditorId ? (
        <div className="text-edit-overlay">
          <textarea
            ref={textInputRef}
            className="text-editor"
            value={textDraft}
            onChange={(event) => setTextDraft(event.target.value)}
            placeholder="텍스트 입력"
          />
          <div className="text-editor-actions">
            <button
              className="ghost-btn"
              onClick={() => setTextEditorId(null)}
              type="button"
            >
              취소
            </button>
            <button className="primary-btn" onClick={saveTextEditor} type="button">
              완료
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
};
