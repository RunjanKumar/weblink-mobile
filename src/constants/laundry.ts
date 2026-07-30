import type {StatusTone} from '../theme/statusTones';

export const LAUNDRY_SERVICE_TYPE_LABELS: Record<string, string> = {
  WASH: 'Wash',
  IRON: 'Iron',
  WASH_IRON: 'Wash + Iron',
  DRY_CLEAN: 'Dry Clean',
  EXPRESS: 'Express',
};

/**
 * One line of guest-facing copy per service, for the TV's "Select services for
 * this item" list (the Figma prints a description under every service name).
 *
 * Static because the rate list carries only `{serviceType, rate}` — there is no
 * description field to read. Unknown service types simply render without one
 * rather than borrowing another service's words.
 */
export const LAUNDRY_SERVICE_TYPE_DESCRIPTIONS: Record<string, string> = {
  WASH: 'Washed and neatly folded',
  IRON: 'Pressed for a crisp finish',
  WASH_IRON: 'Washed, then pressed and folded',
  DRY_CLEAN: 'Gentle cleaning for delicate fabrics',
  EXPRESS: 'Prioritised ahead of the regular round',
};

export function serviceTypeDescription(serviceType?: string): string {
  return (serviceType ? LAUNDRY_SERVICE_TYPE_DESCRIPTIONS[serviceType] : undefined) ?? '';
}

export const LAUNDRY_ORDER_STATUS_LABELS: Record<string, string> = {
  REQUESTED: 'Requested',
  PICKED_UP: 'Picked Up',
  IN_PROCESS: 'In Process',
  READY: 'Ready',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
};

// Tone KEYS — resolve through `useStatusTones()` (theme-aware, light + dark).

export const LAUNDRY_ORDER_STATUS_TONES: Record<string, StatusTone> = {
  REQUESTED: 'warning',
  PICKED_UP: 'sky',
  IN_PROCESS: 'info',
  READY: 'purple',
  DELIVERED: 'success',
  CANCELLED: 'danger',
};

/** Guest-facing progress order (CANCELLED sits outside the flow). */
export const LAUNDRY_ORDER_FLOW = ['REQUESTED', 'PICKED_UP', 'IN_PROCESS', 'READY', 'DELIVERED'];

/** Statuses that count as "finished" (moved to Past Orders). */
export const LAUNDRY_TERMINAL_STATUSES = ['DELIVERED', 'CANCELLED'];

export function serviceTypeLabel(serviceType?: string): string {
  if (!serviceType) {
    return '';
  }
  return LAUNDRY_SERVICE_TYPE_LABELS[serviceType] ?? serviceType;
}
