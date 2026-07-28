import React, {useEffect, useRef} from 'react';
import {
  Animated,
  Easing,
  Platform,
  type DimensionValue,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import {useTheme} from '../../theme';

export interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}

const MIN_OPACITY = 0.4;
const MAX_OPACITY = 0.9;
const HALF_CYCLE_MS = 800;

/**
 * Pulsing placeholder used while content loads.
 *
 * Uses React Native's own `Animated` rather than `react-native-reanimated`.
 * Reanimated does not initialise correctly in the webpack/webOS bundle — its
 * `makeMutable` export is still unassigned by the time `useSharedValue` runs,
 * so the first <Skeleton/> to render throws "makeMutable is not a function"
 * and takes the whole screen down. `Animated` is implemented directly by
 * react-native-web, needs no worklets or babel plugin, and this component was
 * reanimated's only consumer in the app.
 */
export function Skeleton({width = '100%', height = 16, radius = 8, style}: SkeletonProps) {
  const {theme} = useTheme();
  const opacity = useRef(new Animated.Value(MIN_OPACITY)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: MAX_OPACITY,
          duration: HALF_CYCLE_MS,
          easing: Easing.inOut(Easing.quad),
          // Web has no native animated module; asking for it only warns.
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(opacity, {
          toValue: MIN_OPACITY,
          duration: HALF_CYCLE_MS,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius: radius,
          backgroundColor: theme.colors.surfaceElevated,
          opacity,
        },
        style,
      ]}
    />
  );
}
