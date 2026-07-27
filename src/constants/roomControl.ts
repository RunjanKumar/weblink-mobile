/** Quick-call redirect behaviors (matches web app's REDIRECT_TYPES). */
export const REDIRECT_TYPES = {
  CALL: 1,
  FOOD_MANAGEMENT: 2,
} as const;

/** Device exec actions expected by the backend/ESP32. */
export const DEVICE_ACTION = {
  ON: 'TurnOn',
  OFF: 'TurnOff',
} as const;

export type DeviceAction = (typeof DEVICE_ACTION)[keyof typeof DEVICE_ACTION];

/** Known device types. FAN devices additionally carry a speed level. */
export const DEVICE_TYPE = {
  FAN: 'FAN',
  LIGHT: 'LIGHT',
} as const;

// Fan speed slider/stepper bounds (percentage), matching the web range input.
export const FAN_LEVEL = {MIN: 0, MAX: 100, STEP: 10} as const;

// AC (local-only mock, mirrors the web acViewModel) bounds.
export const AC_TEMP = {MIN: 16, MAX: 30, STEP: 1} as const;
