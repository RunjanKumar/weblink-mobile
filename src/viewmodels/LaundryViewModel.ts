import {useCallback, useMemo} from 'react';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {laundryRepository} from '../repositories/laundry.repository';
import {useAuth} from '../store/AuthContext';
import {useLaundryBasket} from '../store/LaundryBasketContext';
import {getApiErrorMessage} from '../utils/errorHandler';
import type {LaundryBasketLine, LaundryItem, LaundryRate} from '../models/laundry.model';

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
  // Basket state lives ABOVE the navigator (see LaundryBasketContext): the TV
  // flow spans the rate list and the cart, and a `useState` here would give
  // each screen its own basket.
  const {basket, setBasket, isExpress, setIsExpress, notes, setNotes} = useLaundryBasket();

  const rateFor = useCallback(
    (item: LaundryItem, serviceType: string) =>
      (item.rates ?? []).find(r => r.serviceType === serviceType)?.rate ?? 0,
    [],
  );

  /**
   * The garment's headline service — its cheapest PRICED rate, which is what
   * the phone card has always advertised ("from ₹x") and what the TV card
   * prints. Adding used to take `rates[0]` instead, so a hotel that listed
   * dry-clean first quoted one price and charged another.
   *
   * Unpriced rows are filtered out BEFORE the reduce, not after: a row the
   * admin created but never priced is a 0, and 0 is always the minimum — it
   * would otherwise become the garment's billed service and put "₹0.00 / item"
   * on the tile. `undefined` here is what makes the screens hide a garment they
   * cannot quote.
   */
  const baseRateFor = useCallback((item: LaundryItem): LaundryRate | undefined => {
    const priced = (item.rates ?? []).filter(r => Number.isFinite(r.rate) && r.rate > 0);
    if (priced.length === 0) {
      return undefined;
    }
    return priced.reduce((cheapest, rate) => (rate.rate < cheapest.rate ? rate : cheapest));
  }, []);

  const addItem = useCallback(
    (item: LaundryItem) => {
      const base = baseRateFor(item);
      if (!base) {
        return;
      }
      setBasket(prev =>
        prev[item._id] ? prev : {...prev, [item._id]: {serviceType: base.serviceType, qty: 1}},
      );
    },
    [baseRateFor, setBasket],
  );

  const removeItem = useCallback(
    (itemId: string) => {
      setBasket(prev => {
        const {[itemId]: _removed, ...rest} = prev;
        return rest;
      });
    },
    [setBasket],
  );

  /** Empties the basket — the TV's "Clear All". */
  const clearBasket = useCallback(() => {
    setBasket({});
  }, [setBasket]);

  const setQty = useCallback(
    (itemId: string, qty: number) => {
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
    },
    [setBasket],
  );

  const setServiceType = useCallback(
    (itemId: string, serviceType: string) => {
      setBasket(prev => {
        const line = prev[itemId];
        if (!line) {
          return prev;
        }
        // The new base service must not ALSO sit in the extras, or the garment
        // would be billed for the same treatment twice.
        return {
          ...prev,
          [itemId]: {
            ...line,
            serviceType,
            extras: (line.extras ?? []).filter(s => s !== serviceType),
          },
        };
      });
    },
    [setBasket],
  );

  /**
   * The treatments offerable FOR ONE GARMENT: its own rates, minus the base
   * service that is already charged, priced from that garment's rate row.
   *
   * Per item rather than a global list because the rate list is per (garment,
   * service) — a blazer may offer dry-clean where a pair of socks does not, and
   * the same treatment costs differently on each.
   *
   * The excluded service is the one STORED ON THE LINE, not today's cheapest.
   * Those differ the moment the hotel reprices mid-basket, and pricing already
   * keys off the stored value — so keying the offered list off the live rates
   * instead would hide the checkbox for a treatment the guest is still being
   * charged for, leaving no way to untick it.
   */
  const servicesFor = useCallback(
    (item: LaundryItem): LaundryRate[] => {
      const billed = basket[item._id]?.serviceType ?? baseRateFor(item)?.serviceType;
      return (item.rates ?? [])
        .filter(rate => rate.serviceType !== billed && rate.rate > 0)
        .sort((a, b) => a.rate - b.rate);
    },
    [baseRateFor, basket],
  );

  /** Extra treatments currently ticked for one garment. */
  const servicesOf = useCallback(
    (itemId: string): string[] => basket[itemId]?.extras ?? [],
    [basket],
  );

  /** Tick / untick one treatment on one garment (no-op if it is not in the basket). */
  const toggleItemService = useCallback(
    (itemId: string, serviceType: string) => {
      setBasket(prev => {
        const line = prev[itemId];
        // Ticking the garment's OWN billed service would show a checked box
        // that bills nothing (pricing drops it), so refuse it outright.
        if (!line || serviceType === line.serviceType) {
          return prev;
        }
        const extras = line.extras ?? [];
        return {
          ...prev,
          [itemId]: {
            ...line,
            extras: extras.includes(serviceType)
              ? extras.filter(s => s !== serviceType)
              : [...extras, serviceType],
          },
        };
      });
    },
    [setBasket],
  );

  /** Replace a garment's whole line — used to undo a cancelled customise. */
  const restoreLine = useCallback(
    (itemId: string, line: LaundryBasketLine | undefined) => {
      setBasket(prev => {
        if (!line) {
          const {[itemId]: _removed, ...rest} = prev;
          return rest;
        }
        return {...prev, [itemId]: line};
      });
    },
    [setBasket],
  );

  const summary = useMemo(() => {
    const lines = Object.entries(basket)
      .map(([itemId, line]) => {
        const item = items.find(i => i._id === itemId);
        if (!item) {
          return null;
        }
        /**
         * The stored service can stop being priced under the guest — the rate
         * list refetches on the cart screen, and a hotel can withdraw a service
         * mid-basket. `rateFor` answers 0 for that, which would quote the
         * garment at ₹0 AND still submit it. So reprice onto whatever the
         * garment is offered at now, and drop it only if nothing is.
         */
        let serviceType = line.serviceType;
        let unitRate = rateFor(item, serviceType);
        if (unitRate <= 0) {
          const base = baseRateFor(item);
          if (!base) {
            return null;
          }
          serviceType = base.serviceType;
          unitRate = base.rate;
        }
        return {
          itemId,
          name: item.name,
          serviceType,
          qty: line.qty,
          unitRate,
          amount: unitRate * line.qty,
        };
      })
      .filter((l): l is NonNullable<typeof l> => l !== null);

    /**
     * One line per (garment × treatment ticked ON THAT GARMENT). A treatment
     * the garment has no rate for, or that IS its base service, is dropped —
     * the first cannot be priced, the second would bill the same work twice.
     */
    const extraLines = lines.flatMap(line => {
      const item = items.find(i => i._id === line.itemId);
      if (!item) {
        return [];
      }
      return (basket[line.itemId]?.extras ?? [])
        .filter(serviceType => serviceType !== line.serviceType)
        .map(serviceType => ({serviceType, unitRate: rateFor(item, serviceType)}))
        .filter(extra => extra.unitRate > 0)
        .map(extra => ({
          itemId: line.itemId,
          name: line.name,
          serviceType: extra.serviceType,
          qty: line.qty,
          unitRate: extra.unitRate,
          amount: extra.unitRate * line.qty,
        }));
    });

    const subTotal = lines.reduce((sum, l) => sum + l.amount, 0);
    const extrasTotal = extraLines.reduce((sum, l) => sum + l.amount, 0);
    const taxPercentage = Number(hotel?.bookedRoomTax || 0);
    const taxAmount = ((subTotal + extrasTotal) * taxPercentage) / 100;

    return {
      lines,
      extraLines,
      pieceCount: lines.reduce((sum, l) => sum + l.qty, 0),
      subTotal,
      extrasTotal,
      taxPercentage,
      taxAmount,
      totalAmount: subTotal + extrasTotal + taxAmount,
    };
  }, [basket, items, hotel, rateFor, baseRateFor]);

  /**
   * What one garment costs on its own — the Customize panel's running total.
   * Derived from `summary` so the panel and the basket can never disagree.
   */
  const itemTotal = useCallback(
    (itemId: string) => {
      const base = summary.lines.find(l => l.itemId === itemId);
      const extras = summary.extraLines.filter(l => l.itemId === itemId);
      return {
        base,
        extras,
        total: (base?.amount ?? 0) + extras.reduce((sum, l) => sum + l.amount, 0),
      };
    },
    [summary],
  );

  const mutation = useMutation({
    mutationFn: () =>
      laundryRepository.createOrder({
        hotelId: hotelId as string,
        // Base lines first, then one line per selected extra treatment. The
        // payload is a LIST of (itemId, serviceType, qty), so the same garment
        // legitimately appears twice when it is both washed and pressed.
        items: [...summary.lines, ...summary.extraLines].map(l => ({
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
    error: query.isError ? getApiErrorMessage(query.error, 'Could not load the laundry rate list.') : null,
    refetch: query.refetch,
    basket,
    addItem,
    removeItem,
    clearBasket,
    setQty,
    setServiceType,
    rateFor,
    baseRateFor,
    servicesFor,
    servicesOf,
    toggleItemService,
    restoreLine,
    itemTotal,
    isExpress,
    setIsExpress,
    notes,
    setNotes,
    summary,
    submit,
    isSubmitting: mutation.isPending,
  };
}
