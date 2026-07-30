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

/* ── Curtains ───────────────────────────────────────────────────────────────
   The room-devices API has no curtain type: a motorised curtain arrives as TWO
   ordinary switch channels named "<which> curtain open" and "<which> curtain
   close", exactly like a light. So NAME is the only discriminator, and these
   rules have to be shared — the dashboard groups the four channels into two
   curtains, and `useRoomControl` uses the same test to keep them OUT of the
   lights list (otherwise Light Control shows four half-curtain switches a guest
   can drive into a stall).

   Matching is loose on purpose: installers name channels by hand, so "Main
   Curtain Open", "MAIN_CURTAIN_OPEN" and "Sheer curtain opening" all land. */
export const CURTAIN_RE = /curtain|blind|drape/i;
/** Sheer/net/voile — the light inner panel. Anything else curtain-ish is main. */
export const CURTAIN_SHEER_RE = /\bsheer\b|\bnet\b|\bvoile\b|\binner\b/i;
export const CURTAIN_OPEN_RE = /\bopen(ing|ed)?\b/i;
export const CURTAIN_CLOSE_RE = /\bclos(e|ed|ing)\b|\bshut\b/i;

/** True for any of the four curtain motor channels. */
export function isCurtainChannel(name?: string): boolean {
  const value = name ?? '';
  return CURTAIN_RE.test(value) && (CURTAIN_OPEN_RE.test(value) || CURTAIN_CLOSE_RE.test(value));
}

/** Which curtain a channel belongs to. */
export type CurtainKind = 'main' | 'sheer';
export function curtainKind(name?: string): CurtainKind {
  return CURTAIN_SHEER_RE.test(name ?? '') ? 'sheer' : 'main';
}

/** Which way a channel drives. `close` is checked first: "close" contains no
 *  "open", but a channel named "open/close" should not silently read as open. */
export function curtainDirection(name?: string): 'open' | 'close' | null {
  const value = name ?? '';
  if (CURTAIN_CLOSE_RE.test(value)) return 'close';
  if (CURTAIN_OPEN_RE.test(value)) return 'open';
  return null;
}

/** What a curtain is doing. `stopped` = parked mid-travel, both lines dead. */
export type CurtainState = 'open' | 'closed' | 'stopped';
