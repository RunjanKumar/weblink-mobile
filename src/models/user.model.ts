/**
 * Some hotels carry a structured address, others a single line — the profile
 * endpoint returns whichever the hotel was created with.
 */
export interface HotelAddress {
  street?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
}

export interface Hotel {
  _id: string;
  name?: string;
  logo?: string;
  email?: string;
  /** String OR object — always read it through `getHotelAddress`. */
  address?: string | HotelAddress;
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

/**
 * One printable line from either address shape. Never return the raw field to a
 * `<Text>`: the object form crashes React with "Objects are not valid as a React
 * child", which is exactly how this was found.
 */
export function getHotelAddress(hotel?: Hotel | null): string | undefined {
  const address = hotel?.address;
  if (typeof address === 'string') {
    return address.trim() || undefined;
  }
  if (!address) {
    return undefined;
  }
  const line = [address.street, address.city, address.state, address.postalCode, address.country]
    .map(part => (typeof part === 'string' ? part.trim() : ''))
    .filter(Boolean)
    .join(', ');
  return line || undefined;
}
