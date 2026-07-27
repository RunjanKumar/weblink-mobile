export interface FacilityType {
  _id: string;
  /** Parent category id (used as facilityId in the booking payload). */
  facilityId?: string;
  name?: string;
  description?: string;
  image?: string;
  startTime?: string;
  endTime?: string;
  days?: number[]; // 0=Sun .. 6=Sat
  isAvailable?: boolean;
  cuisine?: string;
  location?: string;
  locationlink?: string;
  pricing?: number;
  phoneNumber?: string;
  capacity?: number;
  area?: string;
  type?: string;
}

export interface FacilityCategory {
  _id: string;
  name?: string;
  imageUrl?: string;
  types?: FacilityType[];
}

export interface FacilityReservation {
  _id: string;
  facilityName?: string;
  facilityTypeName?: string;
  bookingDate?: string;
  numberOfGuests?: number;
  status?: number;
}

export interface FacilityReservationPayload {
  facilityId?: string;
  facilityTypeId: string;
  bookingDate: string;
  numberOfGuests: number;
}
