import {useCallback, useEffect, useMemo, useState} from 'react';
import {useQuery} from '@tanstack/react-query';
import {foodRepository} from '../repositories/food.repository';
import {useAuth} from '../store/AuthContext';
import {openRazorpay} from '../services/paymentService';
import {BOOKING_STATUS} from '../constants/status';
import {TRANSACTION_STATUS} from '../constants/food';
import {getApiErrorMessage} from '../utils/errorHandler';
import {getDisplayName} from '../models/user.model';
import type {FoodOrder} from '../models/food.model';

/**
 * Order history ViewModel: fetch orders, poll every 30s while any order is active,
 * and allow paying/retrying online (Razorpay) for pending/failed payments.
 */
export function useOrderHistoryViewModel() {
  const {user, hotel} = useAuth();
  const query = useQuery({
    queryKey: ['food', 'orders'],
    queryFn: () => foodRepository.getOrders(),
  });
  const orders = useMemo(() => query.data ?? [], [query.data]);
  const [payingOrderId, setPayingOrderId] = useState<string | null>(null);

  // Poll every 30s while there are active orders and no payment in flight.
  useEffect(() => {
    const hasActive = orders.some(
      o => o.status === BOOKING_STATUS.PENDING || o.status === BOOKING_STATUS.IN_PROGRESS,
    );
    if (!hasActive || payingOrderId) {
      return undefined;
    }
    const id = setInterval(() => {
      void query.refetch();
    }, 30000);
    return () => clearInterval(id);
  }, [orders, payingOrderId, query]);

  const canPayOnline = useCallback((order: FoodOrder) => {
    const paymentNotDone =
      order.paymentStatus === TRANSACTION_STATUS.PENDING ||
      order.paymentStatus === TRANSACTION_STATUS.FAILED;
    const active = order.status === BOOKING_STATUS.PENDING || order.status === BOOKING_STATUS.IN_PROGRESS;
    return paymentNotDone && active;
  }, []);

  const payOnline = useCallback(
    async (order: FoodOrder) => {
      if (payingOrderId) {
        return;
      }
      setPayingOrderId(order._id);
      try {
        const pay = await foodRepository.initiatePayment(order._id);
        if (!pay.razorpayOrderId || !pay.razorpayKey) {
          throw new Error('Failed to initiate payment.');
        }
        try {
          const result = await openRazorpay({
            key: pay.razorpayKey,
            amount: pay.amount ?? 0,
            currency: pay.currency ?? 'INR',
            order_id: pay.razorpayOrderId,
            name: hotel?.name || 'Hotel Food Order',
            description: `Order #${order._id.slice(-6).toUpperCase()}`,
            prefill: {
              name: getDisplayName(user),
              contact: user?.phoneNumber ?? '',
              email: user?.email ?? '',
            },
            theme: {color: '#facc15'},
          });
          await foodRepository.verifyPayment({
            foodOrderId: order._id,
            razorpayOrderId: result.razorpay_order_id,
            razorpayPaymentId: result.razorpay_payment_id,
            razorpaySignature: result.razorpay_signature,
          });
        } catch {
          // Cancelled/failed — refresh will reflect the real status.
        }
        await query.refetch();
      } finally {
        setPayingOrderId(null);
      }
    },
    [payingOrderId, hotel, user, query],
  );

  return {
    orders,
    isLoading: query.isLoading,
    isRefetching: query.isRefetching,
    error: query.isError ? getApiErrorMessage(query.error, 'Failed to load orders.') : null,
    refetch: query.refetch,
    canPayOnline,
    payOnline,
    payingOrderId,
  };
}
