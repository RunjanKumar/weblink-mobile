import {useAuth} from '../store/AuthContext';

/**
 * BookingScreen ViewModel (Phase 1 placeholder). Reads the current stay from the
 * authenticated session; Phase 2 will fetch full booking/folio details.
 */
export function useBookingViewModel() {
  const {session} = useAuth();
  return {
    booking: session?.booking ?? null,
    hotel: session?.hotel ?? null,
    room: session?.booking?.roomData ?? null,
  };
}
