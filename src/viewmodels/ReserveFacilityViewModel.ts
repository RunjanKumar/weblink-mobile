import {useState} from 'react';
import {useMutation, useQueryClient} from '@tanstack/react-query';
import {facilityRepository} from '../repositories/facility.repository';
import type {FacilityType} from '../models/facility.model';

export const PEOPLE_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 10, 12, 15, 20];

/**
 * Reserve-a-facility form ViewModel. Holds the chosen date-time + guest count and
 * submits the reservation (payload derived from the facility type).
 */
export function useReserveFacilityViewModel(facility: FacilityType) {
  const queryClient = useQueryClient();
  const [bookingDate, setBookingDate] = useState<Date | null>(null);
  const [numberOfPeople, setNumberOfPeople] = useState<number | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      facilityRepository.reserve({
        facilityId: facility.facilityId,
        facilityTypeId: facility._id,
        bookingDate: (bookingDate as Date).toISOString(),
        numberOfGuests: numberOfPeople as number,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({queryKey: ['facilities', 'reservations']});
    },
  });

  const submit = () => {
    if (!bookingDate) {
      return Promise.reject(new Error('Please select a date and time.'));
    }
    if (!numberOfPeople) {
      return Promise.reject(new Error('Please select the number of guests.'));
    }
    return mutation.mutateAsync();
  };

  return {
    bookingDate,
    setBookingDate,
    numberOfPeople,
    setNumberOfPeople,
    peopleOptions: PEOPLE_OPTIONS,
    submit,
    isSubmitting: mutation.isPending,
  };
}
