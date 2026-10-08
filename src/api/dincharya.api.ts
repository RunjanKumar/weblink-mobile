import {apiClient} from './axios';
import {ENDPOINTS} from './endpoints';
import type {ApiResponse} from '../models/api.model';
import type {GuestDincharya} from '../models/dincharya.model';

/** Guest Dincharya ("My Day") API — guest token required. */
export const dincharyaApi = {
  /**
   * GET /v1/dincharya/guest?hotelId=…[&date=YYYY-MM-DD] — one published day
   * plus every published date of the stay. Without `date` (or with one that is
   * not published) the server picks: today, else the next published day.
   * 403 MODULE_DISABLED when the hotel does not offer it (Clinical module).
   */
  async getMine(hotelId: string, date?: string): Promise<ApiResponse<GuestDincharya>> {
    const {data} = await apiClient.get<ApiResponse<GuestDincharya>>(ENDPOINTS.DINCHARYA_GUEST, {
      params: date ? {hotelId, date} : {hotelId},
    });
    return data;
  },
};
