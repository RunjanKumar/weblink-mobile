import {KEYCHAIN_SERVICE} from '../constants/storageKeys';
import {logger} from './logger';

/**
 * Web build of the auth-token store (LG webOS / browser).
 *
 * There is no Keychain on the web. A hotel TV is a SHARED device — the next
 * guest must never inherit a session — so the durable copy lives in
 * `sessionStorage`, which dies with the app instance, rather than
 * `localStorage`. `AuthContext.signOut()` and the 401 interceptor clear it too.
 *
 * This is deliberately weaker than the native Keychain: anything running in the
 * same webOS web context can read it. Acceptable for a single-purpose in-room
 * app; do not reuse this shim for a multi-tenant browser deployment.
 *
 * Mirrors `secureStorage.service.ts` exactly — keep the two in sync.
 */
const KEY = `${KEYCHAIN_SERVICE}:token`;

let inMemoryToken: string | null = null;

function store(): Storage | null {
  try {
    return typeof sessionStorage === 'undefined' ? null : sessionStorage;
  } catch {
    return null;
  }
}

export const tokenStorage = {
  /** Synchronous read for the axios interceptor. */
  getSync(): string | null {
    return inMemoryToken;
  },

  async set(token: string): Promise<void> {
    inMemoryToken = token;
    try {
      store()?.setItem(KEY, token);
    } catch (error) {
      logger.error('secureStorage', 'Failed to persist auth token', error);
    }
  },

  /** Restore the session after an app reload (call once on app start). */
  async load(): Promise<string | null> {
    try {
      inMemoryToken = store()?.getItem(KEY) ?? null;
    } catch (error) {
      logger.error('secureStorage', 'Failed to load auth token', error);
      inMemoryToken = null;
    }
    return inMemoryToken;
  },

  async clear(): Promise<void> {
    inMemoryToken = null;
    try {
      store()?.removeItem(KEY);
    } catch (error) {
      logger.error('secureStorage', 'Failed to clear auth token', error);
    }
  },
};
