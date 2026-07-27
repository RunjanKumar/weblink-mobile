export interface ServiceSubCategory {
  _id: string;
  name?: string;
  description?: string;
  icon?: string;
  price?: number;
}

export interface ServiceCategory {
  _id: string;
  name?: string;
  /** Service window (HH:mm). */
  from?: string;
  to?: string;
  isAvailable?: boolean;
  subCategoriesIds?: ServiceSubCategory[];
}

export interface BookedService {
  _id: string;
  name?: string;
  description?: string;
  details?: string;
  status?: number;
  subCategoryId?: string;
  requestedAt?: string;
}

/** A category reduced to only its currently-requested subcategories. */
export interface GroupedServiceCategory {
  _id: string;
  name?: string;
  subcategories: ServiceSubCategory[];
}

/** One POST /v1/hotelServices/book payload (one per category). */
export interface ServiceBookingPayload {
  hotelFacilityId: string;
  subCategory: {subCategoryId: string; description: string}[];
}
