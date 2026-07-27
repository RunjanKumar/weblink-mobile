import axios from 'axios';

interface BackendError {
  message?: string;
}

/**
 * Extracts a user-friendly message from any thrown error.
 * Mirrors the web app's `getApiErrorMessage`, adapted for RN network conditions.
 */
export function getApiErrorMessage(
  error: unknown,
  fallback = 'Something went wrong. Please try again.',
): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as BackendError | undefined;
    if (data?.message) {
      return data.message;
    }
    if (error.code === 'ECONNABORTED') {
      return 'The request timed out. Please check your connection and try again.';
    }
    if (isNetworkError(error)) {
      return 'No internet connection. Please check your network and try again.';
    }
    if (error.message) {
      return error.message;
    }
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}

/** True when the request never reached the server (offline / DNS / timeout). */
export function isNetworkError(error: unknown): boolean {
  if (!axios.isAxiosError(error)) {
    return false;
  }
  return error.code === 'ERR_NETWORK' || error.message === 'Network Error' || !error.response;
}
