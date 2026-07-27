import {facilityApi} from '../api/facility.api';
import type {
  FacilityCategory,
  FacilityReservation,
  FacilityReservationPayload,
} from '../models/facility.model';

export const facilityRepository = {
  async getCategories(): Promise<FacilityCategory[]> {
    const res = await facilityApi.getFacilities();
    const payload = res.data;
    if (Array.isArray(payload)) {
      return payload;
    }
    return payload?.facilityData ?? [];
  },

  async getReservations(): Promise<FacilityReservation[]> {
    const res = await facilityApi.getReservations();
    return res.data ?? [];
  },

  async reserve(payload: FacilityReservationPayload): Promise<void> {
    await facilityApi.reserve(payload);
  },
};
