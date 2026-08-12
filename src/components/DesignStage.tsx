import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Image,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { LayerTransform, TextLayer } from '../context/catalog';
import type { MockupTemplate } from '../data/mockupTemplates';
import { getGarmentStageBackground } from '../utils/garmentContrast';
import { getHemTrimInsetRatio } from '../utils/hemTrim';
import { useTemplatePrintArea } from '../utils/garmentLayout';
import { ScaleSlider } from './ScaleSlider';
import { theme } from './ui';

type DesignStageProps = {
  template: MockupTemplate;
  width?: number;
  height?: number;
  showPrintArea?: boolean;
  showGuides?: boolean;
  showFreeGrid?: boolean;
  interactionMode?: 'template' | 'free';
  imageUri?: string | null;
  imageTransform: LayerTransform;
  textLayer: TextLayer;
  textTransform: LayerTransform;
  activeLayer: 'image' | 'text';
  onImageTransformChange: (transform: LayerTransform) => void;
  onTextTransformChange: (transform: LayerTransform) => void;
  onInteractionStart?: () => void;
  onInteractionEnd?: () => void;
  onOutOfBounds?: (isOut: boolean, overflowPercent?: number) => void;
  cameraScale?: number;
  sizeLabel?: string;
  imageControlFocused?: boolean;
  onImageControlFocusChange?: (focused: boolean) => void;
};



const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const snapRotation = (angle: number) => {
  const SNAP_THRESHOLD = 5;
  const mod = ((angle % 360) + 360) % 360;
  const snapPoints = [0, 90, 180, 270, 360];
  for (const snap of snapPoints) {
    if (Math.abs(mod - snap) < SNAP_THRESHOLD) {
      return angle - mod + (snap === 360 ? 0 : snap);
    }
  }
  return angle;
};

const MIN_SCALE = 0.03;
const MAX_SCALE = 1.5; // Updated for Issue #5
// Offsets are measured in print-area widths, which are ~a third of the stage,
// so the artwork still reaches the edge of the garment.
const MAX_OFFSET = 1.4;
const HIT_SLOP = 12;
const ROTATE_RANGE = 180;

export function DesignStage({
  template,
  width = 220,
  height = 275,
  showPrintArea: _showPrintArea = true,
  showGuides = true,
  showFreeGrid = false,
  interactionMode = 'template',
  imageUri,
  imageTransform,
  textLayer,
  textTransform,
  activeLayer,
  onImageTransformChange,
  onTextTransformChange,
  onInteractionStart,
  onInteractionEnd,
  onOutOfBounds,
  cameraScale: cameraScaleProp = 1,
  sizeLabel,
  imageControlFocused: imageControlFocusedProp,
  onImageControlFocusChange,
}: DesignStageProps) {
  const hemTrimRatio = getHemTrimInsetRatio(sizeLabel);
  // Print areas are image-relative, so they are mapped onto the drawn garment
  // rather than the raw stage box — see utils/garmentLayout.
  const { printArea: templateArea } = useTemplatePrintArea({
    template,
    width,
    height,
    hemTrimRatio,
  });

  const freeArea = {
    // Figma-like free canvas: use the whole stage as editable area.
    left: 0,
    top: 0,
    width,
    height,
  };
  /**
   * Artwork is laid out against the printable region, not the whole stage.
   *
   * Sizing against the stage made `scale: 1` mean "cover the entire canvas", so
   * every freshly picked photo landed bigger than the garment and buried it.
   * Against the print area, `scale: 1` means a full-size chest print — the
   * largest thing that can actually be printed.
   */
  const area = templateArea;
  /** Where a touch may grab the artwork — deliberately looser than the layout. */
  const hitArea = interactionMode === 'free' ? freeArea : templateArea;

  const effectiveShowGuides = _showPrintArea && showGuides;
  const stageBackgroundColor = getGarmentStageBackground(template.color, 'transparent');
  const stageImageStyle = useMemo(
    () => [styles.image, { bottom: height * hemTrimRatio }],
    [height, hemTrimRatio],
  );
  const [imageNaturalSize, setImageNaturalSize] = useState<{
    uri: string;
    width: number;
    height: number;
  } | null>(null);
  const [localImageControlFocused, setLocalImageControlFocused] = useState(false);
  const [isAdjustPopupOpen, setIsAdjustPopupOpen] = useState(false);
  const [adjustTab, setAdjustTab] = useState<'scale' | 'rotate'>('rotate');
  const isImageControlFocused =
    imageControlFocusedProp ?? localImageControlFocused;
  const setImageControlFocused = (focused: boolean) => {
    if (onImageControlFocusChange) {
      onImageControlFocusChange(focused);
      return;
    }
    setLocalImageControlFocused(focused);
  };

  const hasTextLayer = Boolean(textLayer.enabled && textLayer.text.trim().length > 0);
  const hasImageLayer = Boolean(imageUri);
  const effectiveActiveLayer: 'image' | 'text' =
    activeLayer === 'text' && !hasTextLayer && hasImageLayer
      ? 'image'
      : activeLayer === 'image' && !hasImageLayer && hasTextLayer
        ? 'text'
        : activeLayer;
  const activeTransform =
    effectiveActiveLayer === 'text' ? textTransform : imageTransform;
  const updateTransform =
    effectiveActiveLayer === 'text'
      ? onTextTransformChange
      : onImageTransformChange;

  const startRef = useRef({
    offsetX: 0,
    offsetY: 0,
    scale: 1,
    rotation: 0,
    distance: 0,
    angle: 0,
  });

  // Store latest values in refs for PanResponder closure
  const activeTransformRef = useRef(activeTransform);
  const updateTransformRef = useRef(updateTransform);
  const areaRef = useRef(area);
  const hitAreaRef = useRef(hitArea);
  const activeLayerRef = useRef(activeLayer);
  const imageUriRef = useRef(imageUri);
  const textLayerRef = useRef(textLayer);
  const imageTransformRef = useRef(imageTransform);
  const onImageTransformChangeRef = useRef(onImageTransformChange);
  const isImageControlFocusedRef = useRef(isImageControlFocused);

  const cameraScaleRef = useRef(cameraScaleProp);
  const stageSizeRef = useRef({ width, height });
  const panSessionRef = useRef({
    lastTouchCount: 0,
    dxAnchor: 0,
    dyAnchor: 0,
  });

  activeTransformRef.current = activeTransform;
  updateTransformRef.current = updateTransform;
  areaRef.current = area;
  hitAreaRef.current = hitArea;
  activeLayerRef.current = effectiveActiveLayer;
  imageUriRef.current = imageUri;
  textLayerRef.current = textLayer;
  imageTransformRef.current = imageTransform;
  onImageTransformChangeRef.current = onImageTransformChange;
  isImageControlFocusedRef.current = isImageControlFocused;
  cameraScaleRef.current = cameraScaleProp;
  stageSizeRef.current = { width, height };

  const toStageCoords = (x: number, y: number) => {
    const cs = cameraScaleRef.current;
    if (cs === 1) {
      return { x, y };
    }
    const { width: stageWidth, height: stageHeight } = stageSizeRef.current;
    const centerX = stageWidth / 2;
    const centerY = stageHeight / 2;
    return {
      x: centerX + (x - centerX) / cs,
      y: centerY + (y - centerY) / cs,
    };
  };

  const isWithinPrintArea = (x: number, y: number) => {
    const currentArea = hitAreaRef.current;
    return (
      x >= currentArea.left - HIT_SLOP &&
      x <= currentArea.left + currentArea.width + HIT_SLOP &&
      y >= currentArea.top - HIT_SLOP &&
      y <= currentArea.top + currentArea.height + HIT_SLOP
    );
  };
  const canInteract = () => {
    if (isImageControlFocusedRef.current) {
      return false;
    }
    if (activeLayerRef.current === 'text') {
      const layer = textLayerRef.current;
      return Boolean(layer.enabled && layer.text.trim().length > 0);
    }
    return Boolean(imageUriRef.current);
  };

  const responderRef = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: (evt) => {
        if (!canInteract()) return false;
        const { locationX, locationY } = evt.nativeEvent;
        const point = toStageCoords(locationX, locationY);
        return isWithinPrintArea(point.x, point.y);
      },
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        if (!canInteract()) return false;
        const touches = evt.nativeEvent.touches ?? [];
        const movedEnough =
          Math.abs(gestureState.dx) > 2 || Math.abs(gestureState.dy) > 2;
        if (touches.length >= 2 && touches[0] && touches[1]) {
          const [a, b] = touches;
          const point = toStageCoords(
            (a.locationX + b.locationX) / 2,
            (a.locationY + b.locationY) / 2,
          );
          return isWithinPrintArea(point.x, point.y);
        }
        const { locationX, locationY } = evt.nativeEvent;
        const point = toStageCoords(locationX, locationY);
        return movedEnough && isWithinPrintArea(point.x, point.y);
      },
      onPanResponderTerminationRequest: () => false,
      onShouldBlockNativeResponder: () => true,
      onPanResponderGrant: (evt) => {
        onInteractionStart?.();

        const touches = evt.nativeEvent.touches ?? [];
        const a = touches[0];
        const b = touches[1];
        const distance =
          a && b ? Math.hypot(b.pageX - a.pageX, b.pageY - a.pageY) : 0;
        const angle =
          a && b ? Math.atan2(b.pageY - a.pageY, b.pageX - a.pageX) : 0;
        const currentTransform = activeTransformRef.current;
        startRef.current = {
          offsetX: currentTransform.offsetX,
          offsetY: currentTransform.offsetY,
          scale: currentTransform.scale,
          rotation: currentTransform.rotation,
          distance,
          angle,
        };
        panSessionRef.current.lastTouchCount = Math.max(1, touches.length);
        panSessionRef.current.dxAnchor = 0;
        panSessionRef.current.dyAnchor = 0;
      },
      onPanResponderMove: (evt, gestureState) => {
        const touches = evt.nativeEvent.touches ?? [];
        const currentArea = areaRef.current;
        const updateFn = updateTransformRef.current;
        const session = panSessionRef.current;

        if (touches.length >= 2 && touches[0] && touches[1]) {
          const [a, b] = touches;
          const distance = Math.hypot(b.pageX - a.pageX, b.pageY - a.pageY);
          const angle = Math.atan2(b.pageY - a.pageY, b.pageX - a.pageX);
          if (session.lastTouchCount < 2) {
            const currentTransform = activeTransformRef.current;
            startRef.current = {
              offsetX: currentTransform.offsetX,
              offsetY: currentTransform.offsetY,
              scale: currentTransform.scale,
              rotation: currentTransform.rotation,
              distance,
              angle,
            };
          }
          const scaleDelta = startRef.current.distance
            ? distance / startRef.current.distance
            : 1;
          const rotationDelta =
            (angle - startRef.current.angle) * (180 / Math.PI);
          const nextScale = clamp(
            startRef.current.scale * scaleDelta,
            MIN_SCALE,
            MAX_SCALE,
          );
          updateFn({
            offsetX: startRef.current.offsetX,
            offsetY: startRef.current.offsetY,
            scale: nextScale,
            rotation: startRef.current.rotation + rotationDelta,
          });
          session.lastTouchCount = touches.length;
        } else {
          if (session.lastTouchCount >= 2) {
            const currentTransform = activeTransformRef.current;
            startRef.current = {
              offsetX: currentTransform.offsetX,
              offsetY: currentTransform.offsetY,
              scale: currentTransform.scale,
              rotation: currentTransform.rotation,
              distance: 0,
              angle: 0,
            };
            session.dxAnchor = gestureState.dx;
            session.dyAnchor = gestureState.dy;
          }
          session.lastTouchCount = Math.max(1, touches.length);
          const adjustedDx = gestureState.dx - session.dxAnchor;
          const adjustedDy = gestureState.dy - session.dyAnchor;
          const cs = cameraScaleRef.current;
          const nextOffsetX = clamp(
            startRef.current.offsetX + adjustedDx / (currentArea.width * cs),
            -MAX_OFFSET,
            MAX_OFFSET,
          );
          const nextOffsetY = clamp(
            startRef.current.offsetY + adjustedDy / (currentArea.height * cs),
            -MAX_OFFSET,
            MAX_OFFSET,
          );
          updateFn({
            scale: startRef.current.scale,
            rotation: startRef.current.rotation,
            offsetX: nextOffsetX,
            offsetY: nextOffsetY,
          });
        }
      },
      onPanResponderRelease: () => {
        // Snap rotation to 0/90/180/270 if within ±5°
        const cur = activeTransformRef.current;
        const snapped = snapRotation(cur.rotation);
        if (snapped !== cur.rotation) {
          updateTransformRef.current({ ...cur, rotation: snapped });
        }
        panSessionRef.current.lastTouchCount = 0;
        panSessionRef.current.dxAnchor = 0;
        panSessionRef.current.dyAnchor = 0;
        onInteractionEnd?.();
      },
      onPanResponderTerminate: () => {
        panSessionRef.current.lastTouchCount = 0;
        panSessionRef.current.dxAnchor = 0;
        panSessionRef.current.dyAnchor = 0;
        onInteractionEnd?.();
      },
    }),
  );

  const buildImageRect = (transform: LayerTransform) => {
    const maxWidthPx = area.width * transform.scale;
    const maxHeightPx = area.height * transform.scale;
    const fallbackAspect = area.width / area.height;
    const imageAspect =
      imageUri &&
      imageNaturalSize &&
      imageNaturalSize.uri === imageUri &&
      imageNaturalSize.width > 0 &&
      imageNaturalSize.height > 0
        ? imageNaturalSize.width / imageNaturalSize.height
        : fallbackAspect;
    let widthPx = maxWidthPx;
    let heightPx = maxHeightPx;

    if (maxWidthPx / maxHeightPx > imageAspect) {
      heightPx = maxHeightPx;
      widthPx = heightPx * imageAspect;
    } else {
      widthPx = maxWidthPx;
      heightPx = widthPx / imageAspect;
    }
    const left =
      area.left + area.width / 2 + transform.offsetX * area.width - widthPx / 2;
    const top =
      area.top +
      area.height / 2 +
      transform.offsetY * area.height -
      heightPx / 2;
    return {
      left,
      top,
      width: widthPx,
      height: heightPx,
    };
  };

  const buildImageStyle = (transform: LayerTransform) => {
    const rect = buildImageRect(transform);
    return {
      ...rect,
      transform: [{ rotate: `${transform.rotation}deg` }],
    };
  };

  const buildTextStyle = (transform: LayerTransform) => {
    const widthPx = area.width;
    const heightPx = area.height;
    const left =
      area.left + area.width / 2 + transform.offsetX * area.width - widthPx / 2;
    const top =
      area.top +
      area.height / 2 +
      transform.offsetY * area.height -
      heightPx / 2;
    return {
      left,
      top,
      width: widthPx,
      height: heightPx,
      transform: [
        { scale: transform.scale },
        { rotate: `${transform.rotation}deg` },
      ],
    };
  };

  // Out-of-bounds detection (simplified, ignoring rotation)
  const { isOutOfBounds } = useMemo(() => {
    const checkBounds = (transform: LayerTransform, isText: boolean) => {
      if (isText && !textLayer.enabled) return { out: false, overflow: 0 };
      if (!isText && !imageUri) return { out: false, overflow: 0 };
      const s = isText ? buildTextStyle(transform) : buildImageStyle(transform);
      const w = 'width' in s ? (s.width as number) : 0;
      const h = 'height' in s ? (s.height as number) : 0;
      const l = s.left as number;
      const t = s.top as number;

      // Calculate overflow amounts
      const leftOverflow = Math.max(0, area.left - l);
      const topOverflow = Math.max(0, area.top - t);
      const rightOverflow = Math.max(0, (l + w) - (area.left + area.width));
      const bottomOverflow = Math.max(0, (t + h) - (area.top + area.height));

      const maxOverflow = Math.max(leftOverflow, topOverflow, rightOverflow, bottomOverflow);
      const refDimension = Math.max(area.width, area.height);
      const overflowPct = refDimension > 0 ? Math.round((maxOverflow / refDimension) * 100) : 0;

      const out = maxOverflow > 2; // 2px tolerance
      return { out, overflow: overflowPct };
    };
    const imgResult = checkBounds(imageTransform, false);
    const txtResult = checkBounds(textTransform, true);
    const out = imgResult.out || txtResult.out;
    const maxOverflow = Math.max(imgResult.overflow, txtResult.overflow);
    onOutOfBounds?.(out, maxOverflow);
    return { isOutOfBounds: out, overflowPercent: maxOverflow };
  }, [imageTransform, textTransform, imageUri, textLayer.enabled, area.left, area.top, area.width, area.height, imageNaturalSize]);

  const GUIDE_SIZE = 12;
  const GUIDE_WIDTH = 2;
  const overlayColor = 'rgba(0,0,0,0.15)';
  const borderColor = isOutOfBounds ? theme.colors.error : theme.colors.primary;
  const selectedImageRect = imageUri ? buildImageRect(imageTransform) : null;
  const showImageSelectionControls = Boolean(
    selectedImageRect && effectiveActiveLayer === 'image',
  );
  const rotateButtonSize = 30;
  const rotateButtonTop =
    selectedImageRect == null
      ? 8
      : clamp(
          selectedImageRect.top - rotateButtonSize / 2,
          8,
          height - rotateButtonSize - 8,
        );
  const rotateButtonLeft =
    selectedImageRect == null
      ? 8
      : clamp(
          selectedImageRect.left + selectedImageRect.width - rotateButtonSize / 2,
          8,
          width - rotateButtonSize - 8,
        );
  const adjustPopupWidth =
    selectedImageRect == null
      ? 0
      : clamp(Math.max(selectedImageRect.width + 24, 212), 212, width - 12);
  const adjustPopupTop =
    selectedImageRect == null
      ? 8
      : clamp(selectedImageRect.top + selectedImageRect.height + 12, 8, height - 126);
  const adjustPopupLeft =
    selectedImageRect == null
      ? 6
      : clamp(
          selectedImageRect.left + selectedImageRect.width / 2 - adjustPopupWidth / 2,
          6,
          width - adjustPopupWidth - 6,
        );
  const openAdjustPopup = (tab: 'scale' | 'rotate' = 'rotate') => {
    setAdjustTab(tab);
    setIsAdjustPopupOpen(true);
    setImageControlFocused(true);
  };

  const nudgeRotation = (delta: number) => {
    const current = imageTransformRef.current;
    onImageTransformChangeRef.current({
      ...current,
      rotation: current.rotation + delta,
    });
  };

  useEffect(() => {
    if (!showImageSelectionControls && isImageControlFocused) {
      setImageControlFocused(false);
    }
    if (!showImageSelectionControls && isAdjustPopupOpen) {
      setIsAdjustPopupOpen(false);
    }
  }, [showImageSelectionControls, isImageControlFocused, isAdjustPopupOpen]);

  useEffect(() => {
    if (!isImageControlFocused && isAdjustPopupOpen) {
      setIsAdjustPopupOpen(false);
    }
  }, [isImageControlFocused, isAdjustPopupOpen]);

  return (
    <View
      style={[styles.container, { width, height }]}
      {...responderRef.current.panHandlers}
    >
      <View
        style={[
          styles.cameraViewport,
          { backgroundColor: stageBackgroundColor, transform: [{ scale: cameraScaleProp }] },
        ]}
      >
        <Image
          source={template.image}
          style={stageImageStyle}
          resizeMode="contain"
          onError={(e) =>
            console.error(
              '[DesignStage] Image load error:',
              e.nativeEvent.error,
              'Source:',
              template.image,
            )
          }
          onLoad={() =>
            console.log(
              '[DesignStage] Image loaded successfully:',
              template.image,
            )
          }
        />
        {/* Overlay mask: darken outside print area */}
        {effectiveShowGuides && (
          <>
            <View style={[styles.overlayMask, { top: 0, left: 0, right: 0, height: area.top, backgroundColor: overlayColor }]} />
            <View style={[styles.overlayMask, { top: area.top + area.height, left: 0, right: 0, bottom: 0, backgroundColor: overlayColor }]} />
            <View style={[styles.overlayMask, { top: area.top, left: 0, width: area.left, height: area.height, backgroundColor: overlayColor }]} />
            <View style={[styles.overlayMask, { top: area.top, left: area.left + area.width, right: 0, height: area.height, backgroundColor: overlayColor }]} />
          </>
        )}

        {/* Free-grid guide for wide editing area */}
        {showFreeGrid && !effectiveShowGuides && (
          <View
            pointerEvents="none"
            style={[
              styles.freeGridFrame,
              {
                left: area.left,
                top: area.top,
                width: area.width,
                height: area.height,
              },
            ]}
          >
            <View style={[styles.freeGridLine, styles.freeGridLineH, { top: '25%' }]} />
            <View style={[styles.freeGridLine, styles.freeGridLineH, { top: '50%' }]} />
            <View style={[styles.freeGridLine, styles.freeGridLineH, { top: '75%' }]} />
            <View style={[styles.freeGridLine, styles.freeGridLineV, { left: '25%' }]} />
            <View style={[styles.freeGridLine, styles.freeGridLineV, { left: '50%' }]} />
            <View style={[styles.freeGridLine, styles.freeGridLineV, { left: '75%' }]} />
          </View>
        )}
        {/* Print area border — the one boundary the customer must be able to
            see. It is tied to showPrintArea rather than showGuides so the
            editor can drop the dimming mask without also hiding where the
            design actually prints. */}
        {_showPrintArea && (hasImageLayer || hasTextLayer || effectiveShowGuides) && (
          <View
            pointerEvents="none"
            style={[
              styles.printArea,
              {
                left: area.left,
                top: area.top,
                width: area.width,
                height: area.height,
                borderColor,
              },
            ]}
          />
        )}

        {/* Corner L-guides */}
        {effectiveShowGuides && (
          <>
            {/* Top-left */}
            <View style={[styles.cornerGuide, { top: area.top - 1, left: area.left - 1, borderTopWidth: GUIDE_WIDTH, borderLeftWidth: GUIDE_WIDTH, borderColor, width: GUIDE_SIZE, height: GUIDE_SIZE }]} />
            {/* Top-right */}
            <View style={[styles.cornerGuide, { top: area.top - 1, left: area.left + area.width - GUIDE_SIZE + 1, borderTopWidth: GUIDE_WIDTH, borderRightWidth: GUIDE_WIDTH, borderColor, width: GUIDE_SIZE, height: GUIDE_SIZE }]} />
            {/* Bottom-left */}
            <View style={[styles.cornerGuide, { top: area.top + area.height - GUIDE_SIZE + 1, left: area.left - 1, borderBottomWidth: GUIDE_WIDTH, borderLeftWidth: GUIDE_WIDTH, borderColor, width: GUIDE_SIZE, height: GUIDE_SIZE }]} />
            {/* Bottom-right */}
            <View style={[styles.cornerGuide, { top: area.top + area.height - GUIDE_SIZE + 1, left: area.left + area.width - GUIDE_SIZE + 1, borderBottomWidth: GUIDE_WIDTH, borderRightWidth: GUIDE_WIDTH, borderColor, width: GUIDE_SIZE, height: GUIDE_SIZE }]} />
          </>
        )}
        {imageUri ? (
          <>
            <Image
              source={{ uri: imageUri }}
              resizeMode="contain"
              style={[styles.designImage, buildImageStyle(imageTransform)]}
              onLoad={(evt) => {
                const loaded = evt.nativeEvent.source;
                if (imageUri && loaded?.width && loaded?.height) {
                  setImageNaturalSize({
                    uri: imageUri,
                    width: loaded.width,
                    height: loaded.height,
                  });
                }
              }}
            />
            {effectiveActiveLayer === 'image' ? (
              <View
                pointerEvents="none"
                style={[styles.selectionOutline, buildImageStyle(imageTransform)]}
              />
            ) : null}
            {showImageSelectionControls ? (
              <>
                <Pressable
                  testID="image-adjust-trigger"
                  style={[
                    styles.imageRotateButton,
                    {
                      width: rotateButtonSize,
                      height: rotateButtonSize,
                      borderRadius: rotateButtonSize / 2,
                      top: rotateButtonTop,
                      left: rotateButtonLeft,
                    },
                    isAdjustPopupOpen && styles.imageRotateButtonActive,
                  ]}
                  onPress={() => nudgeRotation(15)}
                  onLongPress={() => openAdjustPopup('rotate')}
                  delayLongPress={220}
                >
                  <Text
                    style={[
                      styles.imageRotateButtonText,
                      isAdjustPopupOpen && styles.imageRotateButtonTextActive,
                    ]}
                  >
                    ↻
                  </Text>
                </Pressable>
                {isAdjustPopupOpen ? (
                  <View
                    testID="image-adjust-popup"
                    style={[
                      styles.adjustPopup,
                      {
                        width: adjustPopupWidth,
                        top: adjustPopupTop,
                        left: adjustPopupLeft,
                      },
                    ]}
                  >
                    <View style={styles.adjustPopupTabRow}>
                      <Pressable
                        testID="adjust-tab-scale"
                        style={[
                          styles.adjustPopupTab,
                          adjustTab === 'scale' && styles.adjustPopupTabActive,
                        ]}
                        onPress={() => setAdjustTab('scale')}
                      >
                        <Text
                          style={[
                            styles.adjustPopupTabText,
                            adjustTab === 'scale' && styles.adjustPopupTabTextActive,
                          ]}
                        >
                          크기 조절
                        </Text>
                      </Pressable>
                      <Pressable
                        testID="adjust-tab-rotate"
                        style={[
                          styles.adjustPopupTab,
                          adjustTab === 'rotate' && styles.adjustPopupTabActive,
                        ]}
                        onPress={() => setAdjustTab('rotate')}
                      >
                        <Text
                          style={[
                            styles.adjustPopupTabText,
                            adjustTab === 'rotate' && styles.adjustPopupTabTextActive,
                          ]}
                        >
                          각도 조절
                        </Text>
                      </Pressable>
                    </View>
                    {adjustTab === 'scale' ? (
                      <View style={styles.adjustPopupControlRow}>
                        <Text style={styles.adjustPopupValueText}>
                          배율 {imageTransform.scale.toFixed(2)}
                        </Text>
                        <ScaleSlider
                          min={MIN_SCALE}
                          max={MAX_SCALE}
                          value={imageTransform.scale}
                          onChange={(scale) =>
                            onImageTransformChange({ ...imageTransform, scale })
                          }
                          onInteractionStart={() => setImageControlFocused(true)}
                        />
                      </View>
                    ) : (
                      <View style={styles.adjustPopupControlRow}>
                        <View style={styles.rotateNudgeRow}>
                          <Pressable
                            testID="rotate-nudge-left"
                            style={styles.rotateNudgeButton}
                            onPress={() => nudgeRotation(-0.5)}
                          >
                            <Text style={styles.rotateNudgeButtonText}>−</Text>
                          </Pressable>
                          <Pressable
                            testID="rotate-nudge-right"
                            style={styles.rotateNudgeButton}
                            onPress={() => nudgeRotation(0.5)}
                          >
                            <Text style={styles.rotateNudgeButtonText}>＋</Text>
                          </Pressable>
                          <Text style={styles.adjustPopupValueText}>
                            {imageTransform.rotation.toFixed(1)}°
                          </Text>
                        </View>
                        <ScaleSlider
                          min={-ROTATE_RANGE}
                          max={ROTATE_RANGE}
                          value={imageTransform.rotation}
                          onChange={(rotation) =>
                            onImageTransformChange({ ...imageTransform, rotation })
                          }
                          onInteractionStart={() => setImageControlFocused(true)}
                        />
                      </View>
                    )}
                  </View>
                ) : null}
              </>
            ) : null}
          </>
        ) : null}
        {!isImageControlFocused && textLayer.enabled && textLayer.text ? (
          <View style={[styles.textWrapper, buildTextStyle(textTransform)]}>
            <Text
              style={[
                styles.textLayer,
                {
                  fontSize: textLayer.fontSize,
                  color: textLayer.color,
                  fontFamily:
                    textLayer.fontWeight === 'bold'
                      ? 'NotoSansKR-Bold'
                      : 'NotoSansKR-Regular',
                },
              ]}
            >
              {textLayer.text}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 0,
    overflow: 'visible',
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraViewport: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    // The backdrop behind a light garment is a contrast surface, not a stray
    // rectangle — round it so it reads as part of the product shot.
    borderRadius: 16,
    overflow: 'hidden',
  },
  image: {
    ...StyleSheet.absoluteFillObject,
    shadowColor: '#191F28',
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
  },
  overlayMask: {
    position: 'absolute',
  },
  freeGridFrame: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: 'rgba(49, 130, 246, 0.3)',
    borderRadius: 8,
  },
  freeGridLine: {
    position: 'absolute',
    backgroundColor: 'rgba(49, 130, 246, 0.18)',
  },
  freeGridLineH: {
    left: 0,
    right: 0,
    height: 1,
  },
  freeGridLineV: {
    top: 0,
    bottom: 0,
    width: 1,
  },
  printArea: {
    position: 'absolute',
    borderWidth: 1.5,
    borderColor: theme.colors.primary,
    borderStyle: 'dashed',
    borderRadius: 6,
    alignItems: 'center',
  },
  cornerGuide: {
    position: 'absolute',
    borderColor: theme.colors.primary,
  },
  designImage: {
    position: 'absolute',
    backgroundColor: 'transparent',
  },
  selectionOutline: {
    position: 'absolute',
    borderWidth: 2,
    borderRadius: 8,
    borderColor: '#1B64DA',
    borderStyle: 'dashed',
    backgroundColor: 'transparent',
  },
  imageRotateButton: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: '#1B64DA',
    backgroundColor: 'rgba(255,255,255,0.96)',
    shadowColor: '#191F28',
    shadowOpacity: 0.06,
    alignItems: 'center',
    justifyContent: 'center',
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  imageRotateButtonActive: {
    backgroundColor: '#1B64DA',
  },
  imageRotateButtonText: {
    fontSize: 14,
    lineHeight: 16,
    color: '#1B64DA',
    fontWeight: '700',
  },
  imageRotateButtonTextActive: {
    color: '#FFFFFF',
  },
  adjustPopup: {
    position: 'absolute',
    minHeight: 102,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(49, 130, 246, 0.45)',
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    paddingHorizontal: 8,
    paddingVertical: 8,
    shadowColor: '#191F28',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  adjustPopupTabRow: {
    flexDirection: 'row',
    marginBottom: 8,
    gap: 6,
  },
  adjustPopupTab: {
    flex: 1,
    height: 30,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(49, 130, 246, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  adjustPopupTabActive: {
    borderColor: '#1B64DA',
    backgroundColor: '#1B64DA',
  },
  adjustPopupTabText: {
    fontSize: 11,
    lineHeight: 14,
    color: '#1B64DA',
    fontWeight: '700',
  },
  adjustPopupTabTextActive: {
    color: '#FFFFFF',
  },
  adjustPopupControlRow: {
    gap: 8,
  },
  rotateNudgeButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(49, 130, 246, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  rotateNudgeButtonText: {
    fontSize: 14,
    lineHeight: 18,
    color: '#1B64DA',
    fontWeight: '700',
  },
  rotateNudgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  adjustPopupValueText: {
    minWidth: 64,
    textAlign: 'left',
    fontSize: 11,
    lineHeight: 15,
    color: '#4E5968',
    fontWeight: '700',
  },
  textWrapper: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textLayer: {
    textAlign: 'center',
    includeFontPadding: false,
  },
});
