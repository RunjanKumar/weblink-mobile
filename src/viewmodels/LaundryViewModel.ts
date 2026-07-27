import {useCallback, useMemo, useState} from 'react';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {laundryRepository} from '../repositories/laundry.repository';
import {useAuth} from '../store/AuthContext';
import {getApiErrorMessage} from '../utils/errorHandler';
import type {LaundryBasketLine, LaundryItem} from '../models/laundry.model';

/**
 * Laundry rate-list ViewModel. Holds the basket (itemId → {serviceType, qty})
 * locally and submits it as one order. Totals are a preview only — the backend
 * recomputes and only posts to the folio when staff mark the order DELIVERED.
 */
export function useLaundryViewModel() {
  const {hotel} = useAuth();
  const hotelId = hotel?._id;
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['laundry', 'rateList', hotelId],
    queryFn: () => laundryRepository.getRateList(hotelId as string),
    enabled: Boolean(hotelId),
  });

  const items = useMemo(() => query.data ?? [], [query.data]);
  const [basket, setBasket] = useState<Record<string, LaundryBasketLine>>({});
  const [isExpress, setIsExpress] = useState(false);
  const [notes, setNotes] = useState('');

  const rateFor = useCallback(
    (item: LaundryItem, serviceType: string) =>
      (item.rates ?? []).find(r => r.serviceType === serviceType)?.rate ?? 0,
    [],
  );

  const addItem = useCallback((item: LaundryItem) => {
    setBasket(prev => {
      if (prev[item._id]) {
        return prev;
      }
      const first = item.rates?.[0]?.serviceType;
      if (!first) {
        return prev;
      }
      return {...prev, [item._id]: {serviceType: first, qty: 1}};
    });
  }, []);

  const removeItem = useCallback((itemId: string) => {
    setBasket(prev => {
      const {[itemId]: _removed, ...rest} = prev;
      return rest;
    });
  }, []);

  const setQty = useCallback((itemId: string, qty: number) => {
    const safeQty = Math.max(0, Math.round(Number(qty) || 0));
    setBasket(prev => {
      const line = prev[itemId];
      if (!line) {
        return prev;
      }
      if (safeQty === 0) {
        const {[itemId]: _removed, ...rest} = prev;
        return rest;
      }
      return {...prev, [itemId]: {...line, qty: safeQty}};
    });
  }, []);

  const setServiceType = useCallback((itemId: string, serviceType: string) => {
    setBasket(prev => {
      const line = prev[itemId];
      return line ? {...prev, [itemId]: {...line, serviceType}} : prev;
    });
  }, []);

  const summary = useMemo(() => {
    const lines = Object.entries(basket)
      .map(([itemId, line]) => {
        const item = items.find(i => i._id === itemId);
        if (!item) {
          return null;
        }
        const unitRate = rateFor(item, line.serviceType);
        return {
          itemId,
          name: item.name,
          serviceType: line.serviceType,
          qty: line.qty,
          unitRate,
          amount: unitRate * line.qty,
        };
      })
      .filter((l): l is NonNullable<typeof l> => l !== null);

    const subTotal = lines.reduce((sum, l) => sum + l.amount, 0);
    const taxPercentage = Number(hotel?.bookedRoomTax || 0);
    const taxAmount = (subTotal * taxPercentage) / 100;

    return {
      lines,
      pieceCount: lines.reduce((sum, l) => sum + l.qty, 0),
      subTotal,
      taxPercentage,
      taxAmount,
      totalAmount: subTotal + taxAmount,
    };
  }, [basket, items, hotel, rateFor]);

  const mutation = useMutation({
    mutationFn: () =>
      laundryRepository.createOrder({
        hotelId: hotelId as string,
        items: summary.lines.map(l => ({
          itemId: l.itemId,
          serviceType: l.serviceType,
          qty: l.qty,
        })),
        isExpress,
        notes,
      }),
    onSuccess: () => {
      setBasket({});
      setNotes('');
      setIsExpress(false);
      void queryClient.invalidateQueries({queryKey: ['laundry', 'orders']});
    },
  });

  const submit = useCallback(() => {
    if (!hotelId) {
      return Promise.reject(new Error('No active stay found for laundry.'));
    }
    if (summary.lines.length === 0) {
      return Promise.reject(new Error('Add at least one item to request a pickup.'));
    }
    return mutation.mutateAsync();
  }, [hotelId, summary.lines.length, mutation]);

  return {
    items,
    isLoading: query.isLoading,
    error: query.isError ? getApiErrorMessage(query.error, 'Failed to load the laundry rate list.') : null,
    refetch: query.refetch,
    basket,
    addItem,
    removeItem,
    setQty,
    setServiceType,
    rateFor,
    isExpress,
    setIsExpress,
    notes,
    setNotes,
    summary,
    submit,
    isSubmitting: mutation.isPending,
  };
}
