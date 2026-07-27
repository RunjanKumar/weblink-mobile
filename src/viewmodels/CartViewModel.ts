import {useCallback, useMemo, useState} from 'react';
import {useFoodOrder} from '../store/FoodOrderContext';
import {useAuth} from '../store/AuthContext';
import {foodRepository} from '../repositories/food.repository';
import {openRazorpay} from '../services/paymentService';
import {getLineTotal} from '../utils/discount';
import {DISCOUNT_TYPES} from '../constants/food';
import {getApiErrorMessage} from '../utils/errorHandler';
import {getDisplayName} from '../models/user.model';
import type {CartItem, CouponValidateData} from '../models/food.model';

export type PaymentMethod = 'online' | 'cod';

/**
 * Cart ViewModel: bill math (with coupon/BOGO), coupon apply/remove, and order
 * placement (COD or Razorpay online). Ported from the web cart viewModel; the
 * `window.Razorpay` global is replaced by the native `openRazorpay` service.
 */
export function useCartViewModel() {
  const {
    foodCart,
    getCartUnitPrice,
    getFoodCartTotal,
    updateFoodCartQuantity,
    removeFromFoodCart,
    clearFoodCart,
  } = useFoodOrder();
  const {user, hotel, session} = useAuth();
  const roomNumber = session?.booking?.roomData?.roomNumber ?? null;

  const [couponCode, setCouponCode] = useState('');
  const [appliedCouponName, setAppliedCouponName] = useState('');
  const [couponResponse, setCouponResponse] = useState<CouponValidateData | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [paymentProcessing, setPaymentProcessing] = useState(false);

  const itemsTotal = getFoodCartTotal();
  const taxRate = Number(hotel?.bookedFoodOrderTax || 0);

  const summary = couponResponse?.summary;
  const backendFinalAmount = summary?.finalPayableAmount;
  const totalSavings = summary?.totalDiscount ?? 0;

  const subtotalForTax = backendFinalAmount != null ? backendFinalAmount : itemsTotal;
  const taxAmount = (subtotalForTax * taxRate) / 100;
  const payableAmount =
    backendFinalAmount != null ? backendFinalAmount + taxAmount : itemsTotal + (itemsTotal * taxRate) / 100;

  const itemCount = foodCart.reduce((count, item) => count + item.quantity, 0);

  const items = useMemo(
    () =>
      foodCart.map(item => ({
        ...item,
        unitPrice: getCartUnitPrice(item),
        // BOGO-aware so the row total matches getFoodCartTotal / payableAmount.
        lineTotal: getLineTotal({
          unitPrice: getCartUnitPrice(item),
          quantity: item.quantity,
          couponData: item.couponData,
        }),
      })),
    [foodCart, getCartUnitPrice],
  );

  const invalidateCoupon = useCallback(() => {
    setCouponResponse(null);
    setAppliedCouponName('');
  }, []);

  const increment = useCallback(
    (item: CartItem) => {
      const step = item.couponData?.discountType === DISCOUNT_TYPES.BOGO ? 2 : 1;
      updateFoodCartQuantity(item.id, item.quantity + step);
      invalidateCoupon();
    },
    [updateFoodCartQuantity, invalidateCoupon],
  );

  const decrement = useCallback(
    (item: CartItem) => {
      updateFoodCartQuantity(item.id, item.quantity - 1);
      invalidateCoupon();
    },
    [updateFoodCartQuantity, invalidateCoupon],
  );

  const remove = useCallback(
    (item: CartItem) => {
      removeFromFoodCart(item.id);
      invalidateCoupon();
    },
    [removeFromFoodCart, invalidateCoupon],
  );

  const onCouponChange = useCallback((raw: string) => {
    setCouponCode(raw.replace(/\s/g, '').toUpperCase());
    setAppliedCouponName('');
    setCouponResponse(null);
    setCouponError(null);
  }, []);

  const removeCoupon = useCallback(() => {
    setCouponCode('');
    setAppliedCouponName('');
    setCouponResponse(null);
    setCouponError(null);
  }, []);

  const applyCoupon = useCallback(async () => {
    const code = couponCode.trim();
    setCouponError(null);
    if (!code) {
      setCouponError('Please enter a coupon code.');
      return;
    }
    if (code.length < 5) {
      setCouponError('Coupon code must be at least 5 characters.');
      return;
    }
    const foodItems = foodCart
      .map(item => ({foodId: item.foodId || item.id, quantity: Number(item.quantity) || 1}))
      .filter(item => Boolean(item.foodId));
    if (foodItems.length === 0) {
      setCouponError('Add food items before applying a coupon.');
      return;
    }
    setIsApplyingCoupon(true);
    try {
      const {ok, message, data} = await foodRepository.validateCoupon(foodItems, code);
      if (!ok) {
        invalidateCoupon();
        setCouponError(message || 'Failed to apply coupon.');
        return;
      }
      setAppliedCouponName(code);
      setCouponResponse(data);
    } catch (error) {
      invalidateCoupon();
      setCouponError(getApiErrorMessage(error, 'Failed to apply coupon.'));
    } finally {
      setIsApplyingCoupon(false);
    }
  }, [couponCode, foodCart, invalidateCoupon]);

  /** Places the order. Resolves once the order exists (payment may be COD fallback). */
  const placeOrder = useCallback(
    async (method: PaymentMethod) => {
      if (foodCart.length === 0 || isPlacingOrder || paymentProcessing) {
        return;
      }
      setIsPlacingOrder(true);
      try {
        const foodItems = foodCart.map(item => ({
          foodId: item.foodId || item.id,
          quantity: Number(item.quantity) || 1,
          price: getCartUnitPrice(item),
        }));
        const orderId = await foodRepository.createOrder({
          hotelId: hotel?._id,
          foodItems,
          deliveryAddress: `Room ${roomNumber ?? 'N/A'}`,
          coupon: appliedCouponName || undefined,
        });

        if (method === 'cod') {
          clearFoodCart();
          return;
        }

        setPaymentProcessing(true);
        const pay = await foodRepository.initiatePayment(orderId);
        if (!pay.razorpayOrderId || !pay.razorpayKey) {
          throw new Error('Failed to initiate payment. Please try again.');
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
          await foodRepository.verifyPayment({
            foodOrderId: orderId,
            razorpayOrderId: result.razorpay_order_id,
            razorpayPaymentId: result.razorpay_payment_id,
            razorpaySignature: result.razorpay_signature,
          });
        } catch {
          // Cancelled or failed payment — the order already exists as COD.
        }
        clearFoodCart();
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
    couponError,
    isApplyingCoupon,
    isPlacingOrder,
    paymentProcessing,
    onCouponChange,
    applyCoupon,
    removeCoupon,
    increment,
    decrement,
    remove,
    placeOrder,
  };
}
