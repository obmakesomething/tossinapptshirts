import { useRef } from 'react';
import type { PointerEvent as ReactPointerEvent, ReactNode } from 'react';
import type { SheetPage, SheetSnap } from '../types';

type CollapsedAction = {
  key: string;
  label: string;
  onClick: () => void;
  coachId?: string;
};

type BottomSheetProps = {
  snap: SheetSnap;
  setSnap: (next: SheetSnap) => void;
  collapsedHeight: number;
  expandedHeight: number;
  page: SheetPage;
  setPage: (next: SheetPage) => void;
  collapsedActions: CollapsedAction[];
  children: ReactNode;
};

const PAGE_LABEL: Record<SheetPage, string> = {
  add: '추가',
  imageStyle: '이미지 스타일',
  textStyle: '텍스트 스타일',
};

export const BottomSheet = ({
  snap,
  setSnap,
  collapsedHeight,
  expandedHeight,
  page,
  setPage,
  collapsedActions,
  children,
}: BottomSheetProps) => {
  const startYRef = useRef<number | null>(null);

  const onHandlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    startYRef.current = event.clientY;
  };

  const onHandlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (startYRef.current == null) return;
    const delta = event.clientY - startYRef.current;
    startYRef.current = null;

    if (Math.abs(delta) < 12) {
      setSnap(snap === 'collapsed' ? 'expanded' : 'collapsed');
      return;
    }

    if (delta < -12) {
      setSnap('expanded');
      return;
    }

    if (delta > 12) {
      setSnap('collapsed');
    }
  };

  const activeHeight = snap === 'expanded' ? expandedHeight : collapsedHeight;
  const tabs = Object.keys(PAGE_LABEL) as SheetPage[];

  return (
    <section
      className="bottom-sheet"
      style={{ height: `${activeHeight}px` }}
      aria-label="편집 콘솔"
    >
      <div
        className="sheet-handle-zone"
        onPointerDown={onHandlePointerDown}
        onPointerUp={onHandlePointerUp}
      >
        <div className="sheet-handle" />
      </div>

      {snap === 'collapsed' ? (
        <div className="sheet-collapsed-actions">
          {collapsedActions.slice(0, 3).map((action) => (
            <button
              key={action.key}
              className="sheet-action-btn"
              onClick={action.onClick}
              type="button"
              data-coach-id={action.coachId}
            >
              {action.label}
            </button>
          ))}
        </div>
      ) : (
        <>
          <div className="sheet-page-tabs" role="tablist" aria-label="콘솔 페이지">
            {tabs.map((tab) => (
              <button
                key={tab}
                className={`sheet-tab ${page === tab ? 'active' : ''}`}
                onClick={() => setPage(tab)}
                type="button"
                role="tab"
                aria-selected={page === tab}
              >
                {PAGE_LABEL[tab]}
              </button>
            ))}
          </div>
          <div className="sheet-scroll">{children}</div>
        </>
      )}
    </section>
  );
};
