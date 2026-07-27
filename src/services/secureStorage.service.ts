import * as Keychain from 'react-native-keychain';
import {KEYCHAIN_SERVICE} from '../constants/storageKeys';
import {logger} from './logger';

/**
 * Secure auth-token storage.
 *
 * Design: the token is mirrored in an in-memory variable so the axios request
 * interceptor can read it SYNCHRONOUSLY on every request (Keychain reads are
 * async and too slow for a per-request hook). The Keychain copy is the durable
 * source of truth used to restore the session on app restart via `load()`.
 */
let inMemoryToken: string | null = null;

export const tokenStorage = {
  /** Synchronous read for the axios interceptor. */
  getSync(): string | null {
    return inMemoryToken;
  },

  /** Persist the token securely and update the in-memory mirror. */
  async set(token: string): Promise<void> {
    inMemoryToken = token;
    try {
      await Keychain.setGenericPassword('auth', token, {
        service: KEYCHAIN_SERVICE,
        accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      });
    } catch (error) {
      logger.error('secureStorage', 'Failed to persist auth token', error);
    }
  },

  /** Load the token from the Keychain into memory (call once on app start). */
  async load(): Promise<string | null> {
    try {
      const creds = await Keychain.getGenericPassword({service: KEYCHAIN_SERVICE});
      inMemoryToken = creds ? creds.password : null;
    } catch (error) {
      logger.error('secureStorage', 'Failed to load auth token', error);
      inMemoryToken = null;
    }
    return inMemoryToken;
  },

  /** Wipe the token everywhere (logout / 401). */
  async clear(): Promise<void> {
    inMemoryToken = null;
    try {
      await Keychain.resetGenericPassword({service: KEYCHAIN_SERVICE});
    } catch (error) {
      logger.error('secureStorage', 'Failed to clear auth token', error);
    }
  },
};
