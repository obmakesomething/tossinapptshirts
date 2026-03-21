import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
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

  it('opens size/angle popup on long press of adjust button', () => {
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

    const trigger = view.getByTestId('image-adjust-trigger');
    expect(view.queryByTestId('image-adjust-popup')).toBeNull();
    fireEvent(trigger, 'longPress');
    expect(view.queryByTestId('image-adjust-popup')).not.toBeNull();
  });

  it('applies rotation nudge from popup', () => {
    const onImageTransformChange = jest.fn();
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
        onImageTransformChange={onImageTransformChange}
        onTextTransformChange={() => {}}
      />,
    );

    fireEvent(view.getByTestId('image-adjust-trigger'), 'longPress');
    fireEvent.press(view.getByTestId('rotate-nudge-right'));

    expect(onImageTransformChange).toHaveBeenCalledWith(
      expect.objectContaining({ rotation: 0.5 }),
    );
  });

  it('switches popup tab to scale controls', () => {
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

    fireEvent(view.getByTestId('image-adjust-trigger'), 'longPress');
    fireEvent.press(view.getByTestId('adjust-tab-scale'));

    expect(view.getByText('크기 조절')).toBeTruthy();
    expect(view.getByText('배율 1.00')).toBeTruthy();
  });
});
