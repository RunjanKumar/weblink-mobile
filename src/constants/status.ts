import type {StatusTone} from '../theme/statusTones';

/** Service/booking request status (matches web app BOOKING_STATUS). */
export const BOOKING_STATUS = {
  PENDING: 1,
  IN_PROGRESS: 2,
  COMPLETED: 3,
  CANCEL: 4,
} as const;

export type BookingStatus = (typeof BOOKING_STATUS)[keyof typeof BOOKING_STATUS];

export const BOOKING_STATUS_LABELS: Record<number, string> = {
  [BOOKING_STATUS.PENDING]: 'Pending',
  [BOOKING_STATUS.IN_PROGRESS]: 'In Progress',
  [BOOKING_STATUS.COMPLETED]: 'Completed',
  [BOOKING_STATUS.CANCEL]: 'Cancelled',
};

// Tone KEYS, not colors — resolve through `useStatusTones()` so the pills stay
// legible on both the dark and light themes.

export const BOOKING_STATUS_TONES: Record<number, StatusTone> = {
  [BOOKING_STATUS.PENDING]: 'warning',
  [BOOKING_STATUS.IN_PROGRESS]: 'info',
  [BOOKING_STATUS.COMPLETED]: 'success',
  [BOOKING_STATUS.CANCEL]: 'danger',
};

/** Facility reservation status (matches web HOTEL_FACILITY_BOOKING_STATUS). */
export const FACILITY_BOOKING_STATUS = {
  PENDING: 1,
  APPROVED: 2,
  DISAPPROVED: 3,
  CANCELLED: 4,
} as const;

// Labels + tones match the reference web app exactly (constant.js:37-49 —
// note PENDING is RED there, and "Booking Confirm" is the reference's string).
export const FACILITY_STATUS_LABELS: Record<number, string> = {
  [FACILITY_BOOKING_STATUS.PENDING]: 'Booking Pending',
  [FACILITY_BOOKING_STATUS.APPROVED]: 'Booking Confirm',
  [FACILITY_BOOKING_STATUS.DISAPPROVED]: 'Booking Disapproved',
  [FACILITY_BOOKING_STATUS.CANCELLED]: 'Booking Cancelled',
};

export const FACILITY_STATUS_TONES: Record<number, StatusTone> = {
  [FACILITY_BOOKING_STATUS.PENDING]: 'danger',
  [FACILITY_BOOKING_STATUS.APPROVED]: 'success',
  [FACILITY_BOOKING_STATUS.DISAPPROVED]: 'danger',
  [FACILITY_BOOKING_STATUS.CANCELLED]: 'muted',
};
