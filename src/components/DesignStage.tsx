import React, { useMemo, useRef } from 'react';
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

  const startRef = useRef({
    offsetX: 0,
    offsetY: 0,
    scale: 1,
    rotation: 0,
    distance: 0,
    angle: 0,
  });

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
          onInteractionStart?.();
          const { touches } = evt.nativeEvent;
          const a = touches[0];
          const b = touches[1];
          const distance = b
            ? Math.hypot(b.pageX - a.pageX, b.pageY - a.pageY)
            : 0;
          const angle = b ? Math.atan2(b.pageY - a.pageY, b.pageX - a.pageX) : 0;
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
          const { touches } = evt.nativeEvent;
          if (touches.length >= 2) {
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
          onInteractionEnd?.();
        },
        onPanResponderTerminate: () => {
          onInteractionEnd?.();
        },
      }),
    [activeTransform, area.height, area.width, isWithinPrintArea, onInteractionEnd, onInteractionStart, updateTransform]
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

  return (
    <View style={[styles.container, { width, height }]} {...responder.panHandlers}>
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
        <View style={[styles.textWrapper, buildLayerStyle(textTransform)]}>
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
});
