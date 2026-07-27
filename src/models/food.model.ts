export interface FoodCouponData {
  discountType?: number;
  [key: string]: unknown;
}

export interface AddOn {
  _id: string;
  name?: string;
  price?: number;
  priceAfterDiscount?: number;
  imageURL?: string;
  type?: number;
  isAvailable?: boolean;
  couponData?: FoodCouponData;
}

export interface Food {
  _id: string;
  name?: string;
  description?: string;
  price?: number;
  priceAfterDiscount?: number;
  imageURL?: string;
  kcal?: number;
  type?: number;
  inGridients?: string[];
  choiceOfAddOnDetails?: AddOn[];
  isAvailable?: boolean;
  couponData?: FoodCouponData;
}

export interface FoodCategory {
  _id: string;
  name?: string;
  foodsInCategories?: Food[];
}

/** Offer/coupon summary (from the categories envelope) + full detail (by id). */
export interface Coupon {
  _id: string;
  name?: string;
  title?: string;
  image?: string;
  description?: string;
  discountValue?: number;
  discountType?: number;
  applicableItemsData?: Food[];
}

/** In-cart line item (food or add-on). */
export interface CartItem {
  id: string;
  foodId?: string;
  title?: string;
  name?: string;
  price?: number;
  priceAfterDiscount?: number;
  quantity: number;
  imageURL?: string;
  type?: number;
  couponData?: FoodCouponData;
  isAddOn?: boolean;
  parentFoodTitle?: string;
  cartUnitPrice?: number;
}

export interface FoodOrderItem {
  quantity?: number;
  price?: number;
  foodDetail?: {name?: string; type?: number};
}

export interface FoodOrder {
  _id: string;
  status?: number;
  paymentStatus?: number;
  foodItems?: FoodOrderItem[];
  totalPrice?: number;
  totalPriceAfterDisCount?: number;
  tax?: number;
  taxInAmount?: number;
  totalPriceAfterTax?: number;
  createdAt?: string;
}

export interface CouponItem {
  foodId?: string;
  name?: string;
  quantity?: number;
  originalPrice?: number;
  finalPrice?: number;
  discountAmount?: number;
  appliedCouponType?: string;
}

export interface CouponSummary {
  totalDiscount?: number;
  finalPayableAmount?: number;
  orderCouponDiscount?: number;
}

export interface CouponValidateData {
  items?: CouponItem[];
  summary?: CouponSummary;
}

export interface CreateOrderPayload {
  hotelId?: string;
  foodItems: {foodId?: string; quantity: number; price: number}[];
  deliveryAddress: string;
  coupon?: string;
}

export interface InitiatePaymentData {
  razorpayOrderId?: string;
  amount?: number;
  currency?: string;
  razorpayKey?: string;
}
