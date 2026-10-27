import {Dimensions, PixelRatio, Platform} from 'react-native';

/**
 * True on LG webOS. `Platform.isTV` is always false under react-native-web, so
 * the web build sniffs the user agent instead — webOS reports "Web0S" (zero) on
 * modern firmware and "webOS" on older ones.
 */
function isWebOS(): boolean {
  if (Platform.OS !== 'web' || typeof navigator === 'undefined') {
    return false;
  }
  return /web0s|webos/i.test(navigator.userAgent);
}

/**
 * True on Samsung Tizen TVs. Their UA reads "(SMART-TV; LINUX; Tizen 9.0)".
 * Matches "Tizen" only — "SmartTV"-style tokens also appear in other brands' UAs.
 */
function isTizen(): boolean {
  if (Platform.OS !== 'web' || typeof navigator === 'undefined') {
    return false;
  }
  return /tizen/i.test(navigator.userAgent);
}

export const IS_WEBOS: boolean = isWebOS();
export const IS_TIZEN: boolean = isTizen();

/** True on Android TV / tvOS / LG webOS / Samsung Tizen. Cheap constant for TV-only branches. */
export const IS_TV: boolean = Platform.isTV === true || IS_WEBOS || IS_TIZEN;

/**
 * True in the web (.ipk / webOS, .wgt / Tizen) build, false in every Android .apk.
 *
 * Distinct from IS_TV on purpose: IS_TV is also true for an Android TV APK, so
 * it cannot express "the TV app follows a different flow than the phone app".
 * Use this only for the flow differences the client asked for on webOS; keep
 * using IS_TV for ten-foot sizing and focus behaviour.
 */
export const IS_WEB_BUILD: boolean = Platform.OS === 'web';

/**
 * Whether the TV shows its "coming soon" placeholders (Netflix, Google Cast,
 * Explore Hotel, Live TV). Not on LG: the webOS build ships through the LG
 * Content Store, whose QA fails any button that does nothing ("all UI buttons
 * work properly", self-check 1.4) — and LG TVs have no Google Cast at all.
 * Samsung and Android TV keep them for the client's presentation.
 */
export const SHOW_COMING_SOON: boolean = !IS_WEBOS;

export type DeviceType = 'phone' | 'tablet' | 'tv';

// Baseline device width the design tokens were authored against.
const GUIDELINE_BASE_WIDTH = 375;

// A "tablet" is anything whose shortest side is >= 600dp (Android's sw600dp rule).
const TABLET_MIN_SHORTEST_SIDE = 600;

export function getDeviceType(size?: {width: number; height: number}): DeviceType {
  if (IS_TV) {
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
