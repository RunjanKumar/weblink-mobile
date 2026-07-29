import React from 'react';
import {Pressable, Text, View} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {useFoodOrder} from '../../../store/FoodOrderContext';
import {useTheme} from '../../../theme';
import {useTVFocus} from '../../../hooks/useTVFocus';
import {IS_TV} from '../../../utils/responsive';

/** Height reserved at the bottom of the menu so content clears the bar. */
export const CART_BAR_CLEARANCE = 96;

/**
 * Reference `FoodCartButton.jsx`: hidden while the cart is empty; otherwise a
 * fixed bottom bar with one full-width gold button — item count on the left,
 * "Go to cart - ₹total" on the right.
 */
export function FoodCartButton({onPress}: {onPress: () => void}) {
  const {theme} = useTheme();
  const {getFoodCartCount, getFoodCartTotal} = useFoodOrder();
  const {focused, onFocus, onBlur} = useTVFocus();

  const count = getFoodCartCount();
  if (count === 0) {
    return null;
  }
  const total = getFoodCartTotal();

  return (
    <View
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: theme.colors.surfaceElevated,
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
      }}>
      <Pressable
        onPress={onPress}
        onFocus={onFocus}
        onBlur={onBlur}
        focusable
        accessibilityRole="button"
        accessibilityLabel={`Go to cart, ${count} items, total ₹${Math.round(total)}`}
        style={{
          height: IS_TV ? 64 : 56,
          borderRadius: 20,
          backgroundColor: theme.colors.primary,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 20,
          borderWidth: focused ? 3 : 0,
          borderColor: focused ? theme.colors.focusRing : 'transparent',
          transform: [{scale: focused ? 1.02 : 1}],
        }}>
        <View className="flex-row items-center" style={{gap: 8}}>
          <Icon name="bag-handle" size={IS_TV ? 24 : 20} color={theme.colors.primaryForeground} />
          <Text
            style={{
              color: theme.colors.primaryForeground,
              fontSize: IS_TV ? 18 : 16,
              fontWeight: '600',
            }}>
            {count} {count === 1 ? 'item' : 'items'}
          </Text>
        </View>
        <Text
          style={{
            color: theme.colors.primaryForeground,
            fontSize: IS_TV ? 20 : 18,
            fontWeight: '700',
          }}>
          Go to cart - ₹ {Math.round(total)}
        </Text>
      </Pressable>
    </View>
  );
}
