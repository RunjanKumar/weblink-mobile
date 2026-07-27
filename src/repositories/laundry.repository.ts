import {laundryApi} from '../api/laundry.api';
import type {LaundryItem, LaundryOrder, LaundryOrderPayload} from '../models/laundry.model';

export const laundryRepository = {
  async getRateList(hotelId: string): Promise<LaundryItem[]> {
    const res = await laundryApi.getRateList(hotelId);
    return res.data?.items ?? [];
  },

  async getOrders(hotelId: string): Promise<LaundryOrder[]> {
    const res = await laundryApi.getOrders(hotelId);
    return res.data?.orders ?? [];
  },

  async createOrder(payload: LaundryOrderPayload): Promise<void> {
    await laundryApi.createOrder(payload);
  },

  async cancelOrder(
    orderId: string,
    hotelId: string,
    reason = 'Cancelled by guest',
  ): Promise<void> {
    await laundryApi.cancelOrder(orderId, hotelId, reason);
  },
};
