import React, {createContext, useContext, useEffect, useMemo, useState} from 'react';
import {useAuth} from './AuthContext';
import type {LaundryBasketLine} from '../models/laundry.model';

interface LaundryBasketValue {
  /** itemId → {serviceType, qty, extras}. */
  basket: Record<string, LaundryBasketLine>;
  setBasket: React.Dispatch<React.SetStateAction<Record<string, LaundryBasketLine>>>;
  isExpress: boolean;
  setIsExpress: (value: boolean) => void;
  notes: string;
  setNotes: (value: string) => void;
}

const LaundryBasketContext = createContext<LaundryBasketValue | undefined>(undefined);

/**
 * The laundry basket, lifted out of `useLaundryViewModel`.
 *
 * It has to live above the navigator because the TV flow spans TWO screens —
 * the rate list and the cart it proceeds to. A `useState` inside the ViewModel
 * gives each screen its OWN basket, so the cart would open empty no matter what
 * the guest had just picked. (The phone never noticed: it does everything on
 * one screen.)
 *
 * Deliberately NOT persisted, unlike the food cart. A laundry basket is a
 * five-second decision made in front of the wardrobe; restoring yesterday's
 * half-filled basket after a webOS reload would be a surprise, not a courtesy.
 * It does clear on sign-out, so the next guest never inherits one.
 */
export function LaundryBasketProvider({children}: {children: React.ReactNode}) {
  const [basket, setBasket] = useState<Record<string, LaundryBasketLine>>({});
  const [isExpress, setIsExpress] = useState(false);
  const [notes, setNotes] = useState('');
  const {status: authStatus} = useAuth();

  useEffect(() => {
    if (authStatus === 'unauthenticated') {
      setBasket({});
      setIsExpress(false);
      setNotes('');
    }
  }, [authStatus]);

  const value = useMemo<LaundryBasketValue>(
    () => ({basket, setBasket, isExpress, setIsExpress, notes, setNotes}),
    [basket, isExpress, notes],
  );

  return <LaundryBasketContext.Provider value={value}>{children}</LaundryBasketContext.Provider>;
}

export function useLaundryBasket(): LaundryBasketValue {
  const ctx = useContext(LaundryBasketContext);
  if (!ctx) {
    throw new Error('useLaundryBasket must be used within a <LaundryBasketProvider>');
  }
  return ctx;
}
