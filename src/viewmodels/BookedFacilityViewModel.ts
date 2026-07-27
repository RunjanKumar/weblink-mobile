import {useMemo} from 'react';
import {useQuery} from '@tanstack/react-query';
import {facilityRepository} from '../repositories/facility.repository';
import {FACILITY_BOOKING_STATUS} from '../constants/status';
import {getApiErrorMessage} from '../utils/errorHandler';
import type {FacilityReservation} from '../models/facility.model';

export interface FacilityReservationGroup {
  key: string;
  title: string;
  items: FacilityReservation[];
}

export function useBookedFacilityViewModel() {
  const query = useQuery({
    queryKey: ['facilities', 'reservations'],
    queryFn: () => facilityRepository.getReservations(),
  });

  const reservations = useMemo(() => query.data ?? [], [query.data]);

  const groups = useMemo<FacilityReservationGroup[]>(() => {
    const by = (status: number) => reservations.filter(r => r.status === status);
    return [
      {key: 'pending', title: 'Pending', items: by(FACILITY_BOOKING_STATUS.PENDING)},
      {key: 'approved', title: 'Confirmed', items: by(FACILITY_BOOKING_STATUS.APPROVED)},
      {key: 'disapproved', title: 'Disapproved', items: by(FACILITY_BOOKING_STATUS.DISAPPROVED)},
      {key: 'cancelled', title: 'Cancelled', items: by(FACILITY_BOOKING_STATUS.CANCELLED)},
    ].filter(g => g.items.length > 0);
  }, [reservations]);

  return {
    groups,
    isEmpty: reservations.length === 0,
    isLoading: query.isLoading,
    isRefetching: query.isRefetching,
    error: query.isError ? getApiErrorMessage(query.error, 'Failed to load reservations.') : null,
    refetch: query.refetch,
  };
}
