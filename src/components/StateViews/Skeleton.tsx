import React, {useEffect} from 'react';
import type {DimensionValue, StyleProp, ViewStyle} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import {useTheme} from '../../theme';

export interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}

/** Pulsing placeholder used while content loads. */
export function Skeleton({width = '100%', height = 16, radius = 8, style}: SkeletonProps) {
  const {theme} = useTheme();
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    opacity.value = withRepeat(withTiming(0.9, {duration: 800}), -1, true);
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({opacity: opacity.value}));

  return (
    <Animated.View
      style={[
        {width, height, borderRadius: radius, backgroundColor: theme.colors.surfaceElevated},
        animatedStyle,
        style,
      ]}
    />
  );
}
