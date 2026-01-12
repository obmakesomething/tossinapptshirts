import React, { useRef } from 'react';
import { Image, PanResponder, StyleSheet, Text, View } from 'react-native';
import type { MockupTemplate } from '../data/mockupTemplates';
import type { LayerTransform, TextLayer } from '../context/catalog';
import { theme } from './ui';

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
const MAX_SCALE = 1.0; // Design should not exceed print area
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

  const activeTransform = activeLayer === 'text' ? textTransform : imageTransform;
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

  activeTransformRef.current = activeTransform;
  updateTransformRef.current = updateTransform;
  areaRef.current = area;

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
        const angle = a && b ? Math.atan2(b.pageY - a.pageY, b.pageX - a.pageX) : 0;
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
          const rotationDelta = (angle - startRef.current.angle) * (180 / Math.PI);
          const nextScale = clamp(
            startRef.current.scale * scaleDelta,
            MIN_SCALE,
            MAX_SCALE
          );
          updateFn({
            offsetX: startRef.current.offsetX,
            offsetY: startRef.current.offsetY,
            scale: nextScale,
            rotation: startRef.current.rotation + rotationDelta,
          });
        } else {
          const nextOffsetX = clamp(
            startRef.current.offsetX + gestureState.dx / currentArea.width,
            -MAX_OFFSET,
            MAX_OFFSET
          );
          const nextOffsetY = clamp(
            startRef.current.offsetY + gestureState.dy / currentArea.height,
            -MAX_OFFSET,
            MAX_OFFSET
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
        onInteractionEnd?.();
      },
      onPanResponderTerminate: () => {
        onInteractionEnd?.();
      },
    })
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
      {...responderRef.current.panHandlers}
    >
      <Image
        source={template.image}
        style={styles.image}
        resizeMode="cover"
        onError={(e) => console.error('[DesignStage] Image load error:', e.nativeEvent.error, 'Source:', template.image)}
        onLoad={() => console.log('[DesignStage] Image loaded successfully:', template.image)}
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
});
