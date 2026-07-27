import {useEffect, useMemo, useState} from 'react';
import {useQuery} from '@tanstack/react-query';
import {facilityRepository} from '../repositories/facility.repository';
import {getApiErrorMessage} from '../utils/errorHandler';

/**
 * Facilities list ViewModel. Top-level categories become tabs; the active
 * category's `types[]` become the cards.
 */
export function useFacilitiesViewModel() {
  const query = useQuery({
    queryKey: ['facilities', 'categories'],
    queryFn: () => facilityRepository.getCategories(),
  });

  const categories = useMemo(() => query.data ?? [], [query.data]);
  const [activeType, setActiveType] = useState<string | null>(null);

  // Auto-select the first tab once data loads.
  useEffect(() => {
    if (categories.length > 0) {
      setActiveType(prev => prev ?? categories[0]!._id);
    }
  }, [categories]);

  const facilityTypes = useMemo(
    () => categories.map(cat => ({id: cat._id, label: cat.name ?? '', imageUrl: cat.imageUrl ?? ''})),
    [categories],
  );

  const activeCategory = useMemo(
    () => categories.find(cat => cat._id === activeType) ?? null,
    [categories, activeType],
  );

  return {
    categories,
    facilityTypes,
    activeType,
    activeCategory,
    facilities: activeCategory?.types ?? [],
    isLoading: query.isLoading,
    error: query.isError ? getApiErrorMessage(query.error, 'Failed to load facilities.') : null,
    refetch: query.refetch,
    setActiveType,
  };
}
