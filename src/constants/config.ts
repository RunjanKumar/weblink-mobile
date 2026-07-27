import {API_BASE_URL, SOCKET_URL, API_TIMEOUT, APP_ENV} from '@env';

/**
 * Runtime configuration derived from build-time env vars (react-native-dotenv).
 * Fallbacks keep the app runnable even if `.env` is missing, but a warning is
 * logged in dev so misconfiguration is obvious.
 */
function withFallback(value: string | undefined, name: string, fallback: string): string {
  if (!value) {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.warn(`[config] Missing env "${name}" — falling back to "${fallback}".`);
    }
    return fallback;
  }
  return value;
}

const appEnv = (APP_ENV as 'development' | 'staging' | 'production') || 'development';

export const config = {
  apiBaseUrl: withFallback(
    API_BASE_URL,
    'API_BASE_URL',
    'https://dev-hotel-api.wattinventive.com',
  ).replace(/\/+$/, ''),
  socketUrl: withFallback(
    SOCKET_URL,
    'SOCKET_URL',
    'https://chat-hotel-automation.wattinventive.com',
  ),
  apiTimeout: Number(API_TIMEOUT) > 0 ? Number(API_TIMEOUT) : 20000,
  appEnv,
  isProduction: appEnv === 'production',
} as const;

export type AppConfig = typeof config;
