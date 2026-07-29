import React from 'react';
import {Pressable, ScrollView, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {AppImage, Button} from '../../components';
import {useFoodOrder} from '../../store/FoodOrderContext';
import {useTheme} from '../../theme';
import {useTVFocus} from '../../hooks/useTVFocus';
import {IS_TV} from '../../utils/responsive';
import {getDiscountDisplayInfo, getEffectivePrice, getLineTotal} from '../../utils/discount';
import {DISCOUNT_TYPES} from '../../constants/food';
import {AddButton} from './components/AddButton';
import {VegIndicator} from './components/VegIndicator';
import {addOnToCartItem, toCartItem} from './foodCart';
import type {AddOn} from '../../models/food.model';
import type {HomeStackParamList} from '../../navigation/types';

type Props = NativeStackScreenProps<HomeStackParamList, 'FoodDetail'>;

function BackFab({onPress}: {onPress: () => void}) {
  const {theme} = useTheme();
  const {focused, onFocus, onBlur} = useTVFocus();
  return (
    <Pressable
      onPress={onPress}
      onFocus={onFocus}
      onBlur={onBlur}
      focusable
      accessibilityRole="button"
      accessibilityLabel="Go back"
      style={{
        position: 'absolute',
        top: 24,
        left: 20,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(0,0,0,0.35)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: focused ? theme.colors.focusRing : 'transparent',
      }}>
      <Icon name="arrow-back" size={22} color="#ffffff" />
    </Pressable>
  );
}

/**
 * Dish detail — reference `foodDetail.jsx`: hero image + back FAB +
 * BOGO/unavailable pill, title + VegIndicator(28), price row + "You save",
 * description/ingredients, add-on rows (independent cart lines with their own
 * steppers), bottom bar = [qty stepper][Add items - ₹total].
 */
export function FoodDetailScreen({navigation, route}: Props) {
  const {theme} = useTheme();
  const {food} = route.params;
  const {addToFoodCart, getItemQuantity, updateFoodCartQuantity} = useFoodOrder();

  const available = food.isAvailable !== false;
  const quantity = getItemQuantity(food._id);
  const isBogo = food.couponData?.discountType === DISCOUNT_TYPES.BOGO;
  const displayQty = quantity || (isBogo ? 2 : 1); // reference phantom qty
  const info = getDiscountDisplayInfo({
    price: food.price ?? 0,
    priceAfterDiscount: food.priceAfterDiscount,
    couponData: food.couponData,
  });
  const effectivePrice = getEffectivePrice({
    price: food.price ?? 0,
    priceAfterDiscount: food.priceAfterDiscount,
    couponData: food.couponData,
  });
  const addOns = (food.choiceOfAddOnDetails ?? []).filter(Boolean);

  // Reference total: this dish's line + raw add-on lines already in the cart.
  const addOnsTotal = addOns.reduce(
    (sum, addOn) => sum + (addOn.price ?? 0) * getItemQuantity(addOn._id),
    0,
  );
  const totalPrice =
    getLineTotal({unitPrice: effectivePrice, quantity: quantity || 1, couponData: food.couponData}) +
    addOnsTotal;

  const savings =
    info.hasDiscount && info.originalPrice != null
      ? (info.originalPrice - info.displayPrice) * displayQty
      : 0;

  const onDecrement = () => {
    if (quantity > 0) {
      updateFoodCartQuantity(food._id, quantity - 1);
    }
  };
  const onIncrement = () => {
    if (quantity === 0) {
      addToFoodCart(toCartItem(food));
    } else {
      updateFoodCartQuantity(food._id, quantity + (isBogo ? 2 : 1));
    }
  };
  const onAddItems = () => {
    if (quantity === 0) {
      addToFoodCart(toCartItem(food));
    }
    navigation.navigate('Cart');
  };

  return (
    <SafeAreaView style={{flex: 1, backgroundColor: theme.colors.background}} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={{paddingBottom: 130}}>
        {/* Hero */}
        <View>
          <AppImage
            src={food.imageURL}
            fallbackIcon="fast-food-outline"
            fallbackIconSize={48}
            style={{width: '100%', height: IS_TV ? 320 : 260}}
            resizeMode="cover"
          />
          {!available ? (
            <View
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0,0,0,0.45)',
              }}
            />
          ) : null}
          <BackFab onPress={() => navigation.goBack()} />
          {!available ? (
            <View
              style={{
                position: 'absolute',
                top: 24,
                right: 20,
                backgroundColor: 'rgba(220,38,38,0.92)',
                borderRadius: 999,
                paddingHorizontal: 16,
                paddingVertical: 8,
              }}>
              <Text style={{color: '#ffffff', fontSize: 13, fontWeight: '700'}}>
                Currently Unavailable
              </Text>
            </View>
          ) : isBogo ? (
            <View
              style={{
                position: 'absolute',
                top: 24,
                right: 20,
                backgroundColor: theme.colors.primary,
                borderRadius: 999,
                paddingHorizontal: 16,
                paddingVertical: 8,
              }}>
              <Text
                style={{
                  color: theme.colors.primaryForeground,
                  fontSize: 13,
                  fontWeight: '700',
                }}>
                🎉 BUY 1 GET 1 FREE
              </Text>
            </View>
          ) : null}
        </View>

        <View style={{paddingHorizontal: 20, paddingTop: 16}}>
          {/* Title + veg */}
          <View className="flex-row items-start justify-between" style={{gap: 12}}>
            <Text
              style={{
                flex: 1,
                color: theme.colors.text,
                fontSize: IS_TV ? 30 : 24,
                fontWeight: '600',
                lineHeight: IS_TV ? 38 : 30,
              }}>
              {food.name}
            </Text>
            <VegIndicator type={food.type} size={28} />
          </View>

          {/* Price row */}
          <View className="mt-4 flex-row items-center" style={{gap: 12, flexWrap: 'wrap'}}>
            <Text style={{color: theme.colors.primary, fontSize: IS_TV ? 26 : 22, fontWeight: '700'}}>
              ₹ {Math.round(info.displayPrice)}
            </Text>
            {info.originalPrice != null ? (
              <Text
                style={{
                  color: theme.colors.muted,
                  fontSize: IS_TV ? 18 : 16,
                  textDecorationLine: 'line-through',
                }}>
                ₹{Math.round(info.originalPrice)}
              </Text>
            ) : null}
            {info.isBogo && available ? (
              <View
                style={{
                  backgroundColor: `${theme.colors.primary}26`,
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  borderRadius: 8,
                }}>
                <Text style={{color: theme.colors.primary, fontSize: 13, fontWeight: '700'}}>
                  1+1 FREE
                </Text>
              </View>
            ) : null}
            {food.kcal != null && food.kcal > 0 ? (
              <Text style={{color: theme.colors.muted, fontSize: IS_TV ? 17 : 15}}>
                · {food.kcal} Kcal
              </Text>
            ) : null}
          </View>
          {savings > 0 ? (
            <Text style={{color: theme.colors.success, fontSize: 13, fontWeight: '500', marginTop: 6}}>
              You save ₹{Math.round(savings)}
            </Text>
          ) : null}

          {/* Description */}
          {food.description ? (
            <View style={{marginTop: 28}}>
              <Text style={{color: theme.colors.textSecondary, fontSize: IS_TV ? 24 : 20, fontWeight: '600'}}>
                Description
              </Text>
              <Text
                style={{
                  color: theme.colors.textTertiary,
                  fontSize: IS_TV ? 18 : 16,
                  lineHeight: IS_TV ? 30 : 26,
                  marginTop: 10,
                }}>
                {food.description}
              </Text>
            </View>
          ) : null}

          {/* Ingredients */}
          {food.inGridients && food.inGridients.length > 0 ? (
            <View style={{marginTop: 24}}>
              <Text style={{color: theme.colors.textSecondary, fontSize: IS_TV ? 24 : 20, fontWeight: '600'}}>
                Ingredients
              </Text>
              <Text
                style={{
                  color: theme.colors.textTertiary,
                  fontSize: IS_TV ? 18 : 16,
                  lineHeight: IS_TV ? 30 : 26,
                  marginTop: 10,
                }}>
                {food.inGridients.join(', ')}
              </Text>
            </View>
          ) : null}

          {/* Add-ons */}
          {addOns.length > 0 ? (
            <View style={{marginTop: 28}}>
              <Text style={{color: theme.colors.textSecondary, fontSize: IS_TV ? 24 : 20, fontWeight: '600'}}>
                Choice of Add-on
              </Text>
              <View style={{gap: 12, marginTop: 12}}>
                {addOns.map((addOn: AddOn) => {
                  const addOnAvailable = addOn.isAvailable !== false;
                  const addOnInfo = getDiscountDisplayInfo({
                    price: addOn.price ?? 0,
                    priceAfterDiscount: addOn.priceAfterDiscount,
                    couponData: addOn.couponData,
                  });
                  return (
                    <View
                      key={addOn._id}
                      className="flex-row items-center justify-between"
                      style={{
                        borderWidth: 1,
                        borderColor: theme.colors.border,
                        borderRadius: 16,
                        backgroundColor: theme.colors.surface,
                        paddingHorizontal: 16,
                        paddingVertical: 12,
                        gap: 12,
                        opacity: addOnAvailable ? 1 : 0.5,
                      }}>
                      <AppImage
                        src={addOn.imageURL}
                        fallbackIcon="fast-food-outline"
                        fallbackIconSize={20}
                        style={{width: 48, height: 48, borderRadius: 12}}
                        resizeMode="cover"
                      />
                      <View style={{flex: 1, minWidth: 0}}>
                        <Text
                          numberOfLines={1}
                          style={{color: theme.colors.text, fontSize: 15, fontWeight: '500'}}>
                          {addOn.name}
                        </Text>
                        <View className="flex-row items-center" style={{gap: 6, marginTop: 2}}>
                          <Text style={{color: theme.colors.primary, fontSize: 15, fontWeight: '600'}}>
                            ₹{Math.round(addOnInfo.displayPrice)}
                          </Text>
                          {addOnInfo.originalPrice != null ? (
                            <Text
                              style={{
                                color: theme.colors.muted,
                                fontSize: 12,
                                textDecorationLine: 'line-through',
                              }}>
                              ₹{Math.round(addOnInfo.originalPrice)}
                            </Text>
                          ) : null}
                        </View>
                      </View>
                      <AddButton
                        item={addOn}
                        onAdd={() => addToFoodCart(addOnToCartItem(addOn, food.name))}
                      />
                    </View>
                  );
                })}
              </View>
            </View>
          ) : null}
        </View>
      </ScrollView>

      {/* Bottom bar: [stepper][Add items CTA] */}
      <View
        className="flex-row items-center"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: theme.colors.surfaceElevated,
          borderTopWidth: 1,
          borderTopColor: theme.colors.border,
          paddingHorizontal: 20,
          paddingVertical: 18,
          gap: 16,
        }}>
        <View
          className="flex-row items-center justify-around"
          style={{
            width: 120,
            height: 56,
            borderRadius: 20,
            borderWidth: 1,
            borderColor: theme.colors.border,
            backgroundColor: theme.colors.surface,
          }}>
          <Pressable
            onPress={onDecrement}
            disabled={!available}
            focusable={available}
            accessibilityRole="button"
            accessibilityLabel="Decrease quantity"
            style={{width: 40, height: '100%', alignItems: 'center', justifyContent: 'center', opacity: available ? 1 : 0.3}}>
            <Text style={{color: theme.colors.primary, fontSize: 20, fontWeight: '700'}}>−</Text>
          </Pressable>
          <Text style={{color: theme.colors.text, fontSize: 18, fontWeight: '500'}}>
            {displayQty}
          </Text>
          <Pressable
            onPress={onIncrement}
            disabled={!available}
            focusable={available}
            accessibilityRole="button"
            accessibilityLabel="Increase quantity"
            style={{width: 40, height: '100%', alignItems: 'center', justifyContent: 'center', opacity: available ? 1 : 0.3}}>
            <Text style={{color: theme.colors.primary, fontSize: 20, fontWeight: '700'}}>+</Text>
          </Pressable>
        </View>
        <View style={{flex: 1}}>
          <Button
            label={available ? `Add items - ₹ ${Math.round(totalPrice)}` : 'Not Available'}
            disabled={!available}
            onPress={onAddItems}
            fullWidth
          />
        </View>
      </View>
    </SafeAreaView>
  );
}
