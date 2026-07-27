import {serviceApi} from '../api/service.api';
import type {
  BookedService,
  ServiceBookingPayload,
  ServiceCategory,
} from '../models/service.model';

export const serviceRepository = {
  async getCategories(): Promise<ServiceCategory[]> {
    const res = await serviceApi.getServices();
    return res.data?.serviceData ?? [];
  },

  async getBooked(): Promise<BookedService[]> {
    const res = await serviceApi.getBookedServices();
    return res.data ?? [];
  },

  async book(payload: ServiceBookingPayload): Promise<void> {
    await serviceApi.bookService(payload);
  },
};
