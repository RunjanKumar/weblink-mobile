/**
 * Web build of the cache store (LG webOS / browser).
 *
 * MMKV is a native module with no web build, so the same synchronous API is
 * served by `localStorage`, which webOS persists across app launches. Keys are
 * namespaced to match MMKV's `{id: 'weblink-app'}` instance so a browser tab
 * shared with another app cannot collide.
 *
 * Mirrors `storage.service.ts` exactly — keep the two in sync.
 */
const PREFIX = 'weblink-app:';

/** webOS is a browser, but guard anyway so SSR/tests never throw. */
function store(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    // Private-browsing modes throw on access rather than returning null.
    return null;
  }
}

function read(key: string): string | null {
  try {
    return store()?.getItem(PREFIX + key) ?? null;
  } catch {
    return null;
  }
}

function write(key: string, value: string): void {
  try {
    store()?.setItem(PREFIX + key, value);
  } catch {
    // Quota exceeded — cache writes are best-effort by design.
  }
}

export const storage = {
  setString(key: string, value: string): void {
    write(key, value);
  },
  getString(key: string): string | undefined {
    return read(key) ?? undefined;
  },
  setBool(key: string, value: boolean): void {
    write(key, value ? '1' : '0');
  },
  getBool(key: string): boolean | undefined {
    const raw = read(key);
    return raw == null ? undefined : raw === '1';
  },
  setObject<T>(key: string, value: T): void {
    write(key, JSON.stringify(value));
  },
  getObject<T>(key: string): T | null {
    const raw = read(key);
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  },
  remove(key: string): void {
    try {
      store()?.removeItem(PREFIX + key);
    } catch {
      // ignore
    }
  },
  clearAll(): void {
    const s = store();
    if (!s) {
      return;
    }
    try {
      // Only our namespace — never wipe keys another app on the TV owns.
      Object.keys(s)
        .filter(k => k.startsWith(PREFIX))
        .forEach(k => s.removeItem(k));
    } catch {
      // ignore
    }
  },
};
