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

/**
 * The backend ships TWO error envelopes on the same deployment. Every body below
 * is real, captured from the dev API — do not "tidy" them into one shape, because
 * the point of these cases is that the shapes genuinely differ.
 *
 * The `msg` form carries the device/hardware failures, which is the set a guest
 * most needs to read. It used to be ignored entirely, so "Device is Offline"
 * reached the screen as "We could not process that request…".
 */
describe('getApiErrorMessage — real backend envelopes', () => {
  it('reads the `msg` envelope the device errors use', () => {
    // POST /api/rooms/device/exec against an offline controller → 400
    expect(getApiErrorMessage(axiosErrorWith(400, {msg: 'Device is Offline'}), FALLBACK)).toBe(
      'Device is Offline',
    );
  });

  it('reads `msg` for an unknown channel', () => {
    expect(
      getApiErrorMessage(axiosErrorWith(400, {msg: 'device channel not found'}), FALLBACK),
    ).toBe('device channel not found');
  });

  it('still reads the `message` envelope the validation errors use', () => {
    expect(
      getApiErrorMessage(
        axiosErrorWith(400, {
          statusCode: 400,
          status: false,
          message: 'action is required',
          type: 'BAD_REQUEST',
        }),
        FALLBACK,
      ),
    ).toBe('action is required');
  });

  it('reads the 401 envelope', () => {
    expect(
      getApiErrorMessage(
        axiosErrorWith(401, {
          statusCode: 401,
          message: 'Unauthorized access!',
          status: false,
          type: 'UNAUTHORIZED',
        }),
        FALLBACK,
      ),
    ).toBe('Unauthorized access!');
  });

  it('prefers `message` over `msg` when a body somehow carries both', () => {
    expect(
      getApiErrorMessage(axiosErrorWith(400, {message: 'Primary', msg: 'Secondary'}), FALLBACK),
    ).toBe('Primary');
  });

  it('reads a nested error object and a validation array', () => {
    expect(getApiErrorMessage(axiosErrorWith(400, {error: {msg: 'Nested reason'}}), FALLBACK)).toBe(
      'Nested reason',
    );
    expect(
      getApiErrorMessage(axiosErrorWith(422, {errors: [{message: 'Email is invalid'}]}), FALLBACK),
    ).toBe('Email is invalid');
  });

  it('refuses an HTML error page from a proxy', () => {
    const html = '<!doctype html><html><body>502 Bad Gateway</body></html>';
    expect(getApiErrorMessage(axiosErrorWith(502, html), FALLBACK)).toBe(
      'Our system is not responding just now. Please try again in a moment.',
    );
  });

  it('refuses a dump too long to be a sentence', () => {
    const dump = {msg: `Error: ${'at Object.<anonymous> (/srv/app/index.js:1:1) '.repeat(20)}`};
    expect(getApiErrorMessage(axiosErrorWith(400, dump), FALLBACK)).toBe(
      'We could not process that request. Please check the details and try again.',
    );
  });

  it('ignores an empty or whitespace-only backend message', () => {
    expect(getApiErrorMessage(axiosErrorWith(418, {msg: '   '}), FALLBACK)).toBe(FALLBACK);
  });
});
