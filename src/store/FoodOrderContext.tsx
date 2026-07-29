import React, {createContext, useCallback, useContext, useEffect, useMemo, useState} from 'react';
import {getEffectivePrice, getLineTotal} from '../utils/discount';
import {DISCOUNT_TYPES} from '../constants/food';
import {storage} from '../services/storage.service';
import {STORAGE_KEYS} from '../constants/storageKeys';
import {useAuth} from './AuthContext';
import type {CartItem, CouponValidateData} from '../models/food.model';

/** Server-validated coupon currently applied to the cart. */
export interface AppliedCoupon {
  name: string;
  response: CouponValidateData;
}

interface FoodOrderValue {
  foodCart: CartItem[];
  addToFoodCart: (item: Omit<CartItem, 'quantity'> & {quantity?: number}) => void;
  removeFromFoodCart: (id: string) => void;
  updateFoodCartQuantity: (id: string, quantity: number) => void;
  updateFoodCartItem: (id: string, updates: Partial<CartItem>) => void;
  clearFoodCart: () => void;
  getFoodCartTotal: () => number;
  getFoodCartCount: () => number;
  getCartUnitPrice: (item: CartItem) => number;
  getFoodItemTotal: (item: CartItem) => number;
  getItemQuantity: (id: string) => number;
  isBogo: (item: CartItem) => boolean;
  /**
   * Coupon state lives HERE (not in a screen viewmodel) so that EVERY cart
   * mutation — including adds from the menu/detail/coupon screens — atomically
   * invalidates it (reference behavior: "any cart mutation invalidates the
   * applied coupon"). Not persisted: must be revalidated server-side.
   */
  appliedCoupon: AppliedCoupon | null;
  setAppliedCoupon: (coupon: AppliedCoupon | null) => void;
}

const FoodOrderContext = createContext<FoodOrderValue | undefined>(undefined);

/**
 * Global food cart (ported from web FoodOrderContext). Add-ons are independent
 * line items; BOGO items start at qty 2, increment by 2, decrement by 1.
 */
export function FoodOrderProvider({children}: {children: React.ReactNode}) {
  // Cart persists (a webOS suspend/reload must not empty it); coupon does not.
  const [foodCart, setFoodCart] = useState<CartItem[]>(
    () => storage.getObject<CartItem[]>(STORAGE_KEYS.FOOD_CART) ?? [],
  );
  const [appliedCoupon, setAppliedCouponState] = useState<AppliedCoupon | null>(null);
  const {status: authStatus} = useAuth();

  useEffect(() => {
    storage.setObject(STORAGE_KEYS.FOOD_CART, foodCart);
  }, [foodCart]);

  // A signed-out (or next) guest must never inherit a cart.
  useEffect(() => {
    if (authStatus === 'unauthenticated') {
      setFoodCart([]);
      setAppliedCouponState(null);
      storage.remove(STORAGE_KEYS.FOOD_CART);
    }
  }, [authStatus]);

  const setAppliedCoupon = useCallback(
    (coupon: AppliedCoupon | null) => setAppliedCouponState(coupon),
    [],
  );

  const isBogo = useCallback(
    (item: CartItem) => item?.couponData?.discountType === DISCOUNT_TYPES.BOGO,
    [],
  );

  const getCartUnitPrice = useCallback(
    (item: CartItem) =>
      item.cartUnitPrice ??
      getEffectivePrice({
        price: item.price ?? 0,
        priceAfterDiscount: item.priceAfterDiscount,
        couponData: item.couponData,
      }),
    [],
  );

  const getFoodItemTotal = useCallback((item: CartItem) => {
    const unitPrice = getEffectivePrice({
      price: item.price ?? 0,
      priceAfterDiscount: item.priceAfterDiscount,
      couponData: item.couponData,
    });
    return getLineTotal({unitPrice, quantity: item.quantity, couponData: item.couponData});
  }, []);

  const addToFoodCart = useCallback(
    (item: Omit<CartItem, 'quantity'> & {quantity?: number}) => {
      const step = item?.couponData?.discountType === DISCOUNT_TYPES.BOGO ? 2 : 1;
      setAppliedCouponState(null); // any mutation invalidates the coupon
      setFoodCart(prev => {
        const existing = prev.find(c => c.id === item.id);
        if (existing) {
          return prev.map(c =>
            c.id === item.id ? {...c, ...item, quantity: c.quantity + step} : c,
          );
        }
        return [...prev, {...item, quantity: step}];
      });
    },
    [],
  );

  const removeFromFoodCart = useCallback((id: string) => {
    setAppliedCouponState(null);
    setFoodCart(prev => prev.filter(item => item.id !== id));
  }, []);

  const updateFoodCartQuantity = useCallback(
    (id: string, quantity: number) => {
      if (quantity <= 0) {
        removeFromFoodCart(id);
        return;
      }
      setAppliedCouponState(null);
      setFoodCart(prev => prev.map(item => (item.id === id ? {...item, quantity} : item)));
    },
    [removeFromFoodCart],
  );

  const updateFoodCartItem = useCallback((id: string, updates: Partial<CartItem>) => {
    setAppliedCouponState(null);
    setFoodCart(prev => prev.map(item => (item.id === id ? {...item, ...updates} : item)));
  }, []);

  const clearFoodCart = useCallback(() => {
    setAppliedCouponState(null);
    setFoodCart([]);
  }, []);

  const getFoodCartTotal = useCallback(
    () => foodCart.reduce((total, item) => total + getFoodItemTotal(item), 0),
    [foodCart, getFoodItemTotal],
  );

  const getFoodCartCount = useCallback(
    () => foodCart.reduce((count, item) => count + item.quantity, 0),
    [foodCart],
  );

  const getItemQuantity = useCallback(
    (id: string) => foodCart.find(item => item.id === id)?.quantity ?? 0,
    [foodCart],
  );

  const value = useMemo<FoodOrderValue>(
    () => ({
      foodCart,
      addToFoodCart,
      removeFromFoodCart,
      updateFoodCartQuantity,
      updateFoodCartItem,
      clearFoodCart,
      getFoodCartTotal,
      getFoodCartCount,
      getCartUnitPrice,
      getFoodItemTotal,
      getItemQuantity,
      isBogo,
      appliedCoupon,
      setAppliedCoupon,
    }),
    [
      foodCart,
      addToFoodCart,
      removeFromFoodCart,
      updateFoodCartQuantity,
      updateFoodCartItem,
      clearFoodCart,
      getFoodCartTotal,
      getFoodCartCount,
      getCartUnitPrice,
      getFoodItemTotal,
      getItemQuantity,
      isBogo,
      appliedCoupon,
      setAppliedCoupon,
    ],
  );

  return <FoodOrderContext.Provider value={value}>{children}</FoodOrderContext.Provider>;
}

export function useFoodOrder(): FoodOrderValue {
  const ctx = useContext(FoodOrderContext);
  if (!ctx) {
    throw new Error('useFoodOrder must be used within a <FoodOrderProvider>');
  }
  return ctx;
}
