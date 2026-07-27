import {useMemo} from 'react';
import {useMutation, useQuery} from '@tanstack/react-query';
import {laundryRepository} from '../repositories/laundry.repository';
import {useAuth} from '../store/AuthContext';
import {LAUNDRY_TERMINAL_STATUSES} from '../constants/laundry';
import {getApiErrorMessage} from '../utils/errorHandler';
import type {LaundryOrder} from '../models/laundry.model';

/**
 * Laundry order history / tracker. Splits orders into active vs finished
 * (delivered/cancelled) and supports guest cancellation while REQUESTED.
 */
export function useLaundryOrdersViewModel() {
  const {hotel} = useAuth();
  const hotelId = hotel?._id;

  const query = useQuery({
    queryKey: ['laundry', 'orders', hotelId],
    queryFn: () => laundryRepository.getOrders(hotelId as string),
    enabled: Boolean(hotelId),
  });

  const orders = useMemo(() => query.data ?? [], [query.data]);

  const {active, past} = useMemo(() => {
    const isTerminal = (o: LaundryOrder) => LAUNDRY_TERMINAL_STATUSES.includes(o.status ?? '');
    return {
      active: orders.filter(o => !isTerminal(o)),
      past: orders.filter(isTerminal),
    };
  }, [orders]);

  const cancelMutation = useMutation({
    mutationFn: (order: LaundryOrder) =>
      laundryRepository.cancelOrder(order._id, hotelId as string),
    onSuccess: () => query.refetch(),
  });

  return {
    active,
    past,
    isEmpty: orders.length === 0,
    isLoading: query.isLoading,
    isRefetching: query.isRefetching,
    error: query.isError ? getApiErrorMessage(query.error, 'Failed to load your laundry orders.') : null,
    refetch: query.refetch,
    cancelOrder: (order: LaundryOrder) => cancelMutation.mutateAsync(order),
    cancellingId: cancelMutation.isPending ? cancelMutation.variables?._id ?? null : null,
  };
}
