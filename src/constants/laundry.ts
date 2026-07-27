export const LAUNDRY_SERVICE_TYPE_LABELS: Record<string, string> = {
  WASH: 'Wash',
  IRON: 'Iron',
  WASH_IRON: 'Wash + Iron',
  DRY_CLEAN: 'Dry Clean',
  EXPRESS: 'Express',
};

export const LAUNDRY_ORDER_STATUS_LABELS: Record<string, string> = {
  REQUESTED: 'Requested',
  PICKED_UP: 'Picked Up',
  IN_PROCESS: 'In Process',
  READY: 'Ready',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
};

export const LAUNDRY_ORDER_STATUS_COLORS: Record<string, string> = {
  REQUESTED: '#f59e0b',
  PICKED_UP: '#0ea5e9',
  IN_PROCESS: '#3b82f6',
  READY: '#a855f7',
  DELIVERED: '#22c55e',
  CANCELLED: '#ef4444',
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
