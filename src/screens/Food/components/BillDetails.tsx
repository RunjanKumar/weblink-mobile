import React, {useMemo, useState} from 'react';
import {Pressable, Text, View} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {useTVFocus} from '../../../hooks/useTVFocus';
import {useTheme} from '../../../theme';
import {IS_TV} from '../../../utils/responsive';
import {DISCOUNT_TYPES} from '../../../constants/food';
import type {CartItem, CouponItem, CouponValidateData} from '../../../models/food.model';

function BillLine({
  label,
  value,
  green,
  strong,
  accent,
}: {
  label: string;
  value: string;
  green?: boolean;
  strong?: boolean;
  accent?: boolean;
}) {
  const {theme} = useTheme();
  const color = green
    ? theme.colors.success
    : accent
      ? theme.colors.primary
      : strong
        ? theme.colors.text
        : theme.colors.textSecondary;
  return (
    <View className="flex-row justify-between" style={{paddingVertical: 4}}>
      <Text
        style={{
          color: green ? theme.colors.success : strong ? theme.colors.text : theme.colors.textTertiary,
          fontSize: IS_TV ? 16 : 13,
          fontWeight: strong ? '700' : '400',
        }}>
        {label}
      </Text>
      <Text style={{color, fontSize: IS_TV ? 16 : 13, fontWeight: strong ? '700' : '500'}}>
        {value}
      </Text>
    </View>
  );
}

/**
 * Reference collapsible bill (Cart.jsx): Items Total / Percentage Discount /
 * BOGO Savings / Coupon({name}) / Total Savings / Tax({rate}%) / Payable.
 * Savings math mirrors `cartViewModel.js`: from the backend coupon breakdown
 * when a coupon is applied, else computed locally from the cart.
 */
export function BillDetails({
  items,
  itemsTotal,
  taxRate,
  taxAmount,
  payableAmount,
  couponResponse,
  appliedCouponName,
}: {
  items: (CartItem & {couponItem: CouponItem | null})[];
  itemsTotal: number;
  taxRate: number;
  taxAmount: number;
  payableAmount: number;
  couponResponse: CouponValidateData | null;
  appliedCouponName: string;
}) {
  const {theme} = useTheme();
  const {focused, onFocus, onBlur} = useTVFocus();
  const [expanded, setExpanded] = useState(true); // reference default: open

  const {percentageSavings, bogoSavings, flatCouponDiscount, totalSavings} = useMemo(() => {
    if (couponResponse) {
      const backendItems = couponResponse.items ?? [];
      const pct = backendItems
        .filter(ci => ci.appliedCouponType === 'PERCENTAGE')
        .reduce((sum, ci) => sum + (ci.discountAmount ?? 0), 0);
      const bogo = backendItems
        .filter(ci => ci.appliedCouponType === 'BOGO')
        .reduce((sum, ci) => sum + (ci.discountAmount ?? 0), 0);
      return {
        percentageSavings: pct,
        bogoSavings: bogo,
        flatCouponDiscount: couponResponse.summary?.orderCouponDiscount ?? 0,
        totalSavings: couponResponse.summary?.totalDiscount ?? 0,
      };
    }
    let pct = 0;
    let bogo = 0;
    for (const item of items) {
      if (
        item.couponData?.discountType === DISCOUNT_TYPES.PERCENTAGE &&
        item.price != null &&
        item.priceAfterDiscount != null &&
        item.priceAfterDiscount < item.price
      ) {
        pct += (item.price - item.priceAfterDiscount) * item.quantity;
      }
      if (item.couponData?.discountType === DISCOUNT_TYPES.BOGO && item.price != null) {
        bogo += item.price * Math.floor(item.quantity / 2);
      }
    }
    return {
      percentageSavings: pct,
      bogoSavings: bogo,
      flatCouponDiscount: 0,
      totalSavings: pct + bogo,
    };
  }, [items, couponResponse]);

  return (
    <View
      style={{
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: 12,
        overflow: 'hidden',
      }}>
      <Pressable
        onPress={() => setExpanded(prev => !prev)}
        onFocus={onFocus}
        onBlur={onBlur}
        focusable
        accessibilityRole="button"
        accessibilityState={{expanded}}
        className="flex-row items-center justify-between"
        style={{
          padding: 14,
          // Always 2px so focus does not shift the row.
          borderWidth: 2,
          borderColor: focused ? theme.colors.focusRing : 'transparent',
          borderRadius: 12,
        }}>
        <View className="flex-row items-center" style={{gap: 10}}>
          <Icon name="receipt-outline" size={18} color={theme.colors.primary} />
          <Text style={{color: theme.colors.text, fontSize: IS_TV ? 17 : 14, fontWeight: '600'}}>
            Total Bill{'  '}
            <Text style={{fontWeight: '700'}}>₹ {payableAmount.toFixed(2)}</Text>
          </Text>
        </View>
        <Icon
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={theme.colors.muted}
        />
      </Pressable>

      {expanded ? (
        <View
          style={{
            backgroundColor: theme.colors.surfaceElevated,
            paddingHorizontal: 16,
            paddingVertical: 12,
          }}>
          <BillLine label="Items Total" value={`₹ ${itemsTotal.toFixed(2)}`} />
          {percentageSavings > 0 ? (
            <BillLine
              label="Percentage Discount"
              value={`- ₹ ${percentageSavings.toFixed(2)}`}
              green
            />
          ) : null}
          {bogoSavings > 0 ? (
            <BillLine label="BOGO Savings" value={`- ₹ ${bogoSavings.toFixed(2)}`} green />
          ) : null}
          {flatCouponDiscount > 0 ? (
            <BillLine
              label={`Coupon (${appliedCouponName})`}
              value={`- ₹ ${flatCouponDiscount.toFixed(2)}`}
              green
            />
          ) : null}
          {totalSavings > 0 ? (
            <>
              <View style={{height: 1, backgroundColor: theme.colors.border, marginVertical: 6}} />
              <BillLine
                label="Total Savings"
                value={`- ₹ ${totalSavings.toFixed(2)}`}
                green
                strong
              />
            </>
          ) : null}
          <BillLine label={`Tax (${taxRate}%)`} value={`₹ ${taxAmount.toFixed(2)}`} />
          <View style={{height: 1, backgroundColor: theme.colors.border, marginVertical: 6}} />
          <BillLine label="Payable Amount" value={`₹ ${payableAmount.toFixed(2)}`} strong accent />
          <Text style={{color: theme.colors.muted, fontSize: 12, marginTop: 8}}>
            Incl. taxes and charges
          </Text>
        </View>
      ) : null}
    </View>
  );
}
