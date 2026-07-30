import {apiClient} from './axios';
import {ENDPOINTS} from './endpoints';
import type {ApiResponse} from '../models/api.model';
import type {GuestFolio} from '../models/folio.model';

/** Guest folio (View Bill) API — guest token required. */
export const folioApi = {
  /**
   * GET /v1/folio/guest?hotelId=… — the CURRENT stay's bill. The backend
   * resolves the stay from the auth token; hotelId must be the one from the
   * profile call or the request 403s.
   */
  async getGuestFolio(hotelId: string): Promise<ApiResponse<GuestFolio>> {
    const {data} = await apiClient.get<ApiResponse<GuestFolio>>(ENDPOINTS.FOLIO_GUEST, {
      params: {hotelId},
    });
    return data;
  },
};
