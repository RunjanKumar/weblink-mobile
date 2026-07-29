import type {StatusTone} from '../theme/statusTones';

export const DISCOUNT_TYPES = {PERCENTAGE: 1, AMOUNT: 2, BOGO: 3} as const;

export const TRANSACTION_STATUS = {
  PENDING: 1,
  SUCCESS: 2,
  FAILED: 3,
  CANCELLED: 4,
  REFUNDED: 5,
} as const;

export const PAYMENT_STATUS_LABELS: Record<number, string> = {
  [TRANSACTION_STATUS.PENDING]: 'Payment Pending',
  [TRANSACTION_STATUS.SUCCESS]: 'Paid',
  [TRANSACTION_STATUS.FAILED]: 'Payment Failed',
  [TRANSACTION_STATUS.CANCELLED]: 'Cancelled',
  [TRANSACTION_STATUS.REFUNDED]: 'Refunded',
};

// Tone KEYS — resolve through `useStatusTones()` (theme-aware, light + dark).

export const PAYMENT_STATUS_TONES: Record<number, StatusTone> = {
  [TRANSACTION_STATUS.PENDING]: 'warning',
  [TRANSACTION_STATUS.SUCCESS]: 'success',
  [TRANSACTION_STATUS.FAILED]: 'danger',
  [TRANSACTION_STATUS.CANCELLED]: 'muted',
  [TRANSACTION_STATUS.REFUNDED]: 'info',
};

// Food order lifecycle reuses BOOKING_STATUS values (1..4) with food-specific labels.
export const FOOD_ORDER_STATUS_LABELS: Record<number, string> = {
  1: 'Order Placed',
  2: 'Preparing',
  3: 'Delivered',
  4: 'Cancelled',
};
