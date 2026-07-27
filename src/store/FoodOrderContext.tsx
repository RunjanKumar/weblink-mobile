import React, {createContext, useCallback, useContext, useMemo, useState} from 'react';
import {getEffectivePrice, getLineTotal} from '../utils/discount';
import {DISCOUNT_TYPES} from '../constants/food';
import type {CartItem} from '../models/food.model';

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
}

const FoodOrderContext = createContext<FoodOrderValue | undefined>(undefined);

/**
 * Global food cart (ported from web FoodOrderContext). Add-ons are independent
 * line items; BOGO items start at qty 2, increment by 2, decrement by 1.
 */
export function FoodOrderProvider({children}: {children: React.ReactNode}) {
  const [foodCart, setFoodCart] = useState<CartItem[]>([]);

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
    setFoodCart(prev => prev.filter(item => item.id !== id));
  }, []);

  const updateFoodCartQuantity = useCallback(
    (id: string, quantity: number) => {
      if (quantity <= 0) {
        removeFromFoodCart(id);
        return;
      }
      setFoodCart(prev => prev.map(item => (item.id === id ? {...item, quantity} : item)));
    },
    [removeFromFoodCart],
  );

  const updateFoodCartItem = useCallback((id: string, updates: Partial<CartItem>) => {
    setFoodCart(prev => prev.map(item => (item.id === id ? {...item, ...updates} : item)));
  }, []);

  const clearFoodCart = useCallback(() => setFoodCart([]), []);

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
