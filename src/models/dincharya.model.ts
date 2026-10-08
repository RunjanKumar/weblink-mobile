/**
 * Guest Dincharya ("My Day", the daily wellness rhythm) — mirrors
 * GET /v1/dincharya/guest. The backend resolves the stay from the token and
 * serves only the days the hotel's wellness team PUBLISHED.
 */

/** Row kinds, straight from the backend assembler (DINCHARYA_ROW_TYPE). */
export const DINCHARYA_ROW_TYPE = {
  COMMON: 'COMMON',
  MEAL: 'MEAL',
  THERAPY: 'THERAPY',
  HYDRATION: 'HYDRATION',
} as const;

export type DincharyaRowType = (typeof DINCHARYA_ROW_TYPE)[keyof typeof DINCHARYA_ROW_TYPE];

export interface DincharyaRow {
  /** Minutes from midnight, hotel time. */
  minute: number;
  endMinute?: number | null;
  /** Start time already formatted in the HOTEL's timezone — shown verbatim. */
  timeLabel: string;
  /** A DincharyaRowType; an unknown one renders as a ritual. */
  type: string;
  label: string;
  text?: string | null;
  /** Where to go — assembled into one line by the server. */
  locationLabel?: string | null;
}

export interface DincharyaDay {
  /** Calendar date, 'YYYY-MM-DD'. */
  date: string;
  dietDayNumber?: number | null;
  dietMenuNumber?: number | null;
  rows: DincharyaRow[];
}

export interface GuestDincharya {
  /** null when nothing is published for this stay (or there is no stay). */
  day: DincharyaDay | null;
  /** Every published date of the stay, ascending — the only days to page through. */
  publishedDates: string[];
  guestName?: string;
}

/* ── Date / time helpers ────────────────────────────────────────────────── */

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * 'YYYY-MM-DD' → a local Date at midnight. Never `new Date(key)`, which parses
 * the key as UTC and lands on the previous day west of Greenwich.
 */
function toLocalDate(key?: string): Date | null {
  const [y, m, d] = String(key ?? '')
    .split('-')
    .map(Number);
  return y && m && d ? new Date(y, m - 1, d) : null;
}

/** 'Mon' */
export function weekdayOf(key?: string): string {
  const d = toLocalDate(key);
  return d ? (WEEKDAYS[d.getDay()] ?? '') : '';
}

/** '14' */
export function dayNumOf(key?: string): string {
  const d = toLocalDate(key);
  return d ? String(d.getDate()) : '';
}

/** 'Jul' */
export function monthOf(key?: string): string {
  const d = toLocalDate(key);
  return d ? (MONTHS[d.getMonth()] ?? '') : '';
}

/** 'Mon, 14 Jul 2026' */
export function longDateOf(key?: string): string {
  const d = toLocalDate(key);
  return d
    ? `${WEEKDAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`
    : '';
}

/**
 * 870 → '2:30 PM'. Only ever applied to `endMinute`: the START label comes
 * pre-rendered in the hotel's timezone, and minutes-from-midnight carry no
 * timezone of their own, so formatting one here is safe.
 */
function minuteLabel(minute: number): string {
  const m = ((minute % 1440) + 1440) % 1440;
  const h24 = Math.floor(m / 60);
  const mm = String(m % 60).padStart(2, '0');
  return `${h24 % 12 || 12}:${mm} ${h24 >= 12 ? 'PM' : 'AM'}`;
}

/** '7:00 AM' or '7:00 AM – 8:30 AM' for a row with a span. */
export function rowTimeOf(row: DincharyaRow): string {
  const hasEnd = row.endMinute != null && row.endMinute !== row.minute;
  return hasEnd ? `${row.timeLabel} – ${minuteLabel(row.endMinute as number)}` : row.timeLabel;
}

/** 'Ritual' / 'Meal' / 'Therapy' / 'Hydration' — the chip beside each row. */
export function rowKindOf(type: string): string {
  switch (type) {
    case DINCHARYA_ROW_TYPE.MEAL:
      return 'Meal';
    case DINCHARYA_ROW_TYPE.THERAPY:
      return 'Therapy';
    case DINCHARYA_ROW_TYPE.HYDRATION:
      return 'Hydration';
    default:
      return 'Ritual';
  }
}
