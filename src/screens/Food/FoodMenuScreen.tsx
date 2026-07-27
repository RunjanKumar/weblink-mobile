import React from 'react';
import {Image, Pressable, ScrollView, Text, TextInput, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Button, ErrorState, Header, Loader} from '../../components';
import {useFoodMenuViewModel} from '../../viewmodels';
import {useFoodOrder} from '../../store/FoodOrderContext';
import {useTheme} from '../../theme';
import {getDiscountDisplayInfo} from '../../utils/discount';
import {DISCOUNT_TYPES} from '../../constants/food';
import type {Coupon, Food} from '../../models/food.model';
import type {HomeStackParamList} from '../../navigation/types';

function offerLabel(c: Coupon): string {
  if (c.discountType === DISCOUNT_TYPES.PERCENTAGE) {
    return `${c.discountValue ?? ''}% OFF`;
  }
  if (c.discountType === DISCOUNT_TYPES.AMOUNT) {
    return `₹${c.discountValue ?? ''} OFF`;
  }
  if (c.discountType === DISCOUNT_TYPES.BOGO) {
    return 'Buy 1 Get 1';
  }
  return 'Offer';
}

type Props = NativeStackScreenProps<HomeStackParamList, 'Food'>;

export function toCartItem(food: Food) {
  return {
    id: food._id,
    foodId: food._id,
    title: food.name,
    name: food.name,
    price: food.price,
    priceAfterDiscount: food.priceAfterDiscount,
    imageURL: food.imageURL,
    type: food.type,
    couponData: food.couponData,
  };
}

function VegDot({type}: {type?: number}) {
  const veg = type === 1;
  const color = veg ? '#22c55e' : '#ef4444';
  return (
    <View style={{width: 14, height: 14, borderWidth: 1.5, borderColor: color, borderRadius: 3, alignItems: 'center', justifyContent: 'center'}}>
      <View style={{width: 6, height: 6, borderRadius: 3, backgroundColor: color}} />
    </View>
  );
}

function FoodRow({food, onOpen, onAdd}: {food: Food; onOpen: () => void; onAdd: () => void}) {
  const {theme} = useTheme();
  const info = getDiscountDisplayInfo({
    price: food.price ?? 0,
    priceAfterDiscount: food.priceAfterDiscount,
    couponData: food.couponData,
  });
  const available = food.isAvailable !== false;
  return (
    <View className="flex-row border-b border-border py-3">
      <Pressable onPress={onOpen} focusable className="flex-1 pr-3" accessibilityRole="button">
        <View className="flex-row items-center" style={{gap: 6}}>
          <VegDot type={food.type} />
          <Text className="flex-1 text-sm font-bold text-content" numberOfLines={1}>
            {food.name}
          </Text>
        </View>
        <View className="mt-1 flex-row items-center" style={{gap: 6}}>
          <Text className="text-sm font-semibold text-primary">₹{info.displayPrice}</Text>
          {info.originalPrice != null ? (
            <Text className="text-xs text-content-tertiary line-through">₹{info.originalPrice}</Text>
          ) : null}
          {info.isBogo ? (
            <Text className="text-[10px] font-bold text-success">1+1 FREE</Text>
          ) : null}
        </View>
        {food.description ? (
          <Text className="mt-1 text-xs text-content-tertiary" numberOfLines={2}>
            {food.description}
          </Text>
        ) : null}
      </Pressable>
      <View className="w-24 items-center">
        {food.imageURL ? (
          <Image source={{uri: food.imageURL}} style={{width: 88, height: 72, borderRadius: 12}} />
        ) : (
          <View className="h-[72px] w-[88px] items-center justify-center rounded-xl bg-surface-elevated">
            <Icon name="fast-food-outline" size={26} color={theme.colors.muted} />
          </View>
        )}
        <View className="-mt-3">
          <Button label={available ? 'Add' : 'N/A'} size="sm" disabled={!available} onPress={onAdd} />
        </View>
      </View>
    </View>
  );
}

export function FoodMenuScreen({navigation}: Props) {
  const {theme} = useTheme();
  const vm = useFoodMenuViewModel();
  const {addToFoodCart} = useFoodOrder();

  const headerRight = (
    <View className="flex-row items-center" style={{gap: 8}}>
      <Pressable
        onPress={() => navigation.navigate('OrderHistory')}
        focusable
        accessibilityRole="button"
        accessibilityLabel="Order history"
        className="h-10 w-10 items-center justify-center rounded-full">
        <Icon name="receipt-outline" size={20} color={theme.colors.text} />
      </Pressable>
      <Pressable
        onPress={() => navigation.navigate('Cart')}
        focusable
        accessibilityRole="button"
        accessibilityLabel="Cart"
        className="h-10 w-10 items-center justify-center rounded-full bg-surface-elevated">
        <Icon name="cart-outline" size={20} color={theme.colors.primary} />
        {vm.cartCount > 0 ? (
          <View
            className="absolute -right-1 -top-1 h-5 min-w-[20px] items-center justify-center rounded-full px-1"
            style={{backgroundColor: theme.colors.primary}}>
            <Text style={{color: theme.colors.primaryForeground, fontSize: 10, fontWeight: '700'}}>
              {vm.cartCount}
            </Text>
          </View>
        ) : null}
      </Pressable>
    </View>
  );

  return (
    <SafeAreaView style={{flex: 1, backgroundColor: theme.colors.background}} edges={['top']}>
      <Header title="Food" onBack={() => navigation.goBack()} right={headerRight} />

      {vm.isLoading ? (
        <Loader label="Loading menu…" />
      ) : vm.error ? (
        <ErrorState message={vm.error} onRetry={vm.refetch} />
      ) : (
        <ScrollView contentContainerStyle={{paddingHorizontal: 20, paddingBottom: 24}}>
          <View
            className="mb-3 flex-row items-center rounded-xl bg-surface-elevated px-3"
            style={{borderWidth: 1, borderColor: theme.colors.border}}>
            <Icon name="search" size={18} color={theme.colors.muted} />
            <TextInput
              value={vm.search}
              onChangeText={vm.setSearch}
              placeholder="Search dishes…"
              placeholderTextColor={theme.colors.muted}
              className="ml-2 flex-1 text-base text-content"
              style={{paddingVertical: 10}}
            />
          </View>

          {vm.coupons.length > 0 ? (
            <View className="mb-4">
              <Text className="mb-2 text-base font-bold text-content">
                Special <Text className="text-primary">Offers</Text>
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {vm.coupons.map(c => (
                  <Pressable
                    key={c._id}
                    onPress={() => navigation.navigate('CouponDetail', {couponId: c._id})}
                    focusable
                    accessibilityRole="button"
                    accessibilityLabel={c.name ?? c.title ?? 'Offer'}
                    className="mr-3 w-56 overflow-hidden rounded-2xl bg-surface-elevated"
                    style={{borderWidth: 1, borderColor: theme.colors.border}}>
                    {c.image ? (
                      <Image source={{uri: c.image}} style={{width: '100%', height: 90}} />
                    ) : (
                      <View className="h-[90px] items-center justify-center bg-surface">
                        <Icon name="pricetags-outline" size={28} color={theme.colors.primary} />
                      </View>
                    )}
                    <View className="p-3">
                      <Text className="text-sm font-bold text-primary">{offerLabel(c)}</Text>
                      <Text className="text-xs text-content" numberOfLines={1}>
                        {c.name ?? c.title}
                      </Text>
                    </View>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          ) : null}

          {vm.categories.length === 0 ? (
            <Text className="mt-8 text-center text-sm text-content-tertiary">No dishes found.</Text>
          ) : (
            vm.categories.map(cat => (
              <View key={cat._id} className="mb-4">
                <Text className="mb-1 text-lg font-bold text-content">{cat.name}</Text>
                {(cat.foodsInCategories ?? []).map(food => (
                  <FoodRow
                    key={food._id}
                    food={food}
                    onOpen={() => navigation.navigate('FoodDetail', {food})}
                    onAdd={() => addToFoodCart(toCartItem(food))}
                  />
                ))}
              </View>
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
