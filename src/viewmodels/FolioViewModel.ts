import {useMemo} from 'react';
import {isAxiosError} from 'axios';
import {useQuery} from '@tanstack/react-query';
import {folioRepository} from '../repositories/folio.repository';
import {useAuth} from '../store/AuthContext';
import {getApiErrorMessage} from '../utils/errorHandler';
import type {GuestFolio} from '../models/folio.model';

/**
 * View Bill ViewModel.
 *
 * 404 (DATA_NOT_FOUND / "No active stay") is NOT an error — the spec requires
 * the empty "No bill yet" state for it, so the queryFn maps it to null instead
 * of throwing. 401/400 are left to the global axios handling (session reset);
 * anything else surfaces as a retryable error.
 */
export function useFolioViewModel() {
  const {hotel} = useAuth();
  const hotelId = hotel?._id;

  const query = useQuery<GuestFolio | null>({
    queryKey: ['folio', 'guest'],
    enabled: Boolean(hotelId),
    queryFn: async () => {
      try {
        return await folioRepository.getGuestFolio(hotelId as string);
      } catch (error) {
        if (isAxiosError(error) && error.response?.status === 404) {
          return null; // no active stay — empty state, never an error screen
        }
        throw error;
      }
    },
  });

  const folio = query.data ?? null;

  // API order is not guaranteed — spec says sort by createdAt ascending.
  const charges = useMemo(
    () =>
      [...(folio?.charges ?? [])].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      ),
    [folio],
  );

  const payments = folio?.payments ?? [];
  const isEmpty = !query.isLoading && !query.isError && (!folio || (charges.length === 0 && payments.length === 0));

  return {
    folio,
    charges,
    payments,
    isEmpty,
    isLoading: query.isLoading,
    isRefetching: query.isRefetching,
    error: query.isError ? getApiErrorMessage(query.error, 'Could not load your bill.') : null,
    refetch: query.refetch,
  };
}
