import {useCallback} from 'react';
import {Linking} from 'react-native';
import {useQuery} from '@tanstack/react-query';
import {customerRepository} from '../repositories/customer.repository';
import {roomRepository} from '../repositories/room.repository';
import {REDIRECT_TYPES} from '../constants/roomControl';
import {getApiErrorMessage} from '../utils/errorHandler';
import {logger} from '../services/logger';
import type {QuickCall} from '../models/device.model';

/**
 * Dashboard ViewModel: guest profile + quick-call shortcuts, and the quick-call
 * press behavior (dial a number, or hand a food shortcut back to the caller,
 * since navigation lives in the view).
 */
export function useDashboardViewModel() {
  const profileQuery = useQuery({
    queryKey: ['customer', 'profile'],
    queryFn: () => customerRepository.getProfile(),
  });
  const quickCallsQuery = useQuery({
    queryKey: ['room', 'quickCalls'],
    queryFn: () => roomRepository.getQuickCalls(),
  });

  const profile = profileQuery.data ?? null;
  const room = profile?.bookRoomData?.[0]?.roomData;

  const onQuickCallPress = useCallback(
    async (item: QuickCall, onFood?: (foodCategoryId?: string) => void) => {
      if (item.redirectTypes === REDIRECT_TYPES.CALL && item.supportNumber) {
        const url = `tel:${item.supportNumber}`;
        try {
          const supported = await Linking.canOpenURL(url);
          if (supported) {
            await Linking.openURL(url);
          }
        } catch (error) {
          logger.warn('dashboard', 'Failed to open dialer', error);
        }
      } else if (item.redirectTypes === REDIRECT_TYPES.FOOD_MANAGEMENT) {
        onFood?.(item.foodCategoryId);
      }
    },
    [],
  );

  return {
    user: profile?.user ?? null,
    hotel: profile?.hotelData ?? null,
    roomNumber: room?.roomNumber ?? null,
    quickCalls: quickCallsQuery.data ?? [],
    isLoading: profileQuery.isLoading,
    isRefetching: profileQuery.isRefetching || quickCallsQuery.isRefetching,
    error: profileQuery.isError ? getApiErrorMessage(profileQuery.error) : null,
    refetch: () => {
      void profileQuery.refetch();
      void quickCallsQuery.refetch();
    },
    onQuickCallPress,
  };
}
