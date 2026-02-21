import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CoachStepId, GestureSignal } from '../types';

const STORAGE_KEY = 'tshirt-editor-v1-coach-seen';
const STORAGE_VERSION = 'v1';

type CoachStep = {
  id: CoachStepId;
  title: string;
  message: string;
  targetId: string;
};

const STEPS: CoachStep[] = [
  {
    id: 'add',
    title: '1/4 추가 버튼',
    message: '먼저 +추가 버튼을 눌러 사진, AI 이미지, 텍스트를 넣어보세요.',
    targetId: 'coach-add',
  },
  {
    id: 'gesture',
    title: '2/4 직접 조작',
    message: '오브젝트를 드래그로 이동하고, 핀치로 크기를 바꿔보세요.',
    targetId: 'coach-stage',
  },
  {
    id: 'style',
    title: '3/4 스타일',
    message: '선택한 오브젝트의 스타일을 열어 빠르게 정렬/색상을 조정하세요.',
    targetId: 'coach-style',
  },
  {
    id: 'done',
    title: '4/4 완료',
    message: '완료 버튼을 눌러 PNG로 저장하면 끝입니다.',
    targetId: 'coach-done',
  },
];

const eventLog = (name: string, payload?: Record<string, unknown>) => {
  console.log(`[analytics] ${name}`, payload ?? {});
};

export const useCoachMarks = ({
  hasAnyElement,
}: {
  hasAnyElement: boolean;
}) => {
  const [open, setOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    const seen = localStorage.getItem(STORAGE_KEY);
    if (seen !== STORAGE_VERSION) {
      setOpen(true);
      setStepIndex(0);
      eventLog('tutorial_start', { source: 'first_open' });
    }
  }, []);

  const finish = useCallback((reason: 'finish' | 'skip') => {
    localStorage.setItem(STORAGE_KEY, STORAGE_VERSION);
    setOpen(false);
    eventLog(reason === 'finish' ? 'tutorial_finish' : 'tutorial_skip', {
      step: STEPS[stepIndex]?.id,
    });
  }, [stepIndex]);

  const next = useCallback(() => {
    setStepIndex((prev) => {
      const nextIndex = prev + 1;
      if (nextIndex >= STEPS.length) {
        localStorage.setItem(STORAGE_KEY, STORAGE_VERSION);
        setOpen(false);
        eventLog('tutorial_finish', { source: 'next_button' });
        return prev;
      }
      eventLog('tutorial_step', { step: STEPS[nextIndex].id });
      return nextIndex;
    });
  }, []);

  const signal = useCallback((name: GestureSignal) => {
    if (!open) return;
    const current = STEPS[stepIndex]?.id;
    if (!current) return;

    if (current === 'add' && name === 'add_clicked') {
      next();
      return;
    }

    if (current === 'gesture' && name === 'gesture_used' && hasAnyElement) {
      next();
      return;
    }

    if (current === 'style' && name === 'style_open') {
      next();
      return;
    }

    if (current === 'done' && name === 'done_tapped') {
      finish('finish');
    }
  }, [finish, hasAnyElement, next, open, stepIndex]);

  const restart = useCallback(() => {
    setOpen(true);
    setStepIndex(0);
    localStorage.removeItem(STORAGE_KEY);
    eventLog('tutorial_start', { source: 'manual_restart' });
  }, []);

  const skip = useCallback(() => finish('skip'), [finish]);

  const currentStep = useMemo(() => STEPS[stepIndex] ?? STEPS[0], [stepIndex]);

  return {
    isOpen: open,
    stepIndex,
    totalSteps: STEPS.length,
    currentStep,
    next,
    skip,
    restart,
    signal,
  };
};
