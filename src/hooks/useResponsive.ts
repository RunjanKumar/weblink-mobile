import {useMemo} from 'react';
import {useWindowDimensions} from 'react-native';
import {getDeviceType, moderateScale, type DeviceType} from '../utils/responsive';

export interface Responsive {
  width: number;
  height: number;
  deviceType: DeviceType;
  isPhone: boolean;
  isTablet: boolean;
  isTV: boolean;
  isLandscape: boolean;
  /** Moderate-scale bound to the current window width. */
  ms: (size: number, factor?: number) => number;
  /** Pick a value by form factor, falling back phone -> tablet -> tv. */
  select: <T>(opts: {phone: T; tablet?: T; tv?: T}) => T;
}

/**
 * Re-computes on every rotation / dimension change (useWindowDimensions), so
 * layouts stay responsive across phone, tablet and TV without fixed widths.
 */
export function useResponsive(): Responsive {
  const {width, height} = useWindowDimensions();

  return useMemo<Responsive>(() => {
    const deviceType = getDeviceType({width, height});
    const isTV = deviceType === 'tv';
    const isTablet = deviceType === 'tablet';
    const isPhone = deviceType === 'phone';

    return {
      width,
      height,
      deviceType,
      isPhone,
      isTablet,
      isTV,
      isLandscape: width > height,
      ms: (size, factor = 0.5) => moderateScale(size, factor, width),
      select: <T>(opts: {phone: T; tablet?: T; tv?: T}): T => {
        if (isTV && opts.tv !== undefined) {
          return opts.tv;
        }
        if ((isTablet || isTV) && opts.tablet !== undefined) {
          return opts.tablet;
        }
        return opts.phone;
      },
    };
  }, [width, height]);
}
