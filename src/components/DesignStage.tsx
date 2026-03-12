import React, { useCallback, useMemo, useRef } from 'react';
import { Image, PanResponder, StyleSheet, Text, View } from 'react-native';
import type { LayerTransform, TextLayer } from '../context/catalog';
import type { MockupTemplate } from '../data/mockupTemplates';
import { theme } from './ui';

type DesignStageProps = {
  template: MockupTemplate;
  width?: number;
  height?: number;
  showPrintArea?: boolean;
  showGuides?: boolean;
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

const MIN_SCALE = 0.2;
const MAX_SCALE = 1.5; // Updated for Issue #5
const MAX_OFFSET = 0.55;
const HIT_SLOP = 12;

export function DesignStage({
  template,
  width = 220,
  height = 275,
  showPrintArea: _showPrintArea = true,
  showGuides = true,
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
}: DesignStageProps) {
  const area = {
    left: width * template.printArea.x,
    top: height * template.printArea.y,
    width: width * template.printArea.width,
    height: height * template.printArea.height,
  };

  const effectiveShowGuides = _showPrintArea && showGuides;

  const activeTransform =
    activeLayer === 'text' ? textTransform : imageTransform;
  const updateTransform =
    activeLayer === 'text' ? onTextTransformChange : onImageTransformChange;

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

  const cameraScaleRef = useRef(cameraScaleProp);

  activeTransformRef.current = activeTransform;
  updateTransformRef.current = updateTransform;
  areaRef.current = area;
  cameraScaleRef.current = cameraScaleProp;

  const isWithinPrintArea = (x: number, y: number) => {
    const currentArea = areaRef.current;
    return (
      x >= currentArea.left - HIT_SLOP &&
      x <= currentArea.left + currentArea.width + HIT_SLOP &&
      y >= currentArea.top - HIT_SLOP &&
      y <= currentArea.top + currentArea.height + HIT_SLOP
    );
  };

  const responderRef = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        return isWithinPrintArea(locationX, locationY);
      },
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
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
      },
      onPanResponderMove: (evt, gestureState) => {
        const touches = evt.nativeEvent.touches ?? [];
        const currentArea = areaRef.current;
        const updateFn = updateTransformRef.current;

        if (touches.length >= 2 && touches[0] && touches[1]) {
          const [a, b] = touches;
          const distance = Math.hypot(b.pageX - a.pageX, b.pageY - a.pageY);
          const angle = Math.atan2(b.pageY - a.pageY, b.pageX - a.pageX);
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
        } else {
          const cs = cameraScaleRef.current;
          const nextOffsetX = clamp(
            startRef.current.offsetX +
              gestureState.dx / (currentArea.width * cs),
            -MAX_OFFSET,
            MAX_OFFSET,
          );
          const nextOffsetY = clamp(
            startRef.current.offsetY +
              gestureState.dy / (currentArea.height * cs),
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
        onInteractionEnd?.();
      },
      onPanResponderTerminate: () => {
        onInteractionEnd?.();
      },
    }),
  );

  const buildLayerStyle = useCallback(
    (transform: LayerTransform) => {
      const widthPx = area.width * transform.scale;
      const heightPx = area.height * transform.scale;
      const left =
        area.left +
        area.width / 2 +
        transform.offsetX * area.width -
        widthPx / 2;
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
        transform: [{ rotate: `${transform.rotation}deg` }],
      };
    },
    [area.height, area.left, area.top, area.width],
  );

  const buildTextStyle = useCallback(
    (transform: LayerTransform) => {
      const widthPx = area.width;
      const heightPx = area.height;
      const left =
        area.left +
        area.width / 2 +
        transform.offsetX * area.width -
        widthPx / 2;
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
    },
    [area.height, area.left, area.top, area.width],
  );

  // Out-of-bounds detection (simplified, ignoring rotation)
  const { isOutOfBounds } = useMemo(() => {
    const checkBounds = (transform: LayerTransform, isText: boolean) => {
      if (isText && !textLayer.enabled) return { out: false, overflow: 0 };
      if (!isText && !imageUri) return { out: false, overflow: 0 };
      const s = isText ? buildTextStyle(transform) : buildLayerStyle(transform);
      const w = 'width' in s ? (s.width as number) : 0;
      const h = 'height' in s ? (s.height as number) : 0;
      const l = s.left as number;
      const t = s.top as number;

      // Calculate overflow amounts
      const leftOverflow = Math.max(0, area.left - l);
      const topOverflow = Math.max(0, area.top - t);
      const rightOverflow = Math.max(0, l + w - (area.left + area.width));
      const bottomOverflow = Math.max(0, t + h - (area.top + area.height));

      const maxOverflow = Math.max(
        leftOverflow,
        topOverflow,
        rightOverflow,
        bottomOverflow,
      );
      const refDimension = Math.max(area.width, area.height);
      const overflowPct =
        refDimension > 0 ? Math.round((maxOverflow / refDimension) * 100) : 0;

      const out = maxOverflow > 2; // 2px tolerance
      return { out, overflow: overflowPct };
    };
    const imgResult = checkBounds(imageTransform, false);
    const txtResult = checkBounds(textTransform, true);
    const out = imgResult.out || txtResult.out;
    const maxOverflow = Math.max(imgResult.overflow, txtResult.overflow);
    onOutOfBounds?.(out, maxOverflow);
    return { isOutOfBounds: out, overflowPercent: maxOverflow };
  }, [
    area.height,
    area.left,
    area.top,
    area.width,
    buildLayerStyle,
    buildTextStyle,
    imageTransform,
    imageUri,
    onOutOfBounds,
    textLayer.enabled,
    textTransform,
  ]);

  const GUIDE_SIZE = 12;
  const GUIDE_WIDTH = 2;
  const overlayColor = 'rgba(0,0,0,0.15)';
  const borderColor = isOutOfBounds ? theme.colors.error : theme.colors.primary;

  return (
    <View
      style={[styles.container, { width, height }]}
      {...responderRef.current.panHandlers}
    >
      <Image
        source={template.image}
        style={styles.image}
        resizeMode="cover"
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
      {_showPrintArea && (
        <>
          <View
            style={[
              styles.overlayMask,
              {
                top: 0,
                left: 0,
                right: 0,
                height: area.top,
                backgroundColor: overlayColor,
              },
            ]}
          />
          <View
            style={[
              styles.overlayMask,
              {
                top: area.top + area.height,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: overlayColor,
              },
            ]}
          />
          <View
            style={[
              styles.overlayMask,
              {
                top: area.top,
                left: 0,
                width: area.left,
                height: area.height,
                backgroundColor: overlayColor,
              },
            ]}
          />
          <View
            style={[
              styles.overlayMask,
              {
                top: area.top,
                left: area.left + area.width,
                right: 0,
                height: area.height,
                backgroundColor: overlayColor,
              },
            ]}
          />
        </>
      )}

      {/* Print area border */}
      {effectiveShowGuides && (
        <View
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
        >
          {/* 프린트 영역 label */}
          <Text style={[styles.printAreaLabel, { color: borderColor }]}>
            프린트 영역
          </Text>
        </View>
      )}

      {/* Corner L-guides */}
      {effectiveShowGuides && (
        <>
          {/* Top-left */}
          <View
            style={[
              styles.cornerGuide,
              {
                top: area.top - 1,
                left: area.left - 1,
                borderTopWidth: GUIDE_WIDTH,
                borderLeftWidth: GUIDE_WIDTH,
                borderColor,
                width: GUIDE_SIZE,
                height: GUIDE_SIZE,
              },
            ]}
          />
          {/* Top-right */}
          <View
            style={[
              styles.cornerGuide,
              {
                top: area.top - 1,
                left: area.left + area.width - GUIDE_SIZE + 1,
                borderTopWidth: GUIDE_WIDTH,
                borderRightWidth: GUIDE_WIDTH,
                borderColor,
                width: GUIDE_SIZE,
                height: GUIDE_SIZE,
              },
            ]}
          />
          {/* Bottom-left */}
          <View
            style={[
              styles.cornerGuide,
              {
                top: area.top + area.height - GUIDE_SIZE + 1,
                left: area.left - 1,
                borderBottomWidth: GUIDE_WIDTH,
                borderLeftWidth: GUIDE_WIDTH,
                borderColor,
                width: GUIDE_SIZE,
                height: GUIDE_SIZE,
              },
            ]}
          />
          {/* Bottom-right */}
          <View
            style={[
              styles.cornerGuide,
              {
                top: area.top + area.height - GUIDE_SIZE + 1,
                left: area.left + area.width - GUIDE_SIZE + 1,
                borderBottomWidth: GUIDE_WIDTH,
                borderRightWidth: GUIDE_WIDTH,
                borderColor,
                width: GUIDE_SIZE,
                height: GUIDE_SIZE,
              },
            ]}
          />
        </>
      )}
      {imageUri ? (
        <Image
          source={{ uri: imageUri }}
          resizeMode="contain"
          style={[styles.designImage, buildLayerStyle(imageTransform)]}
        />
      ) : null}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    ...StyleSheet.absoluteFillObject,
  },
  overlayMask: {
    position: 'absolute',
  },
  printArea: {
    position: 'absolute',
    borderWidth: 1.5,
    borderColor: theme.colors.primary,
    borderStyle: 'dashed',
    borderRadius: 6,
    alignItems: 'center',
  },
  printAreaLabel: {
    position: 'absolute',
    top: -18,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  cornerGuide: {
    position: 'absolute',
    borderColor: theme.colors.primary,
  },
  designImage: {
    position: 'absolute',
    backgroundColor: 'transparent',
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
