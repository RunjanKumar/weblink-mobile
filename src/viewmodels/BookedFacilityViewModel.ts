import {useMemo} from 'react';
import {useQuery} from '@tanstack/react-query';
import {facilityRepository} from '../repositories/facility.repository';
import {FACILITY_BOOKING_STATUS} from '../constants/status';
import {getApiErrorMessage} from '../utils/errorHandler';

/**
 * "Upcoming events" ViewModel — reference `bookedFacilityViewModel.js`:
 * ONE flat merged list (pending + approved + disapproved), CANCELLED excluded,
 * no section grouping.
 */
export function useBookedFacilityViewModel() {
  const query = useQuery({
    queryKey: ['facilities', 'reservations'],
    queryFn: () => facilityRepository.getReservations(),
  });

  const reservations = useMemo(
    () => (query.data ?? []).filter(r => r.status !== FACILITY_BOOKING_STATUS.CANCELLED),
    [query.data],
  );

  return {
    reservations,
    isEmpty: reservations.length === 0,
    isLoading: query.isLoading,
    isRefetching: query.isRefetching,
    error: query.isError ? getApiErrorMessage(query.error, 'Failed to load reservations.') : null,
    refetch: query.refetch,
  };
}
