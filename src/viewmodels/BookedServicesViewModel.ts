import {useMemo} from 'react';
import {useQuery} from '@tanstack/react-query';
import {serviceRepository} from '../repositories/service.repository';
import {BOOKING_STATUS} from '../constants/status';
import {getApiErrorMessage} from '../utils/errorHandler';
import type {BookedService} from '../models/service.model';

export interface BookedServiceGroup {
  key: string;
  title: string;
  items: BookedService[];
}

export interface BookedServiceCounts {
  /** Every request, whatever its status. */
  all: number;
  /** Keyed by `BOOKING_STATUS`; a status with nothing in it counts 0, not absent. */
  byStatus: Record<number, number>;
}

export function useBookedServicesViewModel() {
  const query = useQuery({
    queryKey: ['services', 'booked'],
    queryFn: () => serviceRepository.getBooked(),
  });

  const data = useMemo(() => query.data ?? [], [query.data]);

  const groups = useMemo<BookedServiceGroup[]>(() => {
    const by = (status: number) => data.filter(d => d.status === status);
    return [
      {key: 'pending', title: 'Pending', items: by(BOOKING_STATUS.PENDING)},
      {key: 'inProgress', title: 'In Progress', items: by(BOOKING_STATUS.IN_PROGRESS)},
      {key: 'completed', title: 'Completed', items: by(BOOKING_STATUS.COMPLETED)},
      {key: 'cancelled', title: 'Cancelled', items: by(BOOKING_STATUS.CANCEL)},
    ].filter(g => g.items.length > 0);
  }, [data]);

  /**
   * One newest-first list, for the TV frame's status TABS (the phone stacks the
   * groups instead). Sorted here rather than in the screen so both readings of
   * the same data agree on what "latest" means.
   */
  const all = useMemo(
    () =>
      [...data].sort(
        (a, b) => new Date(b.requestedAt ?? 0).getTime() - new Date(a.requestedAt ?? 0).getTime(),
      ),
    [data],
  );

  /** Tab counts, including the statuses with nothing in them. */
  const counts = useMemo<BookedServiceCounts>(() => {
    const byStatus: Record<number, number> = {
      [BOOKING_STATUS.PENDING]: 0,
      [BOOKING_STATUS.IN_PROGRESS]: 0,
      [BOOKING_STATUS.COMPLETED]: 0,
      [BOOKING_STATUS.CANCEL]: 0,
    };
    for (const {status} of data) {
      // An unknown status is counted in `all` but has no tab to land in.
      const current = status == null ? undefined : byStatus[status];
      if (status != null && current != null) {
        byStatus[status] = current + 1;
      }
    }
    return {all: data.length, byStatus};
  }, [data]);

  return {
    groups,
    all,
    counts,
    isEmpty: data.length === 0,
    isLoading: query.isLoading,
    isRefetching: query.isRefetching,
    error: query.isError ? getApiErrorMessage(query.error) : null,
    refetch: query.refetch,
  };
}
