import {useCallback, useMemo, useState} from 'react';
import {useFoodOrder} from '../store/FoodOrderContext';
import {useAuth} from '../store/AuthContext';
import {foodRepository} from '../repositories/food.repository';
import {openRazorpay} from '../services/paymentService';
import {toast} from '../components/Toast';
import {getLineTotal} from '../utils/discount';
import {DISCOUNT_TYPES} from '../constants/food';
import {getApiErrorMessage} from '../utils/errorHandler';
import {getDisplayName} from '../models/user.model';
import type {CartItem, CouponItem} from '../models/food.model';

export type PaymentMethod = 'online' | 'cod';

/**
 * Cart ViewModel — the reference web `cartViewModel.js`, adapted:
 *  - applied-coupon state lives in FoodOrderContext (any cart mutation
 *    anywhere invalidates it atomically);
 *  - bill math matches the reference exactly: tax base = backend
 *    `summary.finalPayableAmount` when a coupon is applied, else the local
 *    discount-aware items total;
 *  - all feedback via toasts (reference strings verbatim) — never Alert;
 *  - Razorpay failures surface visibly; the order survives as COD.
 */
export function useCartViewModel() {
  const {
    foodCart,
    getCartUnitPrice,
    getFoodCartTotal,
    updateFoodCartQuantity,
    removeFromFoodCart,
    clearFoodCart,
    appliedCoupon,
    setAppliedCoupon,
  } = useFoodOrder();
  const {user, hotel, session} = useAuth();
  const roomNumber = session?.booking?.roomData?.roomNumber ?? null;

  const [couponCode, setCouponCode] = useState('');
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [paymentProcessing, setPaymentProcessing] = useState(false);

  const itemsTotal = getFoodCartTotal();
  const taxRate = Number(hotel?.bookedFoodOrderTax || 0);

  const couponResponse = appliedCoupon?.response ?? null;
  const appliedCouponName = appliedCoupon?.name ?? '';
  const summary = couponResponse?.summary;
  const backendFinalAmount = summary?.finalPayableAmount;
  const totalSavings = summary?.totalDiscount ?? 0;

  const subtotalForTax = backendFinalAmount != null ? backendFinalAmount : itemsTotal;
  const taxAmount = (subtotalForTax * taxRate) / 100;
  const payableAmount =
    backendFinalAmount != null ? backendFinalAmount + taxAmount : itemsTotal + (itemsTotal * taxRate) / 100;

  const itemCount = foodCart.reduce((count, item) => count + item.quantity, 0);

  // Merge backend per-line coupon results (couponResponse.items) into cart
  // rows so line totals show the server-priced amount when a coupon applies.
  const couponItemMap = useMemo(() => {
    const map = new Map<string, CouponItem>();
    for (const ci of couponResponse?.items ?? []) {
      if (ci.foodId) {
        map.set(ci.foodId, ci);
      }
    }
    return map;
  }, [couponResponse]);

  const items = useMemo(
    () =>
      foodCart.map(item => {
        const couponItem = couponItemMap.get(item.foodId ?? item.id) ?? null;
        const baseLineTotal = getLineTotal({
          unitPrice: getCartUnitPrice(item),
          quantity: item.quantity,
          couponData: item.couponData,
        });
        return {
          ...item,
          unitPrice: getCartUnitPrice(item),
          // Backend finalPrice is already a LINE total (reference semantics).
          lineTotal: couponItem?.finalPrice != null ? Math.round(couponItem.finalPrice) : baseLineTotal,
          couponItem,
        };
      }),
    [foodCart, getCartUnitPrice, couponItemMap],
  );

  const increment = useCallback(
    (item: CartItem) => {
      const step = item.couponData?.discountType === DISCOUNT_TYPES.BOGO ? 2 : 1;
      updateFoodCartQuantity(item.id, item.quantity + step); // context invalidates coupon
    },
    [updateFoodCartQuantity],
  );

  const decrement = useCallback(
    (item: CartItem) => {
      updateFoodCartQuantity(item.id, item.quantity - 1);
    },
    [updateFoodCartQuantity],
  );

  const remove = useCallback(
    (item: CartItem) => {
      removeFromFoodCart(item.id);
    },
    [removeFromFoodCart],
  );

  const onCouponChange = useCallback(
    (raw: string) => {
      // Reference: strip whitespace, uppercase, and typing clears any applied coupon.
      setCouponCode(raw.replace(/\s/g, '').toUpperCase());
      setAppliedCoupon(null);
    },
    [setAppliedCoupon],
  );

  const removeCoupon = useCallback(() => {
    setCouponCode('');
    setAppliedCoupon(null);
    toast.success('Coupon removed.');
  }, [setAppliedCoupon]);

  const applyCoupon = useCallback(async () => {
    const code = couponCode.trim();
    if (!code) {
      toast.error('Please enter a coupon code.');
      return;
    }
    if (code.length < 5) {
      toast.error('Coupon code must be 5 characters.');
      return;
    }
    const foodItems = foodCart
      .map(item => ({foodId: item.foodId || item.id, quantity: Number(item.quantity) || 1}))
      .filter(item => Boolean(item.foodId));
    if (foodItems.length === 0) {
      toast.error('Please add food items before applying a coupon.');
      return;
    }
    setIsApplyingCoupon(true);
    try {
      const {ok, message, data} = await foodRepository.validateCoupon(foodItems, code);
      if (!ok || !data) {
        setAppliedCoupon(null);
        toast.error(message || 'Could not apply that coupon.');
        return;
      }
      setAppliedCoupon({name: code, response: data});
      toast.success(
        message || `Coupon applied — you save ₹${data.summary?.totalDiscount ?? 0}.`,
      );
    } catch (error) {
      setAppliedCoupon(null);
      toast.error(getApiErrorMessage(error, 'Could not apply that coupon.'));
    } finally {
      setIsApplyingCoupon(false);
    }
  }, [couponCode, foodCart, setAppliedCoupon]);

  /**
   * Places the order. Resolves `true` once the order EXISTS (payment may fall
   * back to COD); `false` when a guard blocked it — the caller must not show
   * a success toast or navigate in that case.
   */
  const placeOrder = useCallback(
    async (method: PaymentMethod): Promise<boolean> => {
      if (foodCart.length === 0) {
        toast.error('Your cart is empty.');
        return false;
      }
      if (isPlacingOrder || paymentProcessing) {
        return false;
      }
      if (!hotel?._id || roomNumber == null) {
        // Never post "Room N/A" (reference bug class) — this is a broken session.
        toast.error('Your room details are missing. Please log in again.');
        return false;
      }
      // Read BEFORE createOrder: context clears the coupon when the cart clears.
      const coupon = appliedCouponName || undefined;
      setIsPlacingOrder(true);
      try {
        const foodItems = foodCart.map(item => ({
          foodId: item.foodId || item.id,
          quantity: Number(item.quantity) || 1,
          price: getCartUnitPrice(item),
        }));
        const orderId = await foodRepository.createOrder({
          hotelId: hotel._id,
          foodItems,
          deliveryAddress: `Room ${roomNumber}`,
          coupon,
        });

        if (method === 'cod') {
          clearFoodCart();
          return true;
        }

        setPaymentProcessing(true);
        const pay = await foodRepository.initiatePayment(orderId);
        if (!pay.razorpayOrderId || !pay.razorpayKey) {
          throw new Error('Could not start the payment. Please try again.');
        }
        setPaymentProcessing(false);

        try {
          const result = await openRazorpay({
            key: pay.razorpayKey,
            amount: pay.amount ?? 0,
            currency: pay.currency ?? 'INR',
            order_id: pay.razorpayOrderId,
            name: hotel?.name || 'Hotel Food Order',
            description: `Order #${orderId.slice(-6).toUpperCase()}`,
            prefill: {
              name: getDisplayName(user),
              contact: user?.phoneNumber ?? '',
              email: user?.email ?? '',
            },
            theme: {color: '#facc15'},
          });
          setPaymentProcessing(true);
          await foodRepository.verifyPayment({
            foodOrderId: orderId,
            razorpayOrderId: result.razorpay_order_id,
            razorpayPaymentId: result.razorpay_payment_id,
            razorpaySignature: result.razorpay_signature,
          });
          toast.success('Your payment has been confirmed.');
        } catch (error) {
          // Cancelled / failed payment — the order survives as COD (backend
          // creates every order COD-first). Reference behavior + strings.
          toast.info('Order placed as Cash on Delivery.', {duration: 5000});
        }
        clearFoodCart();
        return true;
      } finally {
        setIsPlacingOrder(false);
        setPaymentProcessing(false);
      }
    },
    [
      foodCart,
      isPlacingOrder,
      paymentProcessing,
      getCartUnitPrice,
      hotel,
      roomNumber,
      appliedCouponName,
      clearFoodCart,
      user,
    ],
  );

  return {
    items,
    itemCount,
    itemsTotal,
    taxRate,
    taxAmount,
    payableAmount,
    totalSavings,
    couponCode,
    appliedCouponName,
    couponResponse,
    isApplyingCoupon,
    isPlacingOrder,
    paymentProcessing,
    roomNumber,
    guestName: getDisplayName(user),
    guestPhone: user?.phoneNumber ?? '',
    onCouponChange,
    applyCoupon,
    removeCoupon,
    increment,
    decrement,
    remove,
    placeOrder,
  };
}
