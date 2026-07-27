export interface LaundryRate {
  serviceType: string;
  rate: number;
}

export interface LaundryItem {
  _id: string;
  name?: string;
  unit?: string;
  rates?: LaundryRate[];
}

export interface LaundryOrderItem {
  itemId?: string;
  itemName?: string;
  serviceType?: string;
  qty?: number;
  amount?: number;
}

export interface LaundryOrder {
  _id: string;
  orderNumber?: string | number;
  status?: string;
  isExpress?: boolean;
  createdAt?: string;
  taxPercentage?: number;
  totalAmount?: number;
  items?: LaundryOrderItem[];
  folio?: {transactionId?: string};
}

export interface LaundryOrderPayload {
  hotelId: string;
  items: {itemId: string; serviceType: string; qty: number}[];
  isExpress: boolean;
  notes: string;
}

/** A single basket line (local UI state). */
export interface LaundryBasketLine {
  serviceType: string;
  qty: number;
}
