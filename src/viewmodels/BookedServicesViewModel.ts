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

  return {
    groups,
    isEmpty: data.length === 0,
    isLoading: query.isLoading,
    isRefetching: query.isRefetching,
    error: query.isError ? getApiErrorMessage(query.error) : null,
    refetch: query.refetch,
  };
}
