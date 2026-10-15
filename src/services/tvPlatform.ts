/**
 * TV platform services — native (Android / Android TV) build.
 *
 * Mirrors `tvPlatform.web.ts` — same exports, same types; keep the two in sync.
 * The Samsung / LG device APIs only exist in the web builds, so here every
 * capability reports itself unavailable.
 */
import {Dimensions, Platform} from 'react-native';

export type TvPlatformName = 'tizen' | 'webos' | 'web' | 'native';

export type Probe<T> = {ok: true; value: T} | {ok: false; error: string};

export interface TvAppInfo {
  id: string;
  name: string;
}

export interface TvDiagnostics {
  platformLabel: string;
  userAgent: string;
  /** Physical screen and the CSS viewport the app lays out in. */
  screen: string;
  deviceId: Probe<string>;
  apps: Probe<TvAppInfo[]>;
  /** e.g. "HDMI 1 (connected)". */
  videoSources: Probe<string[]>;
  apiReachable: boolean;
  socketReachable: boolean;
}

const UNAVAILABLE = {ok: false, error: 'Not a Samsung TV'} as const;

export function platform(): TvPlatformName {
  return 'native';
}

export function platformLabel(): string {
  // Sent as the TV's model when it pairs, so staff can tell it apart in the admin panel.
  return Platform.isTV ? 'Android TV' : `React Native (${Platform.OS})`;
}

export function deviceId(): string | null {
  return null;
}

export async function launchApp(_appId: string): Promise<boolean> {
  return false;
}

export async function showHdmi(_port: number): Promise<boolean> {
  return false;
}

export async function getDiagnostics(): Promise<TvDiagnostics> {
  const {width, height} = Dimensions.get('screen');
  return {
    platformLabel: platformLabel(),
    userAgent: '—',
    screen: `${Math.round(width)}x${Math.round(height)}`,
    deviceId: UNAVAILABLE,
    apps: UNAVAILABLE,
    videoSources: UNAVAILABLE,
    // The native app reaches the API through axios already; nothing to probe.
    apiReachable: true,
    socketReachable: true,
  };
}
