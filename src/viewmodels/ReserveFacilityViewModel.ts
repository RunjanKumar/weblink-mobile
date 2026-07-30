import {useState} from 'react';
import {useMutation, useQueryClient} from '@tanstack/react-query';
import {facilityRepository} from '../repositories/facility.repository';
import {toast} from '../components/Toast';
import type {FacilityType} from '../models/facility.model';

/** Reference guest options (`reserveViewModel.js`). */
export const PEOPLE_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 10, 12, 15, 20];

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/**
 * The backend (and the web app's bookings list, which string-splits on 'T')
 * expects a NAIVE LOCAL "YYYY-MM-DDTHH:mm" — `toISOString()` shifts to UTC and
 * made mobile bookings show the wrong hour on the web (reference posts the raw
 * `<input type="datetime-local">` value).
 */
export function toLocalDateTimeString(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * Reserve-a-facility form ViewModel — reference `reserveViewModel.js`:
 * one combined date-time value + guest count; validation via toasts with the
 * reference strings; resolves `true` when the reservation was submitted.
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
        bookingDate: toLocalDateTimeString(bookingDate as Date),
        numberOfGuests: numberOfPeople as number,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({queryKey: ['facilities', 'reservations']});
    },
  });

  const submit = async (): Promise<boolean> => {
    if (!bookingDate) {
      toast.error('Please choose a date and a time.');
      return false;
    }
    if (!numberOfPeople) {
      toast.error('Please choose how many guests.');
      return false;
    }
    await mutation.mutateAsync();
    return true;
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
