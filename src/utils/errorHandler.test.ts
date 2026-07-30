// Imported explicitly rather than relying on jest's globals: the repo has no
// @types/jest and does not list "jest" in tsconfig `types`, so bare `describe`
// would fail `npm run typecheck`. @jest/globals ships with jest itself.
import {describe, expect, it} from '@jest/globals';
import {AxiosError, AxiosHeaders} from 'axios';
import {getApiErrorMessage} from './errorHandler';

/**
 * Regression cover for the one failure that reaches a GUEST: axios sets
 * `error.message` to "Request failed with status code 400" on every non-2xx, and
 * an earlier version of getApiErrorMessage returned it verbatim — so a hotel TV
 * showed an HTTP status where a sentence belonged.
 */
function axiosErrorWith(status: number, data?: unknown): AxiosError {
  const config = {headers: new AxiosHeaders()};
  const error = new AxiosError(
    `Request failed with status code ${status}`,
    String(status),
    config as never,
    null,
    {status, data, statusText: '', headers: {}, config} as never,
  );
  return error;
}

const FALLBACK = 'Could not move the curtain. Please try again.';

describe('getApiErrorMessage', () => {
  it('never leaks the axios status string for a 400', () => {
    const message = getApiErrorMessage(axiosErrorWith(400), FALLBACK);
    expect(message).not.toMatch(/status code/i);
    expect(message).toBe('We could not process that request. Please check the details and try again.');
  });

  it('prefers the backend message when there is one', () => {
    const message = getApiErrorMessage(
      axiosErrorWith(400, {message: 'This slot is already booked.'}),
      FALLBACK,
    );
    expect(message).toBe('This slot is already booked.');
  });

  it('ignores a backend message that is itself an axios log line', () => {
    const message = getApiErrorMessage(
      axiosErrorWith(400, {message: 'Request failed with status code 400'}),
      FALLBACK,
    );
    expect(message).not.toMatch(/status code/i);
  });

  it('uses the caller fallback for an unmapped status', () => {
    expect(getApiErrorMessage(axiosErrorWith(418), FALLBACK)).toBe(FALLBACK);
  });

  it('collapses every 5xx to one server message', () => {
    expect(getApiErrorMessage(axiosErrorWith(503), FALLBACK)).toBe(
      'Our system is not responding just now. Please try again in a moment.',
    );
  });

  it('keeps deliberate guest copy thrown as a plain Error', () => {
    expect(getApiErrorMessage(new Error('Could not start the payment. Please try again.'))).toBe(
      'Could not start the payment. Please try again.',
    );
  });

  it('drops an axios log line thrown as a plain Error', () => {
    expect(getApiErrorMessage(new Error('Request failed with status code 500'), FALLBACK)).toBe(
      FALLBACK,
    );
  });
});
