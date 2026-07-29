import React from 'react';
import {ScrollView, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {AppImage, Button, Card, ErrorState, Header, Loader} from '../../components';
import {AddButton} from './components/AddButton';
import {useCouponDetailViewModel} from '../../viewmodels';
import {useTheme} from '../../theme';
import {DISCOUNT_TYPES} from '../../constants/food';
import type {Coupon} from '../../models/food.model';
import type {HomeStackParamList} from '../../navigation/types';

type Props = NativeStackScreenProps<HomeStackParamList, 'CouponDetail'>;

function offerLabel(c: Coupon): string {
  if (c.discountType === DISCOUNT_TYPES.PERCENTAGE) {
    return `${c.discountValue ?? ''}% OFF`;
  }
  if (c.discountType === DISCOUNT_TYPES.AMOUNT) {
    return `₹${c.discountValue ?? ''} OFF`;
  }
  if (c.discountType === DISCOUNT_TYPES.BOGO) {
    return 'Buy 1 Get 1 Free';
  }
  return 'Special offer';
}

export function CouponDetailScreen({navigation, route}: Props) {
  const {theme} = useTheme();
  const vm = useCouponDetailViewModel(route.params.couponId);

  return (
    <SafeAreaView style={{flex: 1, backgroundColor: theme.colors.background}} edges={['top']}>
      <Header title="Offer" onBack={() => navigation.goBack()} />

      {vm.isLoading ? (
        <Loader label="Loading offer…" />
      ) : vm.error || !vm.coupon ? (
        <ErrorState message={vm.error ?? 'Offer not found.'} onRetry={vm.refetch} />
      ) : (
        <ScrollView contentContainerStyle={{paddingBottom: 24}}>
          <AppImage
            src={vm.coupon.image}
            fallbackIcon="pricetags"
            fallbackIconSize={44}
            style={{width: '100%', height: vm.coupon.image ? 180 : 140}}
            resizeMode="cover"
          />

          <View className="px-5 pt-4">
            <View className="self-start rounded-full bg-surface-elevated px-3 py-1.5">
              <Text className="text-sm font-bold text-primary">{offerLabel(vm.coupon)}</Text>
            </View>
            <Text className="mt-2 text-xl font-bold text-content">
              {vm.coupon.name ?? vm.coupon.title}
            </Text>
            {vm.coupon.description ? (
              <Text className="mt-1 text-sm text-content-secondary">{vm.coupon.description}</Text>
            ) : null}

            {vm.coupon.applicableItemsData && vm.coupon.applicableItemsData.length > 0 ? (
              <View className="mt-5">
                <Text className="mb-2 text-sm font-semibold text-content">Applicable dishes</Text>
                {vm.coupon.applicableItemsData.map(food => {
                  // The reference web app dropped couponData here, so offer
                  // items were carted at FULL price. Fix: fall back to the
                  // coupon's own discount info so pricing + BOGO stepping work.
                  const patched = {
                    ...food,
                    couponData:
                      food.couponData ??
                      (vm.coupon?.discountType != null
                        ? {
                            discountType: vm.coupon.discountType,
                            discountValue: vm.coupon.discountValue,
                            name: vm.coupon.name,
                          }
                        : undefined),
                  };
                  return (
                    <Card key={food._id} className="mb-2 flex-row items-center justify-between">
                      <View className="flex-1 pr-3">
                        <Text className="text-sm font-medium text-content">{food.name}</Text>
                        <View className="mt-0.5 flex-row items-center" style={{gap: 6}}>
                          <Text className="text-sm font-semibold text-primary">
                            ₹{food.priceAfterDiscount ?? food.price}
                          </Text>
                          {food.priceAfterDiscount != null && food.price != null && food.priceAfterDiscount < food.price ? (
                            <Text className="text-xs text-content-tertiary line-through">₹{food.price}</Text>
                          ) : null}
                        </View>
                      </View>
                      <AddButton item={patched} />
                    </Card>
                  );
                })}
              </View>
            ) : null}

            <View className="mt-6">
              <Button label="Browse full menu" variant="ghost" onPress={() => navigation.navigate('Food')} fullWidth />
            </View>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
