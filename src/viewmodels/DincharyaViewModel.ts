import {useMemo, useState} from 'react';
import {isAxiosError} from 'axios';
import {keepPreviousData, useQuery, useQueryClient} from '@tanstack/react-query';
import {dincharyaRepository} from '../repositories/dincharya.repository';
import {useAuth} from '../store/AuthContext';
import {getApiErrorMessage} from '../utils/errorHandler';
import {DINCHARYA_ROW_TYPE} from '../models/dincharya.model';
import type {GuestDincharya} from '../models/dincharya.model';

type DincharyaResult = GuestDincharya & {
  /** The hotel does not offer My Day (no Clinical module / switched off). */
  unavailable?: boolean;
};

const EMPTY: DincharyaResult = {day: null, publishedDates: []};

/**
 * My Day (Dincharya) ViewModel — the guest's published daily wellness rhythm.
 *
 * `date` starts empty on purpose: the server opens on the best day (today if
 * published, else the next published one). Once the guest picks a date we ask
 * for that one; the previous day stays on screen while it loads.
 *
 * Not errors, by design:
 *   - 404 / nothing published → the "Nothing scheduled yet" empty state
 *   - 403 MODULE_DISABLED     → "not available at this hotel"; the profile is
 *     refetched too, so the dashboard drops the tile it should not have shown
 */
export function useDincharyaViewModel() {
  const {hotel} = useAuth();
  const hotelId = hotel?._id;
  const queryClient = useQueryClient();
  const [date, setDate] = useState('');

  const query = useQuery<DincharyaResult>({
    queryKey: ['dincharya', 'guest', date],
    enabled: Boolean(hotelId),
    placeholderData: keepPreviousData,
    queryFn: async () => {
      try {
        return await dincharyaRepository.getMine(hotelId as string, date || undefined);
      } catch (error) {
        if (isAxiosError(error)) {
          if (error.response?.status === 404) {
            return EMPTY;
          }
          if ((error.response?.data as {type?: string} | undefined)?.type === 'MODULE_DISABLED') {
            void queryClient.invalidateQueries({queryKey: ['customer', 'profile']});
            return {...EMPTY, unavailable: true};
          }
        }
        throw error;
      }
    },
  });

  const data = query.data ?? EMPTY;
  const day = data.day;
  const rows = useMemo(() => day?.rows ?? [], [day]);

  // "Today at a glance" — how many of each kind of row the day holds.
  const counts = useMemo(() => {
    const tally = {meals: 0, therapies: 0, hydration: 0, rituals: 0};
    rows.forEach(row => {
      if (row.type === DINCHARYA_ROW_TYPE.MEAL) {
        tally.meals += 1;
      } else if (row.type === DINCHARYA_ROW_TYPE.THERAPY) {
        tally.therapies += 1;
      } else if (row.type === DINCHARYA_ROW_TYPE.HYDRATION) {
        tally.hydration += 1;
      } else {
        tally.rituals += 1;
      }
    });
    return tally;
  }, [rows]);

  return {
    day,
    rows,
    counts,
    publishedDates: data.publishedDates,
    // What the server actually served — it may differ from the date asked for.
    activeDate: day?.date ?? '',
    selectDate: setDate,
    unavailable: Boolean(data.unavailable),
    isEmpty: !query.isLoading && !query.isError && !data.unavailable && rows.length === 0,
    // A hotel-less session has nothing to fetch: fall through to the empty state.
    isLoading: Boolean(hotelId) && query.isLoading,
    isFetching: query.isFetching,
    error: query.isError ? getApiErrorMessage(query.error, 'Could not load your day.') : null,
    refetch: query.refetch,
  };
}
