import {foodApi, type VerifyPaymentPayload} from '../api/food.api';
import {logger} from '../services/logger';
import {resolveImageUrl} from '../utils/imageUrl';
import type {
  Coupon,
  CouponValidateData,
  CreateOrderPayload,
  Food,
  FoodCategory,
  FoodOrder,
  InitiatePaymentData,
} from '../models/food.model';

/**
 * Coerce an API list field to an array.
 *
 * The backend is not consistent about where a list lives on the envelope: some
 * endpoints return `data: T[]`, others wrap it under a name (`data.food`,
 * `data.serviceData`, `data.items`). `/v1/foodCategory` in particular returns
 * `data.data` — one level deeper than PHASE2_SPEC documented — and the menu
 * screen calling `.map` on that object was a hard crash ("undefined is not a
 * function"), not a render glitch. So never trust the declared shape: accept a
 * bare array or any of `keys`, fall back to the first array-valued property,
 * and log anything else so the real shape shows up in logcat.
 */
function toArray<T>(value: unknown, scope: string, keys: string[]): T[] {
  if (value == null) {
    return [];
  }
  if (Array.isArray(value)) {
    return value as T[];
  }
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    for (const key of keys) {
      if (Array.isArray(obj[key])) {
        return obj[key] as T[];
      }
    }
    const found = Object.entries(obj).find(([, v]) => Array.isArray(v));
    if (found) {
      logger.warn(scope, `list found under unexpected key "${found[0]}"`);
      return found[1] as T[];
    }
  }
  logger.warn(scope, 'expected a list but got', typeof value, Object.keys(value as object));
  return [];
}

/** Resolve a food's (and its add-ons') relative image paths to loadable URLs. */
function normalizeFood(food: Food): Food {
  return {
    ...food,
    imageURL: resolveImageUrl(food.imageURL),
    choiceOfAddOnDetails: (food.choiceOfAddOnDetails ?? []).map(addOn => ({
      ...addOn,
      imageURL: resolveImageUrl(addOn.imageURL),
    })),
  };
}

export const foodRepository = {
  /** Categories + the offers shown in the "Special Offers" slider. */
  async getCategoriesWithOffers(): Promise<{categories: FoodCategory[]; coupons: Coupon[]}> {
    const res = await foodApi.getCategories();
    // Live API nests the list at `data.data`; `data: Category[]` is also accepted.
    const rawCategories = toArray<FoodCategory>(res.data, 'foodRepository.categories', [
      'data',
      'foodCategory',
      'foodCategories',
      'categories',
      'category',
    ]);
    // Guarantee the nested food list is an array too — the menu maps over it —
    // and resolve the API's relative image paths to loadable URLs.
    const categories = rawCategories.map(cat => ({
      ...cat,
      foodsInCategories: toArray<Food>(cat?.foodsInCategories, 'foodRepository.foods', [
        'foods',
        'food',
      ]).map(normalizeFood),
    }));
    const rawCoupons =
      res.couponData ?? (res.data as {couponData?: unknown} | undefined)?.couponData;
    const coupons = toArray<Coupon>(rawCoupons, 'foodRepository.coupons', [
      'couponData',
      'coupons',
    ]).map(c => ({...c, image: resolveImageUrl(c.image)}));
    return {categories, coupons};
  },

  async getCoupon(couponId: string): Promise<Coupon | null> {
    const res = await foodApi.getCouponById(couponId);
    const detail = res.data?.couponData;
    if (!detail) {
      return null;
    }
    const coupon = Array.isArray(detail) ? detail[0] ?? null : detail;
    if (!coupon) {
      return null;
    }
    return {
      ...coupon,
      image: resolveImageUrl(coupon.image),
      applicableItemsData: toArray<Food>(coupon.applicableItemsData, 'foodRepository.coupon', [
        'items',
        'foods',
      ]).map(normalizeFood),
    };
  },

  async getOrders(): Promise<FoodOrder[]> {
    const res = await foodApi.getOrders();
    return toArray<FoodOrder>(res.data?.food ?? res.data, 'foodRepository.orders', [
      'food',
      'orders',
      'data',
    ]);
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
