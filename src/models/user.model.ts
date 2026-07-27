export interface Hotel {
  _id: string;
  name?: string;
  logo?: string;
  email?: string;
  address?: string;
  phoneNumber?: string;
  /** Tax percentages used by feature bills. */
  bookedRoomTax?: number;
  bookedFoodOrderTax?: number;
}

export interface Room {
  _id: string;
  roomNumber?: string | number;
  floor?: string | number;
}

export interface BookedRoom {
  _id: string;
  roomId?: string;
  roomData?: Room;
  checkInDate?: string;
  checkOutDate?: string;
  customerIds?: string[];
}

export interface CustomerUser {
  _id: string;
  fullName?: string;
  /** Some endpoints expose the display name as `name` rather than `fullName`. */
  name?: string;
  email?: string;
  phoneNumber?: string;
  phoneCountryCode?: string;
  profilePic?: string;
  hotelId?: string;
  roomId?: string;
  customerStatus?: number;
}

/** Shape returned by GET /v1/customer/login/profile (data). */
export interface CustomerProfile {
  user: CustomerUser;
  bookRoomData: BookedRoom[];
  hotelData?: Hotel;
}

/** Convenience selector for the display name across the two field variants. */
export function getDisplayName(user?: CustomerUser | null): string {
  return user?.fullName || user?.name || 'Guest';
}
