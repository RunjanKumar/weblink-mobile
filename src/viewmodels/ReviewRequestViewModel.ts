import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {serviceRepository} from '../repositories/service.repository';
import {useServiceRequest} from '../store/ServiceRequestContext';
import {getApiErrorMessage} from '../utils/errorHandler';

/**
 * Review + submit ViewModel. Builds one booking payload per category from the
 * cart and posts them sequentially (the backend accepts one hotelFacilityId per
 * call), then clears the cart and refreshes the bookings list on success.
 */
export function useReviewRequestViewModel() {
  const queryClient = useQueryClient();
  const {getGrouped, getDetail, toggleRequest, clearAll} = useServiceRequest();

  const categoriesQuery = useQuery({
    queryKey: ['services', 'categories'],
    queryFn: () => serviceRepository.getCategories(),
  });

  const grouped = getGrouped(categoriesQuery.data ?? []);

  const mutation = useMutation({
    mutationFn: async () => {
      for (const cat of grouped) {
        await serviceRepository.book({
          hotelFacilityId: cat._id,
          subCategory: cat.subcategories.map(sub => ({
            subCategoryId: sub._id,
            description: getDetail(sub._id),
          })),
        });
      }
    },
    onSuccess: () => {
      clearAll();
      void queryClient.invalidateQueries({queryKey: ['services', 'booked']});
    },
  });

  return {
    grouped,
    isLoading: categoriesQuery.isLoading,
    remove: toggleRequest,
    getDetail,
    submit: mutation.mutateAsync,
    isSubmitting: mutation.isPending,
    submitError: mutation.isError ? getApiErrorMessage(mutation.error) : null,
  };
}
