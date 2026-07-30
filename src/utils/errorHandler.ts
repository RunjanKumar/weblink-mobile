import axios from 'axios';

interface BackendError {
  message?: string;
}

/**
 * Axios sets `error.message` to "Request failed with status code 400" for every
 * non-2xx response. That string used to be returned verbatim, which is how a
 * hotel guest ended up reading an HTTP status off a 55" screen. It is never a
 * message — it is a log line, and it is filtered on sight.
 */
const AXIOS_STATUS_MESSAGE = /^request failed with status code \d+$/i;

/**
 * Status → what the GUEST is told. Written in the same voice as the rest of the
 * TV UI ("We are at your service"): the hotel explains what happened and what to
 * do next, and never names a status code, an endpoint or a stack.
 *
 * Anything not listed falls through to the CALLER's fallback, which is always
 * more specific than a generic line here ("Could not move the curtain…").
 */
const STATUS_MESSAGE: Record<number, string> = {
  400: 'We could not process that request. Please check the details and try again.',
  401: 'Your session has ended. Please sign in again.',
  403: 'That is not available on your stay. Please contact the front desk.',
  404: 'We could not find that — it may no longer be available.',
  408: 'The request timed out. Please check your connection and try again.',
  409: 'That has just been taken. Please choose another option.',
  422: 'Some of those details were not accepted. Please review them and try again.',
  429: 'That was a few too many attempts. Please wait a moment and try again.',
};

const SERVER_MESSAGE = 'Our system is not responding just now. Please try again in a moment.';
const TIMEOUT_MESSAGE = 'The request timed out. Please check your connection and try again.';
const OFFLINE_MESSAGE = 'No internet connection. Please check your network and try again.';

/**
 * Extracts a user-friendly message from any thrown error.
 * Mirrors the web app's `getApiErrorMessage`, adapted for RN network conditions.
 */
export function getApiErrorMessage(
  error: unknown,
  fallback = 'Something went wrong. Please try again.',
): string {
  if (axios.isAxiosError(error)) {
    // The backend's own message wins — it is the only source that knows WHICH
    // detail was wrong ("This slot is already booked").
    const data = error.response?.data as BackendError | undefined;
    if (data?.message && !AXIOS_STATUS_MESSAGE.test(data.message)) {
      return data.message;
    }
    if (error.code === 'ECONNABORTED') {
      return TIMEOUT_MESSAGE;
    }
    if (isNetworkError(error)) {
      return OFFLINE_MESSAGE;
    }
    const status = error.response?.status;
    if (status) {
      if (STATUS_MESSAGE[status]) {
        return STATUS_MESSAGE[status];
      }
      if (status >= 500) {
        return SERVER_MESSAGE;
      }
    }
    // Deliberately NOT `error.message` — see AXIOS_STATUS_MESSAGE above.
    return fallback;
  }
  // Repositories and viewmodels throw plain Errors carrying deliberate guest
  // copy ("Failed to initiate payment. Please try again."), so those are kept —
  // minus anything that still looks like an axios log line.
  if (error instanceof Error && error.message && !AXIOS_STATUS_MESSAGE.test(error.message)) {
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
