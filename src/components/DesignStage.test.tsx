import React from 'react';
import { render } from '@testing-library/react-native';
import { DesignStage } from './DesignStage';
import type { MockupTemplate } from '../data/mockupTemplates';

const baseTemplate: MockupTemplate = {
  id: 'mock-template',
  productId: 'mock-product',
  productName: 'Mock Product',
  color: 'black',
  placement: 'front',
  image: { uri: 'mock://template.png' },
  printArea: {
    x: 0.3,
    y: 0.2,
    width: 0.4,
    height: 0.5,
  },
};

const baseTransform = {
  offsetX: 0,
  offsetY: 0,
  scale: 1,
  rotation: 0,
};

const baseTextLayer = {
  enabled: false,
  text: '',
  fontSize: 32,
  fontWeight: 'regular' as const,
  color: '#000000',
};

describe('DesignStage', () => {
  it('does not render dim overlay masks when guides are disabled', () => {
    const view = render(
      <DesignStage
        template={baseTemplate}
        width={240}
        height={320}
        showPrintArea
        showGuides={false}
        imageUri="mock://photo.png"
        imageTransform={baseTransform}
        textLayer={baseTextLayer}
        textTransform={baseTransform}
        activeLayer="image"
        onImageTransformChange={() => {}}
        onTextTransformChange={() => {}}
      />,
    );

    expect(JSON.stringify(view.toJSON())).not.toContain('rgba(0,0,0,0.15)');
  });
});
