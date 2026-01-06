import React from 'react';
import { Image, StyleSheet, View, Text, type ViewStyle } from 'react-native';
import { theme } from './ui';
import type { MockupTemplate } from '../data/mockupTemplates';
import type { LayerTransform, TextLayer } from '../context/catalog';
import { resolveColorValue } from '../data/colorMap';

type MockupCanvasProps = {
  template: MockupTemplate;
  width?: number;
  height?: number;
  showPrintArea?: boolean;
  showDesign?: boolean;
  designScale?: number;
  designImageUri?: string | null;
  imageTransform?: LayerTransform;
  textLayer?: TextLayer;
  textTransform?: LayerTransform;
  style?: ViewStyle;
};

export function MockupCanvas({
  template,
  width = 220,
  height = 280,
  showPrintArea = false,
  showDesign = false,
  designScale = 0.7,
  designImageUri,
  imageTransform,
  textLayer,
  textTransform,
  style,
}: MockupCanvasProps) {
  const area = {
    left: width * template.printArea.x,
    top: height * template.printArea.y,
    width: width * template.printArea.width,
    height: height * template.printArea.height,
  };

  const scale = imageTransform?.scale ?? designScale;
  const offsetX = imageTransform?.offsetX ?? 0;
  const offsetY = imageTransform?.offsetY ?? 0;
  const rotation = imageTransform?.rotation ?? 0;
  const designWidth = area.width * scale;
  const designHeight = area.height * scale;
  const designLeft = area.left + area.width / 2 + offsetX * area.width - designWidth / 2;
  const designTop = area.top + area.height / 2 + offsetY * area.height - designHeight / 2;

  const textScale = textTransform?.scale ?? scale;
  const textOffsetX = textTransform?.offsetX ?? offsetX;
  const textOffsetY = textTransform?.offsetY ?? offsetY;
  const textRotation = textTransform?.rotation ?? rotation;
  const textWidth = area.width * textScale;
  const textHeight = area.height * textScale;
  const textLeft = area.left + area.width / 2 + textOffsetX * area.width - textWidth / 2;
  const textTop = area.top + area.height / 2 + textOffsetY * area.height - textHeight / 2;
  const colorValue = resolveColorValue(template.color);
  const lightness =
    (parseInt(colorValue.slice(1, 3), 16) * 0.299 +
      parseInt(colorValue.slice(3, 5), 16) * 0.587 +
      parseInt(colorValue.slice(5, 7), 16) * 0.114) /
    255;
  const overlayOpacity = lightness < 0.5 ? 0.28 : 0.1;

  return (
    <View style={[styles.container, { width, height }, style]}>
      <Image source={template.image} style={styles.image} resizeMode="cover" />
      <View
        pointerEvents="none"
        style={[styles.colorOverlay, { backgroundColor: colorValue, opacity: overlayOpacity }]}
      />
      {showPrintArea && (
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
      )}
      {showDesign &&
        (designImageUri ? (
          <Image
            source={{ uri: designImageUri }}
            style={[
              styles.designImage,
              {
                left: designLeft,
                top: designTop,
                width: designWidth,
                height: designHeight,
                transform: [{ rotate: `${rotation}deg` }],
              },
            ]}
            resizeMode="contain"
          />
        ) : (
          <View
            style={[
              styles.designPlaceholder,
              {
                left: designLeft,
                top: designTop,
                width: designWidth,
                height: designHeight,
              },
            ]}
          />
        ))}
      {showDesign && textLayer?.enabled && textLayer.text ? (
        <View
          style={[
            styles.textWrapper,
            {
              left: textLeft,
              top: textTop,
              width: textWidth,
              height: textHeight,
              transform: [{ rotate: `${textRotation}deg` }],
            },
          ]}
        >
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
  },
  image: {
    ...StyleSheet.absoluteFillObject,
  },
  colorOverlay: {
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
