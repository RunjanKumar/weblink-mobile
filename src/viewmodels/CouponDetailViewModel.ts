import {useQuery} from '@tanstack/react-query';
import {foodRepository} from '../repositories/food.repository';
import {getApiErrorMessage} from '../utils/errorHandler';

/** Fetches full coupon detail (offer + the foods it applies to) by id. */
export function useCouponDetailViewModel(couponId: string) {
  const query = useQuery({
    queryKey: ['coupon', couponId],
    queryFn: () => foodRepository.getCoupon(couponId),
    enabled: Boolean(couponId),
  });

  return {
    coupon: query.data ?? null,
    isLoading: query.isLoading,
    error: query.isError ? getApiErrorMessage(query.error, 'Failed to load the offer.') : null,
    refetch: query.refetch,
  };
}
