/**
 * Centralized storage keys.
 *  - AUTH_TOKEN lives in the secure Keychain (never MMKV/AsyncStorage).
 *  - The rest are non-sensitive cache/preferences stored in MMKV.
 */
export const STORAGE_KEYS = {
  /**
   * Last known session (user + hotel + booking, NEVER the token). Written on
   * every successful login and profile refresh, and read on app start when the
   * profile call cannot be reached — that is what keeps a signed-in guest
   * signed in through a flat network instead of dumping them on Login.
   */
  SESSION: 'cache.session',
  THEME_SCHEME: 'settings.themeScheme',
  REMEMBERED_EMAIL: 'settings.rememberedEmail',
  FOOD_CART: 'cache.foodCart',
} as const;

// Keychain service identifier for the auth token.
export const KEYCHAIN_SERVICE = 'com.weblinkmobile.auth';
