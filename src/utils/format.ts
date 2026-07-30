/** "14:30" -> "2:30 PM". Returns the input if unparseable. */
export function formatTime12h(hhmm?: string): string {
  if (!hhmm) {
    return '';
  }
  const [hStr, mStr] = hhmm.split(':');
  const h = Number(hStr);
  if (Number.isNaN(h)) {
    return hhmm;
  }
  const minutes = Number(mStr) || 0;
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(minutes).padStart(2, '0')} ${period}`;
}

export function formatDate(iso?: string): string {
  if (!iso) {
    return '';
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return date.toLocaleDateString(undefined, {day: 'numeric', month: 'short', year: 'numeric'});
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** [0..6] -> "Open all days" (if 7) else "Sun, Mon, …". */
export function formatDays(days?: number[]): string {
  if (!days || days.length === 0) {
    return '';
  }
  if (days.length >= 7) {
    return 'Open all days';
  }
  return days
    .filter(d => d >= 0 && d <= 6)
    .map(d => DAY_NAMES[d])
    .join(', ');
}

export function formatDateTime(iso?: string): string {
  if (!iso) {
    return '';
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  const time = date.toLocaleTimeString(undefined, {hour: '2-digit', minute: '2-digit'});
  return `${formatDate(iso)} · ${time}`;
}

/**
 * "Today, 01:20 AM" · "Yesterday, 10:50 PM" · "17 Jun, 12:05 PM".
 *
 * The stamp the ten-foot frames use: a guest reading a list of requests from
 * across the room resolves "Today" instantly and a date not at all. Anything
 * older than yesterday falls back to the date, with the year added once the
 * stay crosses into a different one.
 */
export function formatRelativeDateTime(iso?: string): string {
  if (!iso) {
    return '';
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  const time = date.toLocaleTimeString('en-US', {hour: '2-digit', minute: '2-digit', hour12: true});
  const now = new Date();
  const midnightToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const midnightThen = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const days = Math.round((midnightToday - midnightThen) / 86_400_000);
  if (days === 0) {
    return `Today, ${time}`;
  }
  if (days === 1) {
    return `Yesterday, ${time}`;
  }
  // Negative days = a timestamp ahead of this TV's clock; the absolute date is
  // the only honest thing to print.
  const day = date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    ...(date.getFullYear() === now.getFullYear() ? {} : {year: 'numeric'}),
  });
  return `${day}, ${time}`;
}

/**
 * "28 Jul 2026 at 02:30 PM" — a facility reservation's stored slot.
 *
 * The time MUST come from the raw string after the "T" (reference
 * `latestFormattedTime`): the stored value is the NAIVE wall-clock the guest
 * picked, and `new Date(iso)`'s timezone conversion shifts it (7:49 AM rendered
 * as 1:19 PM on IST devices). Only the date half goes through `Date`.
 */
export function formatBookingDateTime(iso?: string): string {
  if (!iso) {
    return '—';
  }
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return iso;
  }
  const date = d.toLocaleDateString('en-IN', {day: '2-digit', month: 'short', year: 'numeric'});
  const timePart = iso.split('T')[1];
  if (!timePart) {
    return date;
  }
  const [rawHours, minutes] = timePart.split(':');
  let hours = Number(rawHours);
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return `${date} at ${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
}

/**
 * Rupees with Indian digit grouping: ₹12,500 · ₹1,52,542.42.
 * Hand-rolled instead of Intl 'en-IN' because Hermes ships a reduced ICU and
 * silently falls back to western grouping. Always positive — callers add the
 * minus sign (refunds/payments render as "-₹5,000").
 */
export function formatRupees(amount?: number | null): string {
  const n = typeof amount === 'number' && Number.isFinite(amount) ? Math.abs(amount) : 0;
  const fixed = n.toFixed(2);
  const dot = fixed.indexOf('.');
  const int = fixed.slice(0, dot);
  const dec = fixed.slice(dot + 1);
  const last3 = int.slice(-3);
  const rest = int.slice(0, -3);
  const grouped = rest ? `${rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',')},${last3}` : last3;
  return `₹${dec === '00' ? grouped : `${grouped}.${dec}`}`;
}
