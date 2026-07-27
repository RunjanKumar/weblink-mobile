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
