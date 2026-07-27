import {useCallback, useMemo} from 'react';
import {useQuery} from '@tanstack/react-query';
import {serviceRepository} from '../repositories/service.repository';
import {useServiceRequest} from '../store/ServiceRequestContext';
import {BOOKING_STATUS} from '../constants/status';
import {getApiErrorMessage} from '../utils/errorHandler';

/**
 * Service catalog ViewModel. Loads categories + this guest's existing bookings so
 * already-requested (pending/in-progress) subcategories can be locked. Selection
 * state lives in the shared ServiceRequest cart.
 */
export function useServiceCatalogViewModel() {
  const categoriesQuery = useQuery({
    queryKey: ['services', 'categories'],
    queryFn: () => serviceRepository.getCategories(),
  });
  const bookedQuery = useQuery({
    queryKey: ['services', 'booked'],
    queryFn: () => serviceRepository.getBooked(),
  });

  const {isRequested, toggleRequest, hasRequested, count} = useServiceRequest();

  const bookedSubIds = useMemo(() => {
    const set = new Set<string>();
    (bookedQuery.data ?? []).forEach(item => {
      if (
        (item.status === BOOKING_STATUS.PENDING || item.status === BOOKING_STATUS.IN_PROGRESS) &&
        item.subCategoryId
      ) {
        set.add(item.subCategoryId);
      }
    });
    return set;
  }, [bookedQuery.data]);

  const isAlreadyBooked = useCallback((id: string) => bookedSubIds.has(id), [bookedSubIds]);

  return {
    categories: categoriesQuery.data ?? [],
    isLoading: categoriesQuery.isLoading,
    error: categoriesQuery.isError ? getApiErrorMessage(categoriesQuery.error) : null,
    refetch: () => {
      void categoriesQuery.refetch();
      void bookedQuery.refetch();
    },
    isRequested,
    toggleRequest,
    isAlreadyBooked,
    hasRequested,
    count,
  };
}
