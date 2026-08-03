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

/* ── Hidden channels ────────────────────────────────────────────────────────
   The room controller exposes internal timer channels alongside the real ones —
   "DND 6m5s", "MMR 6m5s" — which are the housekeeping signs' hold timers, not
   anything a guest may press. They carry no scene flag, so without this they
   land in the lights grid as two mystery switches. Filtered once at the source
   in `useRoomControl`, so nothing downstream has to remember. */
export const HIDDEN_CHANNEL_RE = /6m5s/i;

export function isHiddenChannel(name?: string): boolean {
  return HIDDEN_CHANNEL_RE.test(name ?? '');
}

/* ── Curtains ───────────────────────────────────────────────────────────────
   The room-devices API has no curtain type: a motorised curtain arrives as TWO
   ordinary switch channels — this room's are literally named `main open`,
   `main close`, `sheer open`, `sheer close`. So NAME is the only discriminator,
   and these rules have to be shared — the dashboard groups the four channels
   into two curtains, and `useRoomControl` uses the same test to keep them OUT
   of the lights list (otherwise Light Control shows four half-curtain switches
   a guest can drive into a stall).

   The side word alone qualifies a channel. An earlier version demanded the word
   "curtain" as well, which is why `main open` was treated as a light: the four
   motor lines showed in Light Control and the curtain card silently fell back
   to local-only state. Keep `curtain|blind|drape` accepted too, for installs
   that do spell it out ("Main Curtain Open", "Sheer curtain opening"). */
export const CURTAIN_RE = /curtain|blind|drape/i;
/** Sheer/net/voile — the light inner panel. Anything else curtain-ish is main. */
export const CURTAIN_SHEER_RE = /\bsheer\b|\bnet\b|\bvoile\b|\binner\b/i;
/** The outer/primary curtain. `\b` so "domain" or "remainder" cannot match. */
export const CURTAIN_MAIN_RE = /\bmain\b/i;
export const CURTAIN_OPEN_RE = /\bopen(ing|ed)?\b/i;
export const CURTAIN_CLOSE_RE = /\bclos(e|ed|ing)\b|\bshut\b/i;

/** True for any of the four curtain motor channels. */
export function isCurtainChannel(name?: string): boolean {
  const value = name ?? '';
  // A curtain line must say WHICH WAY it drives...
  if (!CURTAIN_OPEN_RE.test(value) && !CURTAIN_CLOSE_RE.test(value)) {
    return false;
  }
  // ...and WHICH curtain it belongs to. Both halves are required, so an
  // ordinary light called "Open plan" or "Main light" is not swallowed.
  return (
    CURTAIN_RE.test(value) || CURTAIN_MAIN_RE.test(value) || CURTAIN_SHEER_RE.test(value)
  );
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
