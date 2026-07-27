import React from 'react';
import {Image, ScrollView, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Button, Card, Header} from '../../components';
import {toCartItem} from './FoodMenuScreen';
import {useFoodOrder} from '../../store/FoodOrderContext';
import {useTheme} from '../../theme';
import {getDiscountDisplayInfo} from '../../utils/discount';
import type {AddOn} from '../../models/food.model';
import type {HomeStackParamList} from '../../navigation/types';

type Props = NativeStackScreenProps<HomeStackParamList, 'FoodDetail'>;

function addOnToCartItem(addOn: AddOn, parentTitle?: string) {
  return {
    id: addOn._id,
    foodId: addOn._id,
    title: addOn.name,
    name: addOn.name,
    price: addOn.price,
    priceAfterDiscount: addOn.priceAfterDiscount,
    imageURL: addOn.imageURL,
    type: addOn.type,
    couponData: addOn.couponData,
    isAddOn: true,
    parentFoodTitle: parentTitle,
  };
}

export function FoodDetailScreen({navigation, route}: Props) {
  const {theme} = useTheme();
  const {food} = route.params;
  const {addToFoodCart} = useFoodOrder();

  const info = getDiscountDisplayInfo({
    price: food.price ?? 0,
    priceAfterDiscount: food.priceAfterDiscount,
    couponData: food.couponData,
  });
  const addOns = food.choiceOfAddOnDetails ?? [];

  return (
    <SafeAreaView style={{flex: 1, backgroundColor: theme.colors.background}} edges={['top', 'bottom']}>
      <Header title={food.name ?? 'Dish'} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{paddingBottom: 24}}>
        {food.imageURL ? (
          <Image source={{uri: food.imageURL}} style={{width: '100%', height: 220}} resizeMode="cover" />
        ) : null}

        <View className="px-5 pt-4">
          <View className="flex-row items-center" style={{gap: 8}}>
            <Text className="text-lg font-semibold text-primary">₹{info.displayPrice}</Text>
            {info.originalPrice != null ? (
              <Text className="text-sm text-content-tertiary line-through">₹{info.originalPrice}</Text>
            ) : null}
            {info.isBogo ? <Text className="text-xs font-bold text-success">1+1 FREE</Text> : null}
            {food.kcal != null ? (
              <Text className="text-xs text-content-tertiary">· {food.kcal} kcal</Text>
            ) : null}
          </View>

          {food.description ? (
            <Text className="mt-2 text-sm leading-5 text-content-secondary">{food.description}</Text>
          ) : null}

          {food.inGridients && food.inGridients.length > 0 ? (
            <View className="mt-4">
              <Text className="mb-1 text-sm font-semibold text-content">Ingredients</Text>
              <Text className="text-xs text-content-tertiary">{food.inGridients.join(', ')}</Text>
            </View>
          ) : null}

          {addOns.length > 0 ? (
            <View className="mt-5">
              <Text className="mb-2 text-sm font-semibold text-content">Choice of Add-on</Text>
              {addOns.map(addOn => (
                <Card key={addOn._id} className="mb-2 flex-row items-center justify-between">
                  <View className="flex-1 pr-3">
                    <Text className="text-sm font-medium text-content">{addOn.name}</Text>
                    <Text className="text-xs text-primary">₹{addOn.price}</Text>
                  </View>
                  <Button
                    label="Add"
                    size="sm"
                    variant="secondary"
                    disabled={addOn.isAvailable === false}
                    onPress={() => addToFoodCart(addOnToCartItem(addOn, food.name))}
                  />
                </Card>
              ))}
            </View>
          ) : null}
        </View>
      </ScrollView>

      <View className="border-t border-border px-5 pb-6 pt-3">
        <Button
          label="Add to cart"
          leftIcon={<Icon name="cart-outline" size={18} color={theme.colors.primaryForeground} />}
          disabled={food.isAvailable === false}
          onPress={() => {
            addToFoodCart(toCartItem(food));
            navigation.goBack();
          }}
          fullWidth
        />
      </View>
    </SafeAreaView>
  );
}
