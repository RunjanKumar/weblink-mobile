import {apiClient} from './axios';
import {ENDPOINTS} from './endpoints';
import type {ApiResponse} from '../models/api.model';
import type {
  Coupon,
  CouponValidateData,
  CreateOrderPayload,
  FoodCategory,
  FoodOrder,
  InitiatePaymentData,
} from '../models/food.model';

interface VerifyPaymentPayload {
  foodOrderId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}

export const foodApi = {
  /**
   * GET /v1/foodCategory — categories (data) + offers (couponData sibling on the
   * envelope, not inside data).
   */
  async getCategories(): Promise<ApiResponse<FoodCategory[]> & {couponData?: Coupon[]}> {
    const {data} = await apiClient.get<ApiResponse<FoodCategory[]> & {couponData?: Coupon[]}>(
      ENDPOINTS.FOOD_CATEGORY,
      {params: {hasFoods: true, excludeCouponAppliedCategories: false}},
    );
    return data;
  },

  /** GET /v1/coupon?couponId= — full coupon detail (data.couponData, obj or array). */
  async getCouponById(couponId: string): Promise<ApiResponse<{couponData?: Coupon | Coupon[]}>> {
    const {data} = await apiClient.get<ApiResponse<{couponData?: Coupon | Coupon[]}>>(
      ENDPOINTS.COUPON,
      {params: {couponId}},
    );
    return data;
  },

  /** GET /v1/foodOrder — order history (data.food). */
  async getOrders(): Promise<ApiResponse<{food: FoodOrder[]}>> {
    const {data} = await apiClient.get<ApiResponse<{food: FoodOrder[]}>>(ENDPOINTS.FOOD_ORDER);
    return data;
  },

  /** POST /v1/foodOrder — create order (always COD first). */
  async createOrder(payload: CreateOrderPayload): Promise<ApiResponse<{_id?: string}>> {
    const {data} = await apiClient.post<ApiResponse<{_id?: string}>>(ENDPOINTS.FOOD_ORDER, payload);
    return data;
  },

  /** POST /v1/foodOrder/initiatePayment — get Razorpay order. */
  async initiatePayment(foodOrderId: string): Promise<ApiResponse<InitiatePaymentData>> {
    const {data} = await apiClient.post<ApiResponse<InitiatePaymentData>>(
      ENDPOINTS.INITIATE_PAYMENT,
      {foodOrderId},
    );
    return data;
  },

  /** POST /v1/foodOrder/verifyPayment — confirm the Razorpay payment. */
  async verifyPayment(payload: VerifyPaymentPayload): Promise<ApiResponse<unknown>> {
    const {data} = await apiClient.post<ApiResponse<unknown>>(ENDPOINTS.VERIFY_PAYMENT, payload);
    return data;
  },

  /** POST /v1/coupon/validate — validate a coupon against the cart. */
  async validateCoupon(payload: {
    foodItems: {foodId?: string; quantity: number}[];
    name: string;
  }): Promise<ApiResponse<CouponValidateData>> {
    const {data} = await apiClient.post<ApiResponse<CouponValidateData>>(
      ENDPOINTS.COUPON_VALIDATE,
      payload,
    );
    return data;
  },
};

export type {VerifyPaymentPayload};
