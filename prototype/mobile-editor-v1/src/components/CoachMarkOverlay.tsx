import { useEffect, useMemo, useState } from 'react';

type StepLike = {
  id: string;
  title: string;
  message: string;
  targetId: string;
};

type Props = {
  open: boolean;
  step: StepLike;
  stepIndex: number;
  totalSteps: number;
  onNext: () => void;
  onSkip: () => void;
};

type Rect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

const getRect = (targetId: string): Rect | null => {
  const node = document.querySelector<HTMLElement>(`[data-coach-id="${targetId}"]`);
  if (!node) return null;
  const rect = node.getBoundingClientRect();
  return {
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height,
  };
};

export const CoachMarkOverlay = ({
  open,
  step,
  stepIndex,
  totalSteps,
  onNext,
  onSkip,
}: Props) => {
  const [rect, setRect] = useState<Rect | null>(null);

  useEffect(() => {
    if (!open) return;

    const update = () => setRect(getRect(step.targetId));
    update();

    const raf = requestAnimationFrame(update);
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [open, step.targetId]);

  const spotStyle = useMemo(() => {
    if (!rect) return undefined;
    return {
      left: `${rect.left - 8}px`,
      top: `${rect.top - 8}px`,
      width: `${rect.width + 16}px`,
      height: `${rect.height + 16}px`,
    };
  }, [rect]);

  if (!open) return null;

  return (
    <div className="coach-overlay" role="dialog" aria-modal="true">
      {rect ? <div className="coach-spot" style={spotStyle} /> : null}
      <div className="coach-card">
        <div className="coach-step">{step.title}</div>
        <p className="coach-message">{step.message}</p>
        <div className="coach-actions">
          <button className="ghost-btn" onClick={onSkip} type="button">
            건너뛰기
          </button>
          <button className="primary-btn" onClick={onNext} type="button">
            {stepIndex + 1 === totalSteps ? '닫기' : '다음'}
          </button>
        </div>
      </div>
    </div>
  );
};
