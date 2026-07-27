import {MMKV} from 'react-native-mmkv';

/**
 * Fast synchronous key-value store for NON-sensitive data (cache, preferences).
 * The auth token is NEVER stored here — see `secureStorage.service.ts`.
 */
const mmkv = new MMKV({id: 'weblink-app'});

export const storage = {
  setString(key: string, value: string): void {
    mmkv.set(key, value);
  },
  getString(key: string): string | undefined {
    return mmkv.getString(key);
  },
  setBool(key: string, value: boolean): void {
    mmkv.set(key, value);
  },
  getBool(key: string): boolean | undefined {
    return mmkv.getBoolean(key);
  },
  setObject<T>(key: string, value: T): void {
    mmkv.set(key, JSON.stringify(value));
  },
  getObject<T>(key: string): T | null {
    const raw = mmkv.getString(key);
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
    mmkv.delete(key);
  },
  clearAll(): void {
    mmkv.clearAll();
  },
};
