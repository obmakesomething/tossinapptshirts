import React, { useMemo, useRef, useState } from 'react';
import { Image, PanResponder, StyleSheet, Text, View } from 'react-native';
import type { MockupTemplate } from '../data/mockupTemplates';
import type { LayerTransform, TextLayer } from '../context/catalog';
import { theme } from './ui';
import { resolveColorValue } from '../data/colorMap';

type DesignStageProps = {
  template: MockupTemplate;
  width?: number;
  height?: number;
  showPrintArea?: boolean;
  imageUri?: string | null;
  imageTransform: LayerTransform;
  textLayer: TextLayer;
  textTransform: LayerTransform;
  activeLayer: 'image' | 'text';
  onImageTransformChange: (transform: LayerTransform) => void;
  onTextTransformChange: (transform: LayerTransform) => void;
  onInteractionStart?: () => void;
  onInteractionEnd?: () => void;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const MIN_SCALE = 0.2;
const MAX_SCALE = 1.6;
const MAX_OFFSET = 0.55;
const HIT_SLOP = 12;

export function DesignStage({
  template,
  width = 240,
  height = 320,
  showPrintArea = true,
  imageUri,
  imageTransform,
  textLayer,
  textTransform,
  activeLayer,
  onImageTransformChange,
  onTextTransformChange,
  onInteractionStart,
  onInteractionEnd,
}: DesignStageProps) {
  const area = {
    left: width * template.printArea.x,
    top: height * template.printArea.y,
    width: width * template.printArea.width,
    height: height * template.printArea.height,
  };
  const colorValue = resolveColorValue(template.color);
  const lightness =
    (parseInt(colorValue.slice(1, 3), 16) * 0.299 +
      parseInt(colorValue.slice(3, 5), 16) * 0.587 +
      parseInt(colorValue.slice(5, 7), 16) * 0.114) /
    255;
  const overlayOpacity = lightness < 0.5 ? 0.28 : 0.1;

  const activeTransform = activeLayer === 'text' ? textTransform : imageTransform;
  const updateTransform =
    activeLayer === 'text' ? onTextTransformChange : onImageTransformChange;

  const [editing, setEditing] = useState(false);
  const editingRef = useRef(false);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartRef = useRef({ x: 0, y: 0 });
  const startRef = useRef({
    offsetX: 0,
    offsetY: 0,
    scale: 1,
    rotation: 0,
    distance: 0,
    angle: 0,
  });

  const clearHoldTimer = () => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  };

  const beginEditing = () => {
    if (editingRef.current) return;
    editingRef.current = true;
    setEditing(true);
    onInteractionStart?.();
  };

  const finishEditing = () => {
    if (!editingRef.current) return;
    editingRef.current = false;
    setEditing(false);
    onInteractionEnd?.();
  };

  const isWithinPrintArea = (x: number, y: number) =>
    x >= area.left - HIT_SLOP &&
    x <= area.left + area.width + HIT_SLOP &&
    y >= area.top - HIT_SLOP &&
    y <= area.top + area.height + HIT_SLOP;

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: (evt) => {
          const { locationX, locationY } = evt.nativeEvent;
          return isWithinPrintArea(locationX, locationY);
        },
        onMoveShouldSetPanResponder: (evt) => {
          const { locationX, locationY } = evt.nativeEvent;
          return isWithinPrintArea(locationX, locationY);
        },
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: (evt) => {
          const touches = evt.nativeEvent.touches ?? [];
          const { locationX, locationY } = evt.nativeEvent;
          if (!editingRef.current) {
            touchStartRef.current = { x: locationX, y: locationY };
            clearHoldTimer();
            holdTimerRef.current = setTimeout(() => {
              beginEditing();
            }, 220);
          }
          const a = touches[0];
          const b = touches[1];
          const distance =
            a && b ? Math.hypot(b.pageX - a.pageX, b.pageY - a.pageY) : 0;
          const angle = a && b ? Math.atan2(b.pageY - a.pageY, b.pageX - a.pageX) : 0;
          startRef.current = {
            offsetX: activeTransform.offsetX,
            offsetY: activeTransform.offsetY,
            scale: activeTransform.scale,
            rotation: activeTransform.rotation,
            distance,
            angle,
          };
        },
        onPanResponderMove: (evt, gestureState) => {
          if (!editingRef.current) {
            const { locationX, locationY } = evt.nativeEvent;
            const dx = locationX - touchStartRef.current.x;
            const dy = locationY - touchStartRef.current.y;
            if (Math.hypot(dx, dy) > 10) {
              clearHoldTimer();
            }
            return;
          }
          const touches = evt.nativeEvent.touches ?? [];
          if (touches.length >= 2 && touches[0] && touches[1]) {
            const [a, b] = touches;
            const distance = Math.hypot(b.pageX - a.pageX, b.pageY - a.pageY);
            const angle = Math.atan2(b.pageY - a.pageY, b.pageX - a.pageX);
            const scaleDelta = startRef.current.distance
              ? distance / startRef.current.distance
              : 1;
            const rotationDelta = (angle - startRef.current.angle) * (180 / Math.PI);
            const nextScale = clamp(
              startRef.current.scale * scaleDelta,
              MIN_SCALE,
              MAX_SCALE
            );
            updateTransform({
              offsetX: startRef.current.offsetX,
              offsetY: startRef.current.offsetY,
              scale: nextScale,
              rotation: startRef.current.rotation + rotationDelta,
            });
          } else {
            const nextOffsetX = clamp(
              startRef.current.offsetX + gestureState.dx / area.width,
              -MAX_OFFSET,
              MAX_OFFSET
            );
            const nextOffsetY = clamp(
              startRef.current.offsetY + gestureState.dy / area.height,
              -MAX_OFFSET,
              MAX_OFFSET
            );
            updateTransform({
              scale: startRef.current.scale,
              rotation: startRef.current.rotation,
              offsetX: nextOffsetX,
              offsetY: nextOffsetY,
            });
          }
        },
        onPanResponderRelease: () => {
          clearHoldTimer();
        },
        onPanResponderTerminate: () => {
          clearHoldTimer();
        },
      }),
    [activeTransform, area.height, area.width, beginEditing, isWithinPrintArea, updateTransform]
  );

  const buildLayerStyle = (transform: LayerTransform) => {
    const widthPx = area.width * transform.scale;
    const heightPx = area.height * transform.scale;
    const left =
      area.left + area.width / 2 + transform.offsetX * area.width - widthPx / 2;
    const top =
      area.top + area.height / 2 + transform.offsetY * area.height - heightPx / 2;
    return {
      left,
      top,
      width: widthPx,
      height: heightPx,
      transform: [{ rotate: `${transform.rotation}deg` }],
    };
  };

  const buildTextStyle = (transform: LayerTransform) => {
    const widthPx = area.width;
    const heightPx = area.height;
    const left =
      area.left + area.width / 2 + transform.offsetX * area.width - widthPx / 2;
    const top =
      area.top + area.height / 2 + transform.offsetY * area.height - heightPx / 2;
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

  return (
    <View
      style={[styles.container, { width, height }]}
      onTouchStart={(evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        if (editingRef.current && !isWithinPrintArea(locationX, locationY)) {
          finishEditing();
        }
      }}
      onTouchEnd={() => {
        clearHoldTimer();
      }}
      onTouchCancel={() => {
        clearHoldTimer();
      }}
      {...responder.panHandlers}
    >
      <Image source={template.image} style={styles.image} resizeMode="cover" />
      <View
        pointerEvents="none"
        style={[styles.colorOverlay, { backgroundColor: colorValue, opacity: overlayOpacity }]}
      />
      {showPrintArea ? (
        <View
          style={[
            styles.printArea,
            {
              left: area.left,
              top: area.top,
              width: area.width,
              height: area.height,
            },
          ]}
        />
      ) : null}
      {imageUri ? (
        <Image
          source={{ uri: imageUri }}
          resizeMode="contain"
          style={[styles.designImage, buildLayerStyle(imageTransform)]}
        />
      ) : (
        <View style={[styles.designPlaceholder, buildLayerStyle(imageTransform)]} />
      )}
      {textLayer.enabled && textLayer.text ? (
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
      {!editing && (
        <View pointerEvents="none" style={styles.hintBadge}>
          <Text style={styles.hintText}>꾹 눌러 편집</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  image: {
    ...StyleSheet.absoluteFillObject,
  },
  printArea: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: theme.colors.primary,
    borderStyle: 'dashed',
    borderRadius: 10,
  },
  designPlaceholder: {
    position: 'absolute',
    borderRadius: 10,
    backgroundColor: theme.colors.primarySoft,
  },
  designImage: {
    position: 'absolute',
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
  hintBadge: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
  },
  hintText: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
