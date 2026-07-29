import {facilityApi} from '../api/facility.api';
import {resolveImageUrl} from '../utils/imageUrl';
import type {
  FacilityCategory,
  FacilityReservation,
  FacilityReservationPayload,
} from '../models/facility.model';

/** The API returns relative storage paths for images — resolve them (see utils/imageUrl). */
function normalizeCategory(category: FacilityCategory): FacilityCategory {
  return {
    ...category,
    imageUrl: resolveImageUrl(category.imageUrl),
    types: (category.types ?? []).map(t => ({...t, image: resolveImageUrl(t.image)})),
  };
}

export const facilityRepository = {
  async getCategories(): Promise<FacilityCategory[]> {
    const res = await facilityApi.getFacilities();
    // Reference fallback chain: facilityData → data (nested) → bare array.
    const payload = res.data as
      | FacilityCategory[]
      | {facilityData?: FacilityCategory[]; data?: FacilityCategory[]}
      | undefined;
    const list = Array.isArray(payload)
      ? payload
      : payload?.facilityData ?? payload?.data ?? [];
    return list.map(normalizeCategory);
  },

  async getReservations(): Promise<FacilityReservation[]> {
    const res = await facilityApi.getReservations();
    // Accept both the enveloped and bare-array shapes (reference behavior).
    const payload = res.data ?? (res as unknown as FacilityReservation[]);
    return Array.isArray(payload) ? payload : [];
  },

  async reserve(payload: FacilityReservationPayload): Promise<void> {
    await facilityApi.reserve(payload);
  },
};
