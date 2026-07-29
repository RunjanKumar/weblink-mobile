/**
 * Centralized storage keys.
 *  - AUTH_TOKEN lives in the secure Keychain (never MMKV/AsyncStorage).
 *  - The rest are non-sensitive cache/preferences stored in MMKV.
 */
export const STORAGE_KEYS = {
  USER_PROFILE: 'cache.userProfile',
  THEME_SCHEME: 'settings.themeScheme',
  REMEMBERED_EMAIL: 'settings.rememberedEmail',
  FOOD_CART: 'cache.foodCart',
} as const;

// Keychain service identifier for the auth token.
export const KEYCHAIN_SERVICE = 'com.weblinkmobile.auth';
