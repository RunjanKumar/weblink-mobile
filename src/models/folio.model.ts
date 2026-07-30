/**
 * Guest folio (View Bill) — mirrors GET /v1/folio/guest.
 * All amounts are RUPEES (not paise), possibly with 2 decimals.
 */

/** Charge line kinds. Detect refunds by NUMERIC type, never by label text. */
export const CHARGE_TYPE = {
  ROOM: 1,
  FACILITY: 2,
  FOOD: 3,
  REFUND: 4,
  BUFFET: 5,
  MISC: 6,
} as const;

export const FOLIO_STATUS = {
  UNPAID: 1,
  PARTIALLY_PAID: 2,
  PAID: 3,
} as const;

export interface FolioCharge {
  _id: string;
  type: number;
  /** Display name — backend already prefers the custom name when one exists. */
  label: string;
  chargeKind: string | null;
  chargeName: string | null;
  quantity: number;
  /** Gross amount (rupees). Positive even for refunds — sign comes from `type`. */
  total: number;
  tax: number;
  base: number;
  createdAt: string;
}

export interface FolioPayment {
  _id: string;
  invoiceNumber: string | null;
  amount: number;
  method: string | null;
  methodLabel: string;
  channel: number;
  channelLabel: string;
  paymentId: string | null;
  /** Receipt PDF; can be null. Not openable on a TV — kept for parity. */
  invoiceUrl: string | null;
  paidAt: string;
}

export interface GuestFolio {
  bookedRoomId: string;
  totalCharges: number;
  totalPaid: number;
  /** Internal in-flight online-payment lock — ignore in UI. */
  reservedAmount: number;
  balanceDue: number;
  overpaidAmount: number;
  folioStatus: number;
  charges: FolioCharge[];
  payments: FolioPayment[];
}
