import { useEffect, useMemo, useState } from 'react';
import { clamp } from '../utils/geometry';

const TOPBAR_H = 56;
const SHEET_COLLAPSED_H = 88;
const CANVAS_MIN_H = 360;
const SHEET_EXP_MIN = 260;
const SHEET_EXP_MAX = 420;
const EXPANDED_TARGET_RATIO = 0.42;

const readSafeAreaInsets = (): { top: number; bottom: number } => {
  const probe = document.createElement('div');
  probe.style.position = 'fixed';
  probe.style.top = '0';
  probe.style.left = '0';
  probe.style.paddingTop = 'env(safe-area-inset-top)';
  probe.style.paddingBottom = 'env(safe-area-inset-bottom)';
  probe.style.visibility = 'hidden';
  probe.style.pointerEvents = 'none';

  document.body.appendChild(probe);
  const style = window.getComputedStyle(probe);
  const top = parseFloat(style.paddingTop) || 0;
  const bottom = parseFloat(style.paddingBottom) || 0;
  document.body.removeChild(probe);

  return { top, bottom };
};

export const useBottomSheetHeights = () => {
  const [viewportHeight, setViewportHeight] = useState<number>(() =>
    window.visualViewport?.height ?? window.innerHeight,
  );
  const [safeInsets, setSafeInsets] = useState<{ top: number; bottom: number }>(() =>
    readSafeAreaInsets(),
  );

  useEffect(() => {
    const onResize = () => {
      setViewportHeight(window.visualViewport?.height ?? window.innerHeight);
      setSafeInsets(readSafeAreaInsets());
    };

    onResize();

    window.addEventListener('resize', onResize);
    window.visualViewport?.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      window.visualViewport?.removeEventListener('resize', onResize);
    };
  }, []);

  return useMemo(() => {
    const available =
      viewportHeight - safeInsets.top - safeInsets.bottom - TOPBAR_H;

    const expTarget = available * EXPANDED_TARGET_RATIO;
    const expLimit = available - CANVAS_MIN_H;
    const expMaxAllowed = Math.min(SHEET_EXP_MAX, expLimit);
    const lowerBound = Math.min(SHEET_EXP_MIN, expMaxAllowed);
    const upperBound = Math.max(lowerBound, expMaxAllowed);

    const expandedHeight = clamp(expTarget, lowerBound, upperBound);

    return {
      TOPBAR_H,
      CANVAS_MIN_H,
      collapsedHeight: SHEET_COLLAPSED_H + safeInsets.bottom,
      expandedHeight: Math.max(180, expandedHeight + safeInsets.bottom),
      safeTop: safeInsets.top,
      safeBottom: safeInsets.bottom,
      available,
    };
  }, [safeInsets.bottom, safeInsets.top, viewportHeight]);
};
