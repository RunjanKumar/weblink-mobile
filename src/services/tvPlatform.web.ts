/**
 * TV platform services for the web builds (Samsung Tizen .wgt, LG webOS .ipk,
 * Android TV wrapper APK, desktop browser).
 *
 * Mirrors `tvPlatform.ts` — same exports, same types; keep the two in sync.
 *
 * Samsung's device APIs are two globals the TV injects:
 *  - `tizen`   (Tizen web runtime): application list/launch, systeminfo, tvwindow
 *  - `webapis` (Samsung product API, loaded by the `$WEBAPIS/webapis/webapis.js`
 *              script that only the Tizen build's index.html includes): DUID
 * Each needs a privilege in `tizen/config.xml`.
 *
 * The Android TV wrapper injects one global, `NexgenTV` (androidtv/ TvBridge.kt):
 * ANDROID_ID, the TV's make/model, root Back and Hotel mode.
 *
 * None of these exists everywhere, so every call checks for its global and never
 * throws — the Settings screen shows what failed instead of the app crashing.
 */
import {config} from '../constants/config';
import {IS_ANDROID_TV_APP, IS_TIZEN, IS_WEBOS} from '../utils/responsive';
import {logger} from './logger';

export type TvPlatformName = 'tizen' | 'webos' | 'androidtv' | 'web' | 'native';

/**
 * What the Home button opens (androidtv/ HotelMode.kt):
 *  - self:    this app — Hotel mode is fully set up
 *  - chooser: Android asks which Home to use — "Set as Home app" works
 *  - default: another launcher is the default; clear its defaults first
 *  - locked:  the TV's own launcher always wins (Google TV) — power-on only
 */
export type HomeChoice = 'self' | 'chooser' | 'default' | 'locked';

/** Android TV Hotel mode, as the wrapper sees it. */
export interface HotelModeStatus {
  /** The app is set up as the TV's home screen + starts on power-on. */
  on: boolean;
  /** The TV's default Home app is this app (staff picked it in the chooser). */
  defaultHome: boolean;
  home: HomeChoice;
  /** The launcher Home opens instead of this app, for "default" / "locked". */
  homeLabel?: string;
  /** "Display over other apps" — lets the boot receiver open the app on Android 10+. */
  canDrawOverlays: boolean;
}

const HOME_CHOICES: HomeChoice[] = ['self', 'chooser', 'default', 'locked'];

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

interface TizenError {
  name?: string;
  message?: string;
}

interface TizenVideoSource {
  type: string;
  number: number;
}

interface TizenApi {
  application: {
    getAppsInfo(ok: (apps: TvAppInfo[]) => void, err?: (e: TizenError) => void): void;
    launch(id: string, ok?: () => void, err?: (e: TizenError) => void): void;
  };
  systeminfo: {
    getPropertyValue(
      property: 'VIDEOSOURCE',
      ok: (value: {connected: TizenVideoSource[]; disconnected: TizenVideoSource[]}) => void,
      err?: (e: TizenError) => void,
    ): void;
  };
  tvwindow: {
    setSource(
      source: TizenVideoSource,
      ok: () => void,
      err?: (e: TizenError) => void,
      type?: 'MAIN',
    ): void;
    show(ok: () => void, err?: (e: TizenError) => void, rect?: string[], type?: 'MAIN'): void;
  };
}

interface WebApis {
  productinfo?: {getDuid(): string};
}

/** `window.NexgenTV` — androidtv/app/src/main/java/.../TvBridge.kt. */
interface NexgenTvBridge {
  deviceId(): string;
  deviceModel(): string;
  rootBack(): void;
  setHotelMode(on: boolean): void;
  /** JSON-encoded HotelModeStatus. */
  hotelModeStatus(): string;
  openHomeChooser(): void;
  /** False when the TV has no "Display over other apps" settings screen. */
  openOverlaySettings(): boolean;
}

const androidTv = (): NexgenTvBridge | undefined =>
  (window as unknown as {NexgenTV?: NexgenTvBridge}).NexgenTV;

const tizenApi = (): TizenApi | undefined => (window as unknown as {tizen?: TizenApi}).tizen;

const webApis = (): WebApis | undefined => (window as unknown as {webapis?: WebApis}).webapis;

const describe = (e: unknown): string => {
  const err = e as TizenError | undefined;
  return err?.message || err?.name || String(e);
};

/**
 * Wraps a Tizen success/error callback pair. Some firmware never calls either
 * callback for an unsupported API, so a timeout settles it.
 */
function callTizen<T>(
  run: (ok: (value: T) => void, err: (e: TizenError) => void) => void,
  timeoutMs = 5000,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('No response from TV')), timeoutMs);
    const ok = (value: T) => {
      clearTimeout(timer);
      resolve(value);
    };
    const err = (e: TizenError) => {
      clearTimeout(timer);
      reject(new Error(describe(e)));
    };
    try {
      run(ok, err);
    } catch (e) {
      err(e as TizenError);
    }
  });
}

async function probe<T>(run: () => Promise<T>): Promise<Probe<T>> {
  try {
    return {ok: true, value: await run()};
  } catch (e) {
    return {ok: false, error: describe(e)};
  }
}

export function platform(): TvPlatformName {
  if (IS_TIZEN) {
    return 'tizen';
  }
  if (IS_ANDROID_TV_APP) {
    return 'androidtv';
  }
  return IS_WEBOS ? 'webos' : 'web';
}

/** "TCL 43P635" — the TV's make and model, or '' if the bridge is missing. */
function androidTvModel(): string {
  try {
    return androidTv()?.deviceModel().trim() ?? '';
  } catch (e) {
    logger.warn('tvPlatform', 'deviceModel failed', describe(e));
    return '';
  }
}

/**
 * Human-readable platform, with the OS version where the UA carries one. Sent as
 * the TV's `model` when it pairs, so staff can tell TVs apart in the admin panel —
 * and the admin panel offers the Hotel mode switch only to labels that start with
 * "Android TV".
 */
export function platformLabel(): string {
  switch (platform()) {
    case 'tizen': {
      const version = /Tizen\s*([\d.]+)/i.exec(navigator.userAgent)?.[1];
      return version ? `Samsung Tizen ${version}` : 'Samsung Tizen';
    }
    case 'webos':
      return 'LG webOS';
    case 'androidtv': {
      const version = /Android ([\d.]+)/.exec(navigator.userAgent)?.[1];
      const model = androidTvModel();
      const label = version ? `Android TV ${version}` : 'Android TV';
      return model ? `${label} · ${model}` : label;
    }
    default:
      return 'Web browser';
  }
}

/** The DUID, or an error saying which link in the chain is missing. */
function readDuid(): string {
  const apis = webApis();
  if (!apis) {
    throw new Error('webapis.js not loaded');
  }
  if (!apis.productinfo) {
    throw new Error('productinfo API missing');
  }
  const duid = apis.productinfo.getDuid();
  if (!duid) {
    throw new Error('TV returned an empty DUID');
  }
  return duid;
}

/** ANDROID_ID from the wrapper, or an error saying what is missing. */
function readAndroidId(): string {
  const bridge = androidTv();
  if (!bridge) {
    throw new Error('NexgenTV bridge missing');
  }
  const id = bridge.deviceId();
  if (!id) {
    throw new Error('TV returned an empty ANDROID_ID');
  }
  return id;
}

/**
 * A stable per-TV ID: Samsung's DUID, or Android TV's ANDROID_ID. The backend
 * keeps it as the device's `duid` and drops the old record when the same TV
 * pairs again. Null on LG / in a browser, or if the TV would not say.
 */
export function deviceId(): string | null {
  // LG has its own ID API (not wired yet); probing Samsung's here only logs noise.
  if (!IS_TIZEN && !IS_ANDROID_TV_APP) {
    return null;
  }
  try {
    return IS_TIZEN ? readDuid() : readAndroidId();
  } catch (e) {
    logger.warn('tvPlatform', 'deviceId failed', describe(e));
    return null;
  }
}

/**
 * Back at the root screen (Android TV). The wrapper finishes the app — the TV
 * goes Home — unless Hotel mode is on, where it does nothing. No-op elsewhere.
 */
export function rootBack(): void {
  try {
    androidTv()?.rootBack();
  } catch (e) {
    logger.warn('tvPlatform', 'rootBack failed', describe(e));
  }
}

/** Turns Android TV Hotel mode on/off (Home alias + start on boot). No-op elsewhere. */
export function setHotelMode(on: boolean): void {
  try {
    androidTv()?.setHotelMode(on);
  } catch (e) {
    logger.warn('tvPlatform', 'setHotelMode failed', describe(e));
  }
}

/** Hotel mode as the wrapper sees it; null off Android TV or if it could not say. */
export function hotelModeStatus(): HotelModeStatus | null {
  const bridge = androidTv();
  if (!bridge) {
    return null;
  }
  try {
    const raw = JSON.parse(bridge.hotelModeStatus()) as Partial<HotelModeStatus>;
    const defaultHome = raw.defaultHome === true;
    return {
      on: raw.on === true,
      defaultHome,
      // An APK older than this field: fall back to the chooser path it had.
      home: HOME_CHOICES.includes(raw.home as HomeChoice)
        ? (raw.home as HomeChoice)
        : defaultHome
          ? 'self'
          : 'chooser',
      homeLabel: raw.homeLabel || undefined,
      canDrawOverlays: raw.canDrawOverlays === true,
    };
  } catch (e) {
    logger.warn('tvPlatform', 'hotelModeStatus failed', describe(e));
    return null;
  }
}

/** Opens Android's "choose a Home app" picker. No-op elsewhere. */
export function openHomeChooser(): void {
  try {
    androidTv()?.openHomeChooser();
  } catch (e) {
    logger.warn('tvPlatform', 'openHomeChooser failed', describe(e));
  }
}

/**
 * Opens "Display over other apps" for this app. False when the TV has no such
 * screen (common on TVs) — staff then grant it over adb instead.
 */
export function openOverlaySettings(): boolean {
  try {
    return androidTv()?.openOverlaySettings() ?? false;
  } catch (e) {
    logger.warn('tvPlatform', 'openOverlaySettings failed', describe(e));
    return false;
  }
}

/** Installed apps — the source of real app IDs (Netflix, YouTube, ...). */
function installedApps(): Promise<TvAppInfo[]> {
  const tizen = tizenApi();
  if (!tizen) {
    return Promise.reject(new Error('Not a Samsung TV'));
  }
  return callTizen<TvAppInfo[]>((ok, err) => tizen.application.getAppsInfo(ok, err)).then(apps =>
    apps.map(a => ({id: a.id, name: a.name})),
  );
}

function videoSources(): Promise<{
  connected: TizenVideoSource[];
  disconnected: TizenVideoSource[];
}> {
  const tizen = tizenApi();
  if (!tizen) {
    return Promise.reject(new Error('Not a Samsung TV'));
  }
  return callTizen((ok, err) => tizen.systeminfo.getPropertyValue('VIDEOSOURCE', ok, err));
}

/** Opens another TV app by its Tizen app ID. Resolves false if it could not. */
export async function launchApp(appId: string): Promise<boolean> {
  const tizen = tizenApi();
  if (!tizen) {
    return false;
  }
  try {
    await callTizen<void>((ok, err) => tizen.application.launch(appId, () => ok(), err));
    return true;
  } catch (e) {
    logger.warn('tvPlatform', `launch ${appId} failed`, describe(e));
    return false;
  }
}

/** Shows HDMI input `port` full screen (Live TV via the room's set-top box). */
export async function showHdmi(port: number): Promise<boolean> {
  const tizen = tizenApi();
  if (!tizen) {
    return false;
  }
  try {
    const {connected, disconnected} = await videoSources();
    const source = [...connected, ...disconnected].find(
      s => s.type === 'HDMI' && s.number === port,
    );
    if (!source) {
      throw new Error(`HDMI ${port} not found`);
    }
    await callTizen<void>((ok, err) => tizen.tvwindow.setSource(source, () => ok(), err, 'MAIN'));
    await callTizen<void>((ok, err) =>
      tizen.tvwindow.show(() => ok(), err, ['0px', '0px', '1920px', '1080px'], 'MAIN'),
    );
    return true;
  } catch (e) {
    logger.warn('tvPlatform', `showHdmi ${port} failed`, describe(e));
    return false;
  }
}

/**
 * True if `url` answers at all. `no-cors` gives an opaque response, so any HTTP
 * status counts — this tests the network path (and, on Tizen, the config.xml
 * <access> list), not the endpoint.
 */
async function reachable(url: string, timeoutMs = 8000): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    await fetch(url, {mode: 'no-cors', cache: 'no-store', signal: controller.signal});
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

/** Everything the Phase 0 feasibility tests need, read off the running TV. */
export async function getDiagnostics(): Promise<TvDiagnostics> {
  const [duid, apps, sources, apiReachable, socketReachable] = await Promise.all([
    probe(async () => (IS_ANDROID_TV_APP ? readAndroidId() : readDuid())),
    probe(installedApps),
    probe(videoSources),
    reachable(`${config.apiBaseUrl}/`),
    reachable(`${config.socketUrl}/socket.io/?EIO=4&transport=polling`),
  ]);

  const result: TvDiagnostics = {
    platformLabel: platformLabel(),
    userAgent: navigator.userAgent,
    screen: `${window.screen.width}x${window.screen.height} (viewport ${window.innerWidth}x${window.innerHeight})`,
    deviceId: duid,
    apps,
    videoSources: sources.ok
      ? {
          ok: true,
          value: [
            ...sources.value.connected.map(s => `${s.type} ${s.number} (connected)`),
            ...sources.value.disconnected.map(s => `${s.type} ${s.number}`),
          ],
        }
      : sources,
    apiReachable,
    socketReachable,
  };
  // Full dump for the remote inspector — the screen only has room for a summary.
  logger.info('tvPlatform', 'diagnostics', result);
  return result;
}
