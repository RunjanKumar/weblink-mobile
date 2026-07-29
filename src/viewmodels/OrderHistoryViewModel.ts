import {useCallback, useMemo, useState} from 'react';
import {useQuery} from '@tanstack/react-query';
import {useIsFocused} from '@react-navigation/native';
import {foodRepository} from '../repositories/food.repository';
import {useAuth} from '../store/AuthContext';
import {openRazorpay} from '../services/paymentService';
import {toast} from '../components/Toast';
import {IS_TV} from '../utils/responsive';
import {BOOKING_STATUS} from '../constants/status';
import {TRANSACTION_STATUS} from '../constants/food';
import {getApiErrorMessage} from '../utils/errorHandler';
import {getDisplayName} from '../models/user.model';
import type {FoodOrder} from '../models/food.model';

/**
 * Order history ViewModel — reference `orderHistoryViewModel.js`:
 * fetch orders, poll every 30 s while any order is active (React Query
 * `refetchInterval`, gated on screen focus so a backgrounded screen stops
 * polling), and pay/retry online for pending/failed payments.
 *
 * TV: `canPayOnline` is always false — Razorpay's checkout iframe cannot be
 * driven by a remote, so the CTA must never render there.
 */
export function useOrderHistoryViewModel() {
  const {user, hotel} = useAuth();
  const isFocused = useIsFocused();
  const [payingOrderId, setPayingOrderId] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ['food', 'orders'],
    queryFn: () => foodRepository.getOrders(),
    refetchInterval: queryState => {
      if (!isFocused || payingOrderId) {
        return false;
      }
      const hasActive = (queryState.state.data ?? []).some(
        o => o.status === BOOKING_STATUS.PENDING || o.status === BOOKING_STATUS.IN_PROGRESS,
      );
      return hasActive ? 30000 : false;
    },
  });
  const orders = useMemo(() => query.data ?? [], [query.data]);

  const hasPendingPayment = useMemo(
    () => !IS_TV && orders.some(o => canPay(o)),
    [orders],
  );

  const canPayOnline = useCallback((order: FoodOrder) => !IS_TV && canPay(order), []);

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
          toast.success('Payment successful! 🎉');
        } catch (error) {
          toast.error(getApiErrorMessage(error, 'Payment was not completed.'));
        }
        await query.refetch();
      } catch (error) {
        toast.error(getApiErrorMessage(error, 'Failed to initiate payment.'));
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
    hasPendingPayment,
    canPayOnline,
    payOnline,
    payingOrderId,
  };
}

function canPay(order: FoodOrder): boolean {
  const paymentNotDone =
    order.paymentStatus === TRANSACTION_STATUS.PENDING ||
    order.paymentStatus === TRANSACTION_STATUS.FAILED;
  const active =
    order.status === BOOKING_STATUS.PENDING || order.status === BOOKING_STATUS.IN_PROGRESS;
  return paymentNotDone && active;
}
