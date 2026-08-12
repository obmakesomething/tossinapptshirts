import React, { useState } from 'react';
import { Image, StyleSheet, Text, View, type ViewStyle, type ImageSourcePropType } from 'react-native';
import type { LayerTransform, TextLayer } from '../context/catalog';
import type { MockupTemplate } from '../data/mockupTemplates';
import { getGarmentStageBackground } from '../utils/garmentContrast';
import { getHemTrimInsetRatio } from '../utils/hemTrim';
import { useTemplatePrintArea } from '../utils/garmentLayout';
import { theme } from './ui';

type MockupCanvasProps = {
  template: MockupTemplate;
  width?: number;
  height?: number;
  showPrintArea?: boolean;
  showGuides?: boolean;
  showDesign?: boolean;
  designScale?: number;
  designImageUri?: string | ImageSourcePropType | null;
  imageTransform?: LayerTransform;
  textLayer?: TextLayer;
  textTransform?: LayerTransform;
  sizeLabel?: string;
  style?: ViewStyle;
};

export function MockupCanvas({
  template,
  width = 220,
  height = 275,
  showPrintArea = false,
  showGuides = false,
  showDesign = false,
  designScale = 0.7,
  designImageUri,
  imageTransform,
  textLayer,
  textTransform,
  sizeLabel,
  style,
}: MockupCanvasProps) {
  const effectiveShowGuides = showGuides || showPrintArea;
  const hemTrimRatio = getHemTrimInsetRatio(sizeLabel);
  // Measured against the drawn garment, not the box — see garmentLayout.
  const { printArea: area } = useTemplatePrintArea({
    template,
    width,
    height,
    hemTrimRatio,
  });

  const scale = imageTransform?.scale ?? designScale;
  const offsetX = imageTransform?.offsetX ?? 0;
  const offsetY = imageTransform?.offsetY ?? 0;
  const rotation = imageTransform?.rotation ?? 0;
  const designWidth = area.width * scale;
  const designHeight = area.height * scale;
  const designLeft =
    area.left + area.width / 2 + offsetX * area.width - designWidth / 2;
  const designTop =
    area.top + area.height / 2 + offsetY * area.height - designHeight / 2;

  const textScale = textTransform?.scale ?? scale;
  const textOffsetX = textTransform?.offsetX ?? offsetX;
  const textOffsetY = textTransform?.offsetY ?? offsetY;
  const textRotation = textTransform?.rotation ?? rotation;
  const textWidth = area.width;
  const textHeight = area.height;
  const textLeft =
    area.left + area.width / 2 + textOffsetX * area.width - textWidth / 2;
  const textTop =
    area.top + area.height / 2 + textOffsetY * area.height - textHeight / 2;

  const hasDesign = Boolean(
    designImageUri || (textLayer?.enabled && textLayer.text?.trim()),
  );

  const [imageLoaded, setImageLoaded] = useState(false);
  const stageBackgroundColor = getGarmentStageBackground(
    template.color,
    theme.colors.surface,
  );
  const mockupImageStyle = [styles.image, { bottom: height * hemTrimRatio }];

  return (
    <View
      style={[
        styles.container,
        { width, height, backgroundColor: stageBackgroundColor },
        style,
      ]}
    >
      <Image
        source={template.image}
        style={mockupImageStyle}
        resizeMode="contain"
        onError={(e) =>
          console.error(
            '[MockupCanvas] Image load error:',
            e.nativeEvent.error,
            'Source:',
            template.image,
          )
        }
        onLoad={() => {
          setImageLoaded(true);
          console.log(
            '[MockupCanvas] Image loaded successfully:',
            template.image,
          );
        }}
      />
      {/* Skeleton overlay while loading */}
      {!imageLoaded && (
        <View style={styles.skeleton} />
      )}
      {effectiveShowGuides && hasDesign && (
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
      {showDesign && designImageUri ? (
          <Image
            source={typeof designImageUri === 'string' ? { uri: designImageUri } : designImageUri}
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
      ) : null}
      {showDesign && textLayer?.enabled && textLayer.text ? (
        <View
          style={[
            styles.textWrapper,
            {
              left: textLeft,
              top: textTop,
              width: textWidth,
              height: textHeight,
              transform: [
                { scale: textScale },
                { rotate: `${textRotation}deg` },
              ],
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
    borderRadius: 16,
    overflow: 'hidden',
    // react-native-web paints an Image's bitmap on a z-index:-1 layer, which
    // slips behind this card's own background unless the card is its own
    // stacking context. Without it the garment silently stops rendering on web.
    zIndex: 0,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: '#191F28',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 3 },
    elevation: 6,
  },
  image: {
    ...StyleSheet.absoluteFillObject,
    shadowColor: '#191F28',
    shadowOpacity: 0.14,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
  },
  printArea: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: theme.colors.primary,
    borderStyle: 'dashed',
    borderRadius: 10,
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
  skeleton: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.colors.border,
  },
});
