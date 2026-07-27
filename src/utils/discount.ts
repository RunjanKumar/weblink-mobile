import {DISCOUNT_TYPES} from '../constants/food';

interface CouponData {
  discountType?: number;
}

interface PriceInfo {
  price?: number;
  priceAfterDiscount?: number;
  couponData?: CouponData;
}

/** Display info for a food item based on its discount type (mirrors web discountHelper). */
export function getDiscountDisplayInfo({price = 0, priceAfterDiscount, couponData}: PriceInfo): {
  displayPrice: number;
  originalPrice: number | null;
  isBogo: boolean;
  hasDiscount: boolean;
  discountType: number | null;
} {
  const discountType = couponData?.discountType ?? null;
  const result = {
    displayPrice: price,
    originalPrice: null as number | null,
    isBogo: false,
    hasDiscount: false,
    discountType,
  };
  if (!discountType) {
    return result;
  }
  switch (discountType) {
    case DISCOUNT_TYPES.PERCENTAGE:
      result.displayPrice = priceAfterDiscount ?? price;
      if (priceAfterDiscount != null && priceAfterDiscount < price) {
        result.originalPrice = price;
        result.hasDiscount = true;
      }
      break;
    case DISCOUNT_TYPES.AMOUNT:
      result.displayPrice = price;
      break;
    case DISCOUNT_TYPES.BOGO:
      result.displayPrice = price;
      result.isBogo = true;
      result.hasDiscount = true;
      break;
    default:
      break;
  }
  return result;
}

/** Effective unit price for cart math: PERCENTAGE -> priceAfterDiscount, else original. */
export function getEffectivePrice({price = 0, priceAfterDiscount, couponData}: PriceInfo): number {
  if (couponData?.discountType === DISCOUNT_TYPES.PERCENTAGE && priceAfterDiscount != null) {
    return priceAfterDiscount;
  }
  return price;
}

/** Line total applying BOGO (every 2nd free -> pay ceil(qty/2)). */
export function getLineTotal({
  unitPrice,
  quantity,
  couponData,
}: {
  unitPrice: number;
  quantity: number;
  couponData?: CouponData;
}): number {
  if (couponData?.discountType === DISCOUNT_TYPES.BOGO) {
    return unitPrice * Math.ceil(quantity / 2);
  }
  return unitPrice * quantity;
}
