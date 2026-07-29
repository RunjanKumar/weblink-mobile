import React from 'react';
import {Pressable, Text, View} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {AppImage} from '../../../components';
import {useTheme} from '../../../theme';
import {useTVFocus} from '../../../hooks/useTVFocus';
import {IS_TV} from '../../../utils/responsive';
import {VegIndicator} from './VegIndicator';
import type {CartItem, CouponItem} from '../../../models/food.model';

type Row = CartItem & {unitPrice: number; lineTotal: number; couponItem: CouponItem | null};

function StepButton({label, onPress}: {label: string; onPress: () => void}) {
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
        width: IS_TV ? 38 : 30,
        height: IS_TV ? 40 : 32,
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
 * Reference `CartFoodRow` (Cart.jsx): thumbnail (BOGO "1+1 FREE" strip),
 * VegIndicator, add-on naming ("Add on - X" / "for {parent}"), gold line
 * total (backend coupon price when applied) + strike + green discount chip,
 * red ✕ delete, gold-bordered [− qty +] stepper.
 */
export function CartItemRow({
  item,
  onIncrement,
  onDecrement,
  onRemove,
}: {
  item: Row;
  onIncrement: () => void;
  onDecrement: () => void;
  onRemove: () => void;
}) {
  const {theme} = useTheme();
  const {focused: removeFocused, onFocus: onRemoveFocus, onBlur: onRemoveBlur} = useTVFocus();

  const isBogo = item.couponData?.discountType === 3;
  const title = item.isAddOn ? `Add on - ${item.title ?? item.name ?? 'Item'}` : item.title ?? item.name ?? 'Item';
  const discountAmount = item.couponItem?.discountAmount ?? 0;
  const baseLineTotal = item.unitPrice * item.quantity;
  const showStrike =
    item.couponItem != null && discountAmount > 0 && baseLineTotal > item.lineTotal;

  return (
    <View
      style={{
        flexDirection: 'row',
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: 24,
        backgroundColor: theme.colors.surface,
        padding: 12,
        gap: 12,
      }}>
      {/* Thumbnail */}
      <View style={{width: 95, height: 70, borderRadius: 12, overflow: 'hidden'}}>
        <AppImage
          src={item.imageURL}
          fallbackIcon="fast-food-outline"
          fallbackIconSize={24}
          style={{width: '100%', height: '100%'}}
          resizeMode="cover"
        />
        {isBogo ? (
          <View
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              backgroundColor: theme.colors.primary,
              paddingVertical: 2,
              alignItems: 'center',
            }}>
            <Text
              style={{color: theme.colors.primaryForeground, fontSize: 9, fontWeight: '700'}}>
              1+1 FREE
            </Text>
          </View>
        ) : null}
      </View>

      {/* Middle: name + price */}
      <View style={{flex: 1, minWidth: 0, justifyContent: 'space-between'}}>
        <View>
          <View className="flex-row items-center" style={{gap: 6}}>
            <VegIndicator type={item.type} size={14} />
            <Text
              numberOfLines={1}
              style={{
                flex: 1,
                color: theme.colors.text,
                fontSize: IS_TV ? 17 : 15,
                fontWeight: '600',
              }}>
              {title}
            </Text>
          </View>
          {item.isAddOn && item.parentFoodTitle ? (
            <Text style={{color: theme.colors.muted, fontSize: 12, marginTop: 2}}>
              for {item.parentFoodTitle}
            </Text>
          ) : null}
        </View>
        <View className="flex-row items-center" style={{gap: 8, flexWrap: 'wrap'}}>
          <Text style={{color: theme.colors.primary, fontSize: IS_TV ? 22 : 18, fontWeight: '700'}}>
            ₹{Math.round(item.lineTotal)}
          </Text>
          {showStrike ? (
            <Text
              style={{
                color: theme.colors.muted,
                fontSize: 13,
                textDecorationLine: 'line-through',
              }}>
              ₹{Math.round(baseLineTotal)}
            </Text>
          ) : null}
          {discountAmount > 0 && !isBogo ? (
            <View
              style={{
                backgroundColor: `${theme.colors.success}26`,
                borderRadius: 6,
                paddingHorizontal: 6,
                paddingVertical: 2,
              }}>
              <Text style={{color: theme.colors.success, fontSize: 11, fontWeight: '700'}}>
                -₹{Math.round(discountAmount)}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* Right: delete + stepper */}
      <View style={{alignItems: 'flex-end', justifyContent: 'space-between'}}>
        <Pressable
          onPress={onRemove}
          onFocus={onRemoveFocus}
          onBlur={onRemoveBlur}
          focusable
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={`Remove ${title}`}
          style={{
            width: 22,
            height: 22,
            borderRadius: 11,
            borderWidth: removeFocused ? 2 : 1,
            borderColor: removeFocused ? theme.colors.focusRing : `${theme.colors.danger}66`,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Icon name="close" size={13} color={theme.colors.danger} />
        </Pressable>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            borderWidth: 1,
            borderColor: theme.colors.primary,
            borderRadius: 14,
            overflow: 'hidden',
          }}>
          <StepButton label="−" onPress={onDecrement} />
          <Text
            style={{
              width: IS_TV ? 30 : 24,
              textAlign: 'center',
              color: theme.colors.primary,
              fontSize: IS_TV ? 17 : 15,
              fontWeight: '600',
            }}>
            {item.quantity}
          </Text>
          <StepButton label="+" onPress={onIncrement} />
        </View>
      </View>
    </View>
  );
}
