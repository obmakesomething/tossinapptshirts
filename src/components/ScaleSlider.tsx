import React, { useRef, useState } from 'react';
import { PanResponder, StyleSheet, View } from 'react-native';
import { theme } from './ui';

type ScaleSliderProps = {
  min: number;
  max: number;
  value: number;
  onChange: (value: number) => void;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

export function ScaleSlider({ min, max, value, onChange }: ScaleSliderProps) {
  const [trackWidth, setTrackWidth] = useState(1);
  const startValue = useRef(value);

  // Store latest values in refs for PanResponder closure
  const valueRef = useRef(value);
  const onChangeRef = useRef(onChange);
  const trackWidthRef = useRef(trackWidth);
  const minRef = useRef(min);
  const maxRef = useRef(max);

  valueRef.current = value;
  onChangeRef.current = onChange;
  trackWidthRef.current = trackWidth;
  minRef.current = min;
  maxRef.current = max;

  const normalized = clamp((value - min) / (max - min), 0, 1);
  const knobLeft = normalized * trackWidth;

  const applyFromLocationX = (locationX: number) => {
    const width = Math.max(trackWidthRef.current, 1);
    const ratio = clamp(locationX / width, 0, 1);
    const currentMin = minRef.current;
    const currentMax = maxRef.current;
    onChangeRef.current(currentMin + ratio * (currentMax - currentMin));
  };

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        startValue.current = valueRef.current;
        applyFromLocationX(evt.nativeEvent.locationX);
      },
      onPanResponderMove: (evt, gestureState) => {
        if (trackWidthRef.current > 1) {
          applyFromLocationX(evt.nativeEvent.locationX);
          return;
        }
        const currentTrackWidth = trackWidthRef.current;
        const currentMin = minRef.current;
        const currentMax = maxRef.current;
        const delta = gestureState.dx / currentTrackWidth;
        const next = clamp(
          startValue.current + delta * (currentMax - currentMin),
          currentMin,
          currentMax,
        );
        onChangeRef.current(next);
      },
    }),
  );

  return (
    <View
      style={styles.slider}
      onLayout={(event) => setTrackWidth(event.nativeEvent.layout.width)}
      {...responder.current.panHandlers}
    >
      <View style={styles.track} />
      <View style={[styles.trackActive, { width: knobLeft }]} />
      <View style={[styles.knob, { left: knobLeft - 8 }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  slider: {
    width: '100%',
    height: 28,
    justifyContent: 'center',
  },
  track: {
    height: 6,
    borderRadius: 999,
    backgroundColor: theme.colors.border,
  },
  trackActive: {
    position: 'absolute',
    height: 6,
    borderRadius: 999,
    backgroundColor: theme.colors.primary,
  },
  knob: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: theme.colors.surface,
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
});
