import {useMemo} from 'react';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {facilityRepository} from '../repositories/facility.repository';
import {toLocalDateTimeString} from './ReserveFacilityViewModel';
import {getApiErrorMessage} from '../utils/errorHandler';
import type {FacilityCategory, FacilityType} from '../models/facility.model';

export interface FacilityRow {
  facility: FacilityType;
  category: FacilityCategory;
}

/**
 * The TV availability frame's ViewModel: every facility the hotel lists, flat,
 * plus the reservation call.
 *
 * WHY NOT `useReserveFacilityViewModel`: that one is a FORM — it holds the date
 * and guest count in its own state and is constructed around a single facility.
 * This frame lets the guest walk a list and rebuild the whole draft each time
 * they land on a different facility, so the screen owns the form state and hands
 * the values in at submit time. The date encoding (`toLocalDateTimeString`) and
 * the cache key it invalidates are shared, so a TV reservation and a phone one
 * are the same request.
 *
 * Same query key as `useFacilitiesViewModel`, so moving between the frames costs
 * no extra fetch.
 */
export function useFacilityScheduleViewModel() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ['facilities', 'categories'],
    queryFn: () => facilityRepository.getCategories(),
  });

  const categories = useMemo(() => query.data ?? [], [query.data]);

  const rows = useMemo<FacilityRow[]>(
    () =>
      categories.flatMap(category =>
        (category.types ?? []).map(facility => ({facility, category})),
      ),
    [categories],
  );

  const mutation = useMutation({
    mutationFn: (input: {facility: FacilityType; bookingDate: Date; numberOfGuests: number}) =>
      facilityRepository.reserve({
        facilityId: input.facility.facilityId,
        facilityTypeId: input.facility._id,
        bookingDate: toLocalDateTimeString(input.bookingDate),
        numberOfGuests: input.numberOfGuests,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({queryKey: ['facilities', 'reservations']});
    },
  });

  return {
    categories,
    rows,
    isLoading: query.isLoading,
    isRefetching: query.isRefetching,
    error: query.isError ? getApiErrorMessage(query.error, 'Could not load the facilities.') : null,
    refetch: query.refetch,
    reserve: (facility: FacilityType, bookingDate: Date, numberOfGuests: number) =>
      mutation.mutateAsync({facility, bookingDate, numberOfGuests}),
    isSubmitting: mutation.isPending,
  };
}
