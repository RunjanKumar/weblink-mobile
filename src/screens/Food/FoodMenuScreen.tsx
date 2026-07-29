import React, {useMemo, useState} from 'react';
import {Pressable, ScrollView, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {ErrorState, Header, Loader} from '../../components';
import {useFoodMenuViewModel} from '../../viewmodels';
import {useTheme} from '../../theme';
import {useScrollSpy} from '../../hooks/useScrollSpy';
import {useTVFocus} from '../../hooks/useTVFocus';
import {IS_TV} from '../../utils/responsive';
import {CategoryTabs} from './components/CategoryTabs';
import {FoodCard} from './components/FoodCard';
import {FoodCartButton, CART_BAR_CLEARANCE} from './components/FoodCartButton';
import {OfferSlider} from './components/OfferSlider';
import {SearchBar} from './components/SearchBar';
import {toCartItem} from './foodCart';
import type {Food, FoodCategory} from '../../models/food.model';
import type {HomeStackParamList} from '../../navigation/types';

// Re-export for FoodDetail/CouponDetail (moved to ./foodCart).
export {toCartItem};

type Props = NativeStackScreenProps<HomeStackParamList, 'Food'>;

const GRID_COLUMNS = 3;

function chunk<T>(items: T[], size: number): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    rows.push(items.slice(i, i + size));
  }
  return rows;
}

/**
 * Food menu — reference `food.jsx` structure: Header → SearchBar →
 * OfferSlider → sticky CategoryTabs → sectioned list → fixed FoodCartButton.
 * Search focus enters "Search Results" mode (slider/tabs hidden, spy off).
 * Phone renders the reference row cards; TV renders a 3-column image grid.
 */
export function FoodMenuScreen({navigation, route}: Props) {
  const {theme} = useTheme();
  const {
    focused: historyFocused,
    onFocus: onHistoryFocus,
    onBlur: onHistoryBlur,
  } = useTVFocus();
  const vm = useFoodMenuViewModel();
  const [searchFocused, setSearchFocused] = useState(false);

  const searchMode = searchFocused || vm.search.trim().length > 0;
  const sections = vm.categories; // already search-filtered, empties dropped
  const spy = useScrollSpy(sections.length);

  // Quick-call deep link (reference: navigate('/food', {state:{foodCategoryId}})
  // scrolls to that category once the menu is loaded).
  const deepLinkId = route.params?.foodCategoryId;
  const deepLinkedRef = React.useRef(false);
  React.useEffect(() => {
    if (!deepLinkId || deepLinkedRef.current || sections.length === 0) {
      return;
    }
    const index = sections.findIndex(cat => cat._id === deepLinkId);
    if (index >= 0) {
      deepLinkedRef.current = true;
      // Let section onLayout offsets land first.
      const timer = setTimeout(() => spy.scrollToSection(index), 300);
      return () => clearTimeout(timer);
    }
  }, [deepLinkId, sections, spy]);

  const tabCategories = useMemo(
    () => sections.map(cat => ({id: cat._id, name: cat.name ?? 'Category'})),
    [sections],
  );

  const openFood = (food: Food) => navigation.navigate('FoodDetail', {food});

  const renderSectionFoods = (cat: FoodCategory) => {
    const foods = cat.foodsInCategories ?? [];
    if (!IS_TV) {
      return (
        <View style={{gap: 16}}>
          {foods.map(food => (
            <FoodCard key={food._id} food={food} variant="row" onOpen={() => openFood(food)} />
          ))}
        </View>
      );
    }
    return (
      <View style={{gap: 16}}>
        {chunk(foods, GRID_COLUMNS).map((row, rowIndex) => (
          <View key={rowIndex} className="flex-row" style={{gap: 16}}>
            {row.map(food => (
              <FoodCard key={food._id} food={food} variant="grid" onOpen={() => openFood(food)} />
            ))}
            {/* Pad the last row so cards keep equal widths. */}
            {row.length < GRID_COLUMNS
              ? Array.from({length: GRID_COLUMNS - row.length}).map((_, i) => (
                  <View key={`pad-${i}`} style={{flex: 1}} />
                ))
              : null}
          </View>
        ))}
      </View>
    );
  };

  const headerRight = (
    <Pressable
      onPress={() => navigation.navigate('OrderHistory')}
      onFocus={onHistoryFocus}
      onBlur={onHistoryBlur}
      focusable
      accessibilityRole="button"
      accessibilityLabel="Order history"
      className="h-10 w-10 items-center justify-center rounded-full"
      style={{
        borderWidth: 2,
        borderColor: historyFocused ? theme.colors.focusRing : 'transparent',
      }}>
      <Icon name="receipt-outline" size={20} color={theme.colors.text} />
    </Pressable>
  );

  // Tab root: no back target when Food is opened from the bottom bar.
  const onBack = navigation.canGoBack() ? () => navigation.goBack() : undefined;

  if (vm.isLoading) {
    return (
      <SafeAreaView style={{flex: 1, backgroundColor: theme.colors.background}} edges={['top']}>
        <Header title="Food" onBack={onBack} right={headerRight} />
        <Loader label="Loading menu…" />
      </SafeAreaView>
    );
  }
  if (vm.error) {
    return (
      <SafeAreaView style={{flex: 1, backgroundColor: theme.colors.background}} edges={['top']}>
        <Header title="Food" onBack={onBack} right={headerRight} />
        <ErrorState message={vm.error} onRetry={vm.refetch} />
      </SafeAreaView>
    );
  }

  const sectionViews = sections.map((cat, index) => (
    <View
      key={cat._id}
      onLayout={spy.registerSection(index)}
      style={{paddingHorizontal: 20, marginBottom: 32}}>
      <Text
        style={{
          color: theme.colors.text,
          fontSize: IS_TV ? 24 : 18,
          fontWeight: '700',
          marginBottom: 16,
          paddingTop: 8,
        }}>
        {cat.name}
      </Text>
      {renderSectionFoods(cat)}
    </View>
  ));

  const emptyState = (
    <Text
      style={{
        marginTop: 48,
        textAlign: 'center',
        color: theme.colors.muted,
        fontSize: 14,
        paddingVertical: 48,
      }}>
      {vm.search.trim() ? 'No food items found' : 'No food available'}
    </Text>
  );

  return (
    <SafeAreaView style={{flex: 1, backgroundColor: theme.colors.background}} edges={['top']}>
      <Header title="Food" onBack={onBack} right={headerRight} />
      <View style={{flex: 1}}>
        <ScrollView
          ref={spy.scrollRef}
          onScroll={searchMode ? undefined : spy.onScroll}
          onMomentumScrollEnd={spy.onMomentumScrollEnd}
          scrollEventThrottle={16}
          stickyHeaderIndices={searchMode ? undefined : [2]}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{paddingBottom: CART_BAR_CLEARANCE + 24}}>
          {/* [0] search */}
          <View style={{paddingHorizontal: 20, marginTop: 8, marginBottom: searchMode ? 0 : 8}}>
            <SearchBar
              value={vm.search}
              onChangeText={vm.setSearch}
              focused={searchFocused}
              onFocusChange={setSearchFocused}
            />
          </View>

          {searchMode ? (
            /* [1] search-results heading */
            <Text
              style={{
                color: theme.colors.text,
                fontSize: IS_TV ? 26 : 22,
                fontWeight: '600',
                paddingHorizontal: 20,
                marginTop: 24,
                marginBottom: 20,
              }}>
              Search Results
            </Text>
          ) : (
            /* [1] offers */
            <View style={{paddingHorizontal: 20}}>
              <OfferSlider
                coupons={vm.coupons}
                onOpen={coupon => navigation.navigate('CouponDetail', {couponId: coupon._id})}
              />
            </View>
          )}

          {!searchMode ? (
            /* [2] sticky category tabs */
            <CategoryTabs
              categories={tabCategories}
              activeIndex={spy.activeIndex}
              onSelect={spy.scrollToSection}
            />
          ) : null}

          {sections.length === 0 ? emptyState : sectionViews}
        </ScrollView>

        <FoodCartButton onPress={() => navigation.navigate('Cart')} />
      </View>
    </SafeAreaView>
  );
}
