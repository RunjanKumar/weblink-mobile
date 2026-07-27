import {apiClient} from './axios';
import {ENDPOINTS} from './endpoints';
import type {ApiResponse} from '../models/api.model';
import type {
  FacilityCategory,
  FacilityReservation,
  FacilityReservationPayload,
} from '../models/facility.model';

// The backend has shipped facilities either as a bare array or wrapped in
// { facilityData }. The repository normalizes both shapes.
type FacilitiesData = FacilityCategory[] | {facilityData?: FacilityCategory[]};

export const facilityApi = {
  /** GET /v1/hotelFacility — categories with nested types[]. */
  async getFacilities(): Promise<ApiResponse<FacilitiesData>> {
    const {data} = await apiClient.get<ApiResponse<FacilitiesData>>(ENDPOINTS.FACILITIES);
    return data;
  },

  /** POST /v1/hotelFacility/book — reserve a facility. */
  async reserve(payload: FacilityReservationPayload): Promise<ApiResponse<unknown>> {
    const {data} = await apiClient.post<ApiResponse<unknown>>(ENDPOINTS.FACILITY_BOOK, payload);
    return data;
  },

  /** GET /v1/hotelFacility/book — this guest's reservations. */
  async getReservations(): Promise<ApiResponse<FacilityReservation[]>> {
    const {data} = await apiClient.get<ApiResponse<FacilityReservation[]>>(ENDPOINTS.FACILITY_BOOK);
    return data;
  },
};
