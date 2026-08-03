import axios from 'axios';

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
 * Anything longer than this is a stack trace, an HTML error page or a dump —
 * not a sentence written for a guest — so it is rejected in favour of our own
 * copy rather than printed across a 55" screen.
 */
const MAX_BACKEND_MESSAGE = 200;

/**
 * The backend does NOT use one error envelope. Both of these are real, captured
 * from POST /api/rooms/device/exec on the same deployment:
 *
 *   {"msg":"Device is Offline"}
 *   {"statusCode":400,"status":false,"message":"action is required",...}
 *
 * The device/hardware errors — offline, not responding, channel not found — are
 * the `msg` shape, which is precisely the set a guest most needs to read. Only
 * `message` used to be checked, so every one of them fell through to the generic
 * 400 line ("We could not process that request…") and the real reason was lost.
 *
 * Ordered most- to least- authoritative; the first usable string wins.
 */
function readable(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const text = value.trim();
  if (!text || text.length > MAX_BACKEND_MESSAGE) {
    return null;
  }
  // An HTML error page from a proxy, not a message from the API.
  if (text.startsWith('<')) {
    return null;
  }
  return AXIOS_STATUS_MESSAGE.test(text) ? null : text;
}

function pickBackendMessage(data: unknown): string | null {
  if (typeof data === 'string') {
    return readable(data);
  }
  if (!data || typeof data !== 'object') {
    return null;
  }
  const body = data as Record<string, unknown>;

  const direct = readable(body.message) ?? readable(body.msg) ?? readable(body.error);
  if (direct) {
    return direct;
  }

  // `error` / `errors[0]` as an object — e.g. {error: {msg: "…"}} or a
  // validation array. Nested one level only: deeper than that is a dump.
  const candidates: unknown[] = [
    body.error,
    Array.isArray(body.errors) ? body.errors[0] : undefined,
  ];
  for (const candidate of candidates) {
    if (candidate && typeof candidate === 'object') {
      const nested = candidate as Record<string, unknown>;
      const found = readable(nested.message) ?? readable(nested.msg);
      if (found) {
        return found;
      }
    } else {
      const found = readable(candidate);
      if (found) {
        return found;
      }
    }
  }
  return null;
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
    // The backend's own message wins — it is the only source that knows WHICH
    // detail was wrong ("Device is Offline", "This slot is already booked").
    const backend = pickBackendMessage(error.response?.data);
    if (backend) {
      return backend;
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
