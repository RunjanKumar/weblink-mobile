import {useMemo} from 'react';
import {useQuery} from '@tanstack/react-query';
import {facilityRepository} from '../repositories/facility.repository';
import {FACILITY_BOOKING_STATUS} from '../constants/status';
import {getApiErrorMessage} from '../utils/errorHandler';

export interface FacilityReservationCounts {
  /** Every reservation, whatever its status. */
  all: number;
  /** Keyed by `FACILITY_BOOKING_STATUS`; an empty status counts 0, not absent. */
  byStatus: Record<number, number>;
}

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

  /**
   * Everything, newest first — the TV frame is a HISTORY, so unlike "upcoming
   * events" it has to show the cancelled and declined ones too. Sorted here so
   * both readings of the same data agree on what "latest" means.
   *
   * `bookingDate` is a naive local string; comparing them lexically orders them
   * correctly and avoids `Date`'s timezone shift (see `formatBookingDateTime`).
   */
  const all = useMemo(
    () =>
      [...(query.data ?? [])].sort((a, b) =>
        (b.bookingDate ?? '').localeCompare(a.bookingDate ?? ''),
      ),
    [query.data],
  );

  const counts = useMemo<FacilityReservationCounts>(() => {
    const byStatus: Record<number, number> = {
      [FACILITY_BOOKING_STATUS.PENDING]: 0,
      [FACILITY_BOOKING_STATUS.APPROVED]: 0,
      [FACILITY_BOOKING_STATUS.DISAPPROVED]: 0,
      [FACILITY_BOOKING_STATUS.CANCELLED]: 0,
    };
    for (const {status} of all) {
      const current = status == null ? undefined : byStatus[status];
      if (status != null && current != null) {
        byStatus[status] = current + 1;
      }
    }
    return {all: all.length, byStatus};
  }, [all]);

  return {
    reservations,
    all,
    counts,
    isEmpty: reservations.length === 0,
    /** True when the guest has never reserved anything, cancelled ones included. */
    hasNone: all.length === 0,
    isLoading: query.isLoading,
    isRefetching: query.isRefetching,
    error: query.isError ? getApiErrorMessage(query.error, 'Could not load your reservations.') : null,
    refetch: query.refetch,
  };
}
