import React from 'react';
import {Pressable, Text, View} from 'react-native';
import {useFoodOrder} from '../../../store/FoodOrderContext';
import {useTheme} from '../../../theme';
import {useTVFocus} from '../../../hooks/useTVFocus';
import {IS_TV} from '../../../utils/responsive';
import {DISCOUNT_TYPES} from '../../../constants/food';
import {toCartItem} from '../foodCart';
import type {Food} from '../../../models/food.model';

/** A cart-addable item — a Food or an already-built cart line (add-ons). */
type Addable = Pick<
  Food,
  '_id' | 'name' | 'price' | 'priceAfterDiscount' | 'imageURL' | 'type' | 'couponData' | 'isAvailable'
>;

function StepButton({
  label,
  onPress,
  size,
}: {
  label: string;
  onPress: () => void;
  size: number;
}) {
  const {theme} = useTheme();
  const {focused, onFocus, onBlur} = useTVFocus();
  return (
    <Pressable
      onPress={onPress}
      onFocus={onFocus}
      onBlur={onBlur}
      focusable
      accessibilityRole="button"
      accessibilityLabel={label === '−' ? 'Decrease quantity' : 'Increase quantity'}
      style={{
        width: size,
        height: size + 2,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: focused ? `${theme.colors.primary}1f` : 'transparent',
      }}>
      <Text style={{color: theme.colors.primary, fontSize: IS_TV ? 22 : 18, fontWeight: '700'}}>
        {label}
      </Text>
    </Pressable>
  );
}

/**
 * Reference `AddButton.jsx`: qty 0 → outlined gold "Add" pill; qty > 0 → an
 * inline [− qty +] stepper. Qty state lives entirely in the cart context.
 * BOGO items add at qty 2 and increment +2 (context handles the initial step);
 * decrement is always −1; qty ≤ 0 removes. Unavailable → red "Unavailable"
 * chip (replaces the button, reference behavior).
 */
export function AddButton({
  item,
  onAdd,
}: {
  item: Addable;
  /** Override the add action (add-ons build their own cart line). */
  onAdd?: () => void;
}) {
  const {theme} = useTheme();
  const {addToFoodCart, getItemQuantity, updateFoodCartQuantity} = useFoodOrder();
  const {focused, onFocus, onBlur} = useTVFocus();

  const available = item.isAvailable !== false;
  const quantity = getItemQuantity(item._id);
  const isBogo = item.couponData?.discountType === DISCOUNT_TYPES.BOGO;
  const btn = IS_TV ? 38 : 30;

  if (!available) {
    return (
      <View
        style={{
          borderWidth: 1,
          borderColor: `${theme.colors.danger}66`,
          borderRadius: 14,
          paddingHorizontal: 12,
          paddingVertical: 6,
        }}>
        <Text style={{color: theme.colors.danger, fontSize: IS_TV ? 15 : 13, fontWeight: '500'}}>
          Unavailable
        </Text>
      </View>
    );
  }

  if (quantity === 0) {
    return (
      <Pressable
        onPress={onAdd ?? (() => addToFoodCart(toCartItem(item as Food)))}
        onFocus={onFocus}
        onBlur={onBlur}
        focusable
        accessibilityRole="button"
        accessibilityLabel={`Add ${item.name ?? 'item'}`}
        style={{
          borderWidth: focused ? 2 : 1,
          borderColor: focused ? theme.colors.focusRing : theme.colors.primary,
          borderRadius: 14,
          paddingHorizontal: IS_TV ? 22 : 16,
          paddingVertical: IS_TV ? 9 : 6,
          backgroundColor: focused ? `${theme.colors.primary}1f` : 'transparent',
          transform: [{scale: focused ? 1.05 : 1}],
        }}>
        <Text
          style={{color: theme.colors.primary, fontSize: IS_TV ? 17 : 15, fontWeight: '600'}}>
          Add
        </Text>
      </Pressable>
    );
  }

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme.colors.primary,
        borderRadius: 14,
        overflow: 'hidden',
      }}>
      <StepButton label="−" size={btn} onPress={() => updateFoodCartQuantity(item._id, quantity - 1)} />
      <Text
        style={{
          width: IS_TV ? 30 : 24,
          textAlign: 'center',
          color: theme.colors.primary,
          fontSize: IS_TV ? 17 : 15,
          fontWeight: '600',
        }}>
        {quantity}
      </Text>
      <StepButton
        label="+"
        size={btn}
        onPress={() => updateFoodCartQuantity(item._id, quantity + (isBogo ? 2 : 1))}
      />
    </View>
  );
}
