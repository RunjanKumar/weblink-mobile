import React, {createContext, useCallback, useContext, useMemo, useState} from 'react';
import type {GroupedServiceCategory, ServiceCategory} from '../models/service.model';

interface ServiceRequestValue {
  /** Set of currently-requested subcategory ids. */
  requested: Set<string>;
  count: number;
  hasRequested: boolean;
  isRequested: (id: string) => boolean;
  toggleRequest: (id: string) => void;
  getDetail: (id: string) => string;
  setDetail: (id: string, text: string) => void;
  /** Reduce categories to only their requested subcategories (drops empties). */
  getGrouped: (categories: ServiceCategory[]) => GroupedServiceCategory[];
  clearAll: () => void;
}

const ServiceRequestContext = createContext<ServiceRequestValue | undefined>(undefined);

/**
 * In-memory "request cart" shared across the Services flow (catalog → review →
 * add-details). Mirrors the web ServiceRequestContext. Un-requesting an item also
 * drops its per-item note.
 */
export function ServiceRequestProvider({children}: {children: React.ReactNode}) {
  const [requested, setRequested] = useState<Set<string>>(() => new Set());
  const [details, setDetails] = useState<Record<string, string>>({});

  const toggleRequest = useCallback((id: string) => {
    setRequested(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
    // Removing an item also clears its note; adding leaves details untouched
    // (the id won't be present yet, so this is a no-op on add).
    setDetails(prev => {
      if (!(id in prev)) {
        return prev;
      }
      const {[id]: _removed, ...rest} = prev;
      return rest;
    });
  }, []);

  const setDetail = useCallback((id: string, text: string) => {
    setDetails(prev => ({...prev, [id]: text}));
  }, []);

  const getDetail = useCallback((id: string) => details[id] ?? '', [details]);

  const isRequested = useCallback((id: string) => requested.has(id), [requested]);

  const getGrouped = useCallback(
    (categories: ServiceCategory[]): GroupedServiceCategory[] =>
      categories
        .map(cat => ({
          _id: cat._id,
          name: cat.name,
          subcategories: (cat.subCategoriesIds ?? []).filter(s => requested.has(s._id)),
        }))
        .filter(cat => cat.subcategories.length > 0),
    [requested],
  );

  const clearAll = useCallback(() => {
    setRequested(new Set());
    setDetails({});
  }, []);

  const value = useMemo<ServiceRequestValue>(
    () => ({
      requested,
      count: requested.size,
      hasRequested: requested.size > 0,
      isRequested,
      toggleRequest,
      getDetail,
      setDetail,
      getGrouped,
      clearAll,
    }),
    [requested, isRequested, toggleRequest, getDetail, setDetail, getGrouped, clearAll],
  );

  return <ServiceRequestContext.Provider value={value}>{children}</ServiceRequestContext.Provider>;
}

export function useServiceRequest(): ServiceRequestValue {
  const ctx = useContext(ServiceRequestContext);
  if (!ctx) {
    throw new Error('useServiceRequest must be used within a <ServiceRequestProvider>');
  }
  return ctx;
}
