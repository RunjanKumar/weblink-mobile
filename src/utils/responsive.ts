import {Dimensions, PixelRatio, Platform} from 'react-native';

/** True on Android TV / tvOS. Cheap constant for TV-only sizing branches. */
export const IS_TV: boolean = Platform.isTV === true;

export type DeviceType = 'phone' | 'tablet' | 'tv';

// Baseline device width the design tokens were authored against.
const GUIDELINE_BASE_WIDTH = 375;

// A "tablet" is anything whose shortest side is >= 600dp (Android's sw600dp rule).
const TABLET_MIN_SHORTEST_SIDE = 600;

export function getDeviceType(size?: {width: number; height: number}): DeviceType {
  if (Platform.isTV) {
    return 'tv';
  }
  const {width, height} = size ?? Dimensions.get('window');
  const shortestSide = Math.min(width, height);
  return shortestSide >= TABLET_MIN_SHORTEST_SIDE ? 'tablet' : 'phone';
}

/** Linear scale relative to the guideline width. */
export function scale(size: number, deviceWidth?: number): number {
  const width = deviceWidth ?? Dimensions.get('window').width;
  return PixelRatio.roundToNearestPixel((width / GUIDELINE_BASE_WIDTH) * size);
}

/**
 * Moderate scale — dampened so large screens (tablet/TV) don't blow up type/spacing.
 * `factor` of 0 => no scaling, 1 => full linear scaling.
 */
export function moderateScale(size: number, factor = 0.5, deviceWidth?: number): number {
  return Math.round(size + (scale(size, deviceWidth) - size) * factor);
}
