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

export const BOOKING_STATUS_COLORS: Record<number, string> = {
  [BOOKING_STATUS.PENDING]: '#f59e0b',
  [BOOKING_STATUS.IN_PROGRESS]: '#3b82f6',
  [BOOKING_STATUS.COMPLETED]: '#22c55e',
  [BOOKING_STATUS.CANCEL]: '#ef4444',
};

/** Facility reservation status (matches web HOTEL_FACILITY_BOOKING_STATUS). */
export const FACILITY_BOOKING_STATUS = {
  PENDING: 1,
  APPROVED: 2,
  DISAPPROVED: 3,
  CANCELLED: 4,
} as const;

export const FACILITY_STATUS_LABELS: Record<number, string> = {
  [FACILITY_BOOKING_STATUS.PENDING]: 'Booking Pending',
  [FACILITY_BOOKING_STATUS.APPROVED]: 'Booking Confirmed',
  [FACILITY_BOOKING_STATUS.DISAPPROVED]: 'Booking Disapproved',
  [FACILITY_BOOKING_STATUS.CANCELLED]: 'Booking Cancelled',
};

export const FACILITY_STATUS_COLORS: Record<number, string> = {
  [FACILITY_BOOKING_STATUS.PENDING]: '#f59e0b',
  [FACILITY_BOOKING_STATUS.APPROVED]: '#22c55e',
  [FACILITY_BOOKING_STATUS.DISAPPROVED]: '#ef4444',
  [FACILITY_BOOKING_STATUS.CANCELLED]: '#6b7280',
};
