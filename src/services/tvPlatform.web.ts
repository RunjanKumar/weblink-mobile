/**
 * TV platform services for the web builds (Samsung Tizen .wgt, LG webOS .ipk,
 * desktop browser).
 *
 * Mirrors `tvPlatform.ts` — same exports, same types; keep the two in sync.
 *
 * Samsung's device APIs are two globals the TV injects:
 *  - `tizen`   (Tizen web runtime): application list/launch, systeminfo, tvwindow
 *  - `webapis` (Samsung product API, loaded by the `$WEBAPIS/webapis/webapis.js`
 *              script that only the Tizen build's index.html includes): DUID
 * Each needs a privilege in `tizen/config.xml`. Neither exists on webOS or in a
 * desktop browser, so every call checks for its global and never throws — the
 * Settings screen shows what failed instead of the app crashing.
 */
import {config} from '../constants/config';
import {IS_TIZEN, IS_WEBOS} from '../utils/responsive';
import {logger} from './logger';

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
  return IS_WEBOS ? 'webos' : 'web';
}

/** Human-readable platform, with the OS version where the UA carries one. */
export function platformLabel(): string {
  switch (platform()) {
    case 'tizen': {
      const version = /Tizen\s*([\d.]+)/i.exec(navigator.userAgent)?.[1];
      return version ? `Samsung Tizen ${version}` : 'Samsung Tizen';
    }
    case 'webos':
      return 'LG webOS';
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

/** Samsung's per-TV unique ID (DUID). Null off Tizen or without the privilege. */
export function deviceId(): string | null {
  try {
    return readDuid();
  } catch (e) {
    logger.warn('tvPlatform', 'getDuid failed', describe(e));
    return null;
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
    probe(async () => readDuid()),
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
