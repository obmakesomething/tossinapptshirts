import React from 'react';
import { Image, StyleSheet, View, type ViewStyle } from 'react-native';
import { theme } from './ui';
import type { MockupTemplate } from '../data/mockupTemplates';

type MockupCanvasProps = {
  template: MockupTemplate;
  width?: number;
  height?: number;
  showPrintArea?: boolean;
  showDesign?: boolean;
  designScale?: number;
  style?: ViewStyle;
};

export function MockupCanvas({
  template,
  width = 220,
  height = 280,
  showPrintArea = false,
  showDesign = false,
  designScale = 0.7,
  style,
}: MockupCanvasProps) {
  const area = {
    left: width * template.printArea.x,
    top: height * template.printArea.y,
    width: width * template.printArea.width,
    height: height * template.printArea.height,
  };

  const designWidth = area.width * designScale;
  const designHeight = area.height * designScale;
  const designLeft = area.left + (area.width - designWidth) / 2;
  const designTop = area.top + (area.height - designHeight) / 2;

  return (
    <View style={[styles.container, { width, height }, style]}>
      <Image source={template.image} style={styles.image} resizeMode="cover" />
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
      {showDesign && (
        <View
          style={[
            styles.design,
            {
              left: designLeft,
              top: designTop,
              width: designWidth,
              height: designHeight,
            },
          ]}
        />
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
  design: {
    position: 'absolute',
    borderRadius: 10,
    backgroundColor: theme.colors.primarySoft,
  },
});
