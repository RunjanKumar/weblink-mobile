import {foodApi, type VerifyPaymentPayload} from '../api/food.api';
import type {
  Coupon,
  CouponValidateData,
  CreateOrderPayload,
  FoodCategory,
  FoodOrder,
  InitiatePaymentData,
} from '../models/food.model';

export const foodRepository = {
  /** Categories + the offers shown in the "Special Offers" slider. */
  async getCategoriesWithOffers(): Promise<{categories: FoodCategory[]; coupons: Coupon[]}> {
    const res = await foodApi.getCategories();
    return {categories: res.data ?? [], coupons: res.couponData ?? []};
  },

  async getCoupon(couponId: string): Promise<Coupon | null> {
    const res = await foodApi.getCouponById(couponId);
    const detail = res.data?.couponData;
    if (!detail) {
      return null;
    }
    return Array.isArray(detail) ? detail[0] ?? null : detail;
  },

  async getOrders(): Promise<FoodOrder[]> {
    const res = await foodApi.getOrders();
    return res.data?.food ?? [];
  },

  /** Create the order and return its id. */
  async createOrder(payload: CreateOrderPayload): Promise<string> {
    const res = await foodApi.createOrder(payload);
    const id = res.data?._id;
    if (!id) {
      throw new Error(res.message || 'Order created but no order ID received.');
    }
    return id;
  },

  async initiatePayment(foodOrderId: string): Promise<InitiatePaymentData> {
    const res = await foodApi.initiatePayment(foodOrderId);
    return res.data ?? {};
  },

  async verifyPayment(payload: VerifyPaymentPayload): Promise<void> {
    await foodApi.verifyPayment(payload);
  },

  /** Returns { ok, message, data } — cart maps this to applied state or an error. */
  async validateCoupon(
    foodItems: {foodId?: string; quantity: number}[],
    name: string,
  ): Promise<{ok: boolean; message: string; data: CouponValidateData | null}> {
    const res = await foodApi.validateCoupon({foodItems, name});
    const ok = res.status !== false;
    return {ok, message: res.message ?? '', data: ok ? res.data ?? null : null};
  },
};
