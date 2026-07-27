import {apiClient} from './axios';
import {ENDPOINTS} from './endpoints';
import type {ApiResponse} from '../models/api.model';
import type {
  BookedService,
  ServiceBookingPayload,
  ServiceCategory,
} from '../models/service.model';

export const serviceApi = {
  /** GET /v1/hotelServices — service catalog (data.serviceData). */
  async getServices(): Promise<ApiResponse<{serviceData: ServiceCategory[]}>> {
    const {data} = await apiClient.get<ApiResponse<{serviceData: ServiceCategory[]}>>(
      ENDPOINTS.SERVICE,
    );
    return data;
  },

  /** GET /v1/hotelServices/book/customer — this guest's booked requests (data[]). */
  async getBookedServices(): Promise<ApiResponse<BookedService[]>> {
    const {data} = await apiClient.get<ApiResponse<BookedService[]>>(
      ENDPOINTS.SERVICE_BOOK_CUSTOMER,
    );
    return data;
  },

  /** POST /v1/hotelServices/book — one call per category. */
  async bookService(payload: ServiceBookingPayload): Promise<ApiResponse<unknown>> {
    const {data} = await apiClient.post<ApiResponse<unknown>>(ENDPOINTS.SERVICE_BOOK, payload);
    return data;
  },
};
