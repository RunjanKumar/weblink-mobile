import {useMemo, useState} from 'react';
import {useQuery} from '@tanstack/react-query';
import {foodRepository} from '../repositories/food.repository';
import {useFoodOrder} from '../store/FoodOrderContext';
import {getApiErrorMessage} from '../utils/errorHandler';

/** Food menu ViewModel: categories + client-side search + live cart count. */
export function useFoodMenuViewModel() {
  const query = useQuery({
    queryKey: ['food', 'categories'],
    queryFn: () => foodRepository.getCategoriesWithOffers(),
  });
  const [search, setSearch] = useState('');
  const {getFoodCartCount} = useFoodOrder();

  // `Array.isArray` (not just `??`) because a non-array from the API would make
  // the screen call `.map` on a non-array and hard-crash the app.
  const categories = useMemo(() => {
    const value = query.data?.categories;
    return Array.isArray(value) ? value : [];
  }, [query.data]);
  const coupons = useMemo(() => {
    const value = query.data?.coupons;
    return Array.isArray(value) ? value : [];
  }, [query.data]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) {
      // Reference always drops empty categories (foodListViewModel.js) — an
      // empty section would still get a tab + a bare heading otherwise.
      return categories.filter(cat => (cat.foodsInCategories ?? []).length > 0);
    }
    return categories
      .map(cat => ({
        ...cat,
        foodsInCategories: (Array.isArray(cat.foodsInCategories)
          ? cat.foodsInCategories
          : []
        ).filter(
          f =>
            (f.name ?? '').toLowerCase().includes(q) ||
            (f.description ?? '').toLowerCase().includes(q),
        ),
      }))
      .filter(cat => (cat.foodsInCategories ?? []).length > 0);
  }, [categories, search]);

  return {
    categories: filtered,
    coupons: search.trim() ? [] : coupons,
    isLoading: query.isLoading,
    error: query.isError ? getApiErrorMessage(query.error, 'Failed to load the menu.') : null,
    refetch: query.refetch,
    search,
    setSearch,
    cartCount: getFoodCartCount(),
  };
}
