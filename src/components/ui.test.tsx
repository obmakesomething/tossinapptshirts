import { render } from '@testing-library/react-native';
import React from 'react';

import { FullScreenLoader } from './ui';

describe('FullScreenLoader', () => {
  it('renders the provided message when visible', () => {
    const { getByText } = render(
      <FullScreenLoader visible message="업로드 중이에요..." />,
    );

    expect(getByText('업로드 중이에요...')).toBeTruthy();
  });

  it('renders nothing when hidden', () => {
    const { queryByText } = render(
      <FullScreenLoader visible={false} message="업로드 중이에요..." />,
    );

    expect(queryByText('업로드 중이에요...')).toBeNull();
  });
});
