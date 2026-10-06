import {
  API_BASE_URL,
  SOCKET_URL,
  API_TIMEOUT,
  APP_ENV,
  IMAGE_BASE_URL,
  DEV_LOGIN_EMAIL,
  DEV_LOGIN_PASSWORD,
} from '@env';

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
  // CDN prefixed onto the RELATIVE image paths the API returns (see
  // utils/imageUrl.ts). Mirrors the admin panel's CDN_BASE_URL — the CloudFront
  // distro in front of the nexgen-hotel S3 bucket.
  imageBaseUrl: withFallback(
    IMAGE_BASE_URL,
    'IMAGE_BASE_URL',
    'https://d36u10gu6pvj0x.cloudfront.net',
  ).replace(/\/+$/, ''),
  appEnv,
  isProduction: appEnv === 'production',
  // Test-login prefill for DEVELOPMENT builds only. The strings are inlined at
  // build time by react-native-dotenv, so production builds must use a .env
  // WITHOUT these keys (absence is safe: allowUndefined=true) — the runtime
  // gate below then guarantees they are never used even if present.
  devLogin:
    appEnv === 'development' && DEV_LOGIN_EMAIL
      ? {email: DEV_LOGIN_EMAIL, password: DEV_LOGIN_PASSWORD ?? ''}
      : null,
} as const;

export type AppConfig = typeof config;

/** Shown on the TV Settings page and reported to the backend by in-room TVs. */
export const APP_VERSION = '0.1.0';
