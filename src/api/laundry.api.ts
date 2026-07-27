import {apiClient} from './axios';
import {ENDPOINTS} from './endpoints';
import type {ApiResponse} from '../models/api.model';
import type {LaundryItem, LaundryOrder, LaundryOrderPayload} from '../models/laundry.model';

export const laundryApi = {
  /** GET /v1/laundry/guest/rate-list?hotelId= — priced garments (data.items). */
  async getRateList(hotelId: string): Promise<ApiResponse<{items: LaundryItem[]}>> {
    const {data} = await apiClient.get<ApiResponse<{items: LaundryItem[]}>>(
      ENDPOINTS.LAUNDRY_RATE_LIST,
      {params: {hotelId}},
    );
    return data;
  },

  /** GET /v1/laundry/guest/order?hotelId=&limit=50 — my orders (data.orders). */
  async getOrders(hotelId: string): Promise<ApiResponse<{orders: LaundryOrder[]}>> {
    const {data} = await apiClient.get<ApiResponse<{orders: LaundryOrder[]}>>(
      ENDPOINTS.LAUNDRY_ORDER,
      {params: {hotelId, limit: 50}},
    );
    return data;
  },

  /** POST /v1/laundry/guest/order — request a pickup. */
  async createOrder(payload: LaundryOrderPayload): Promise<ApiResponse<unknown>> {
    const {data} = await apiClient.post<ApiResponse<unknown>>(ENDPOINTS.LAUNDRY_ORDER, payload);
    return data;
  },

  /** PATCH /v1/laundry/guest/order/:id/cancel — guest cancel (REQUESTED only). */
  async cancelOrder(
    orderId: string,
    hotelId: string,
    reason: string,
  ): Promise<ApiResponse<unknown>> {
    const {data} = await apiClient.patch<ApiResponse<unknown>>(
      `${ENDPOINTS.LAUNDRY_ORDER}/${orderId}/cancel`,
      {hotelId, reason},
    );
    return data;
  },
};
