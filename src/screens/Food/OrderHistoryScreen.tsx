import React from 'react';
import {ActivityIndicator, Pressable, ScrollView, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Button, EmptyState, ErrorState, Header, Loader} from '../../components';
import {useOrderHistoryViewModel} from '../../viewmodels';
import {useTheme, useStatusTones, type StatusTone} from '../../theme';
import {useTVFocus} from '../../hooks/useTVFocus';
import {IS_TV} from '../../utils/responsive';
import {BOOKING_STATUS} from '../../constants/status';
import {TRANSACTION_STATUS, FOOD_ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS, PAYMENT_STATUS_TONES} from '../../constants/food';
import {VegIndicator} from './components/VegIndicator';
import type {FoodOrder} from '../../models/food.model';
import type {HomeStackParamList} from '../../navigation/types';

type Props = NativeStackScreenProps<HomeStackParamList, 'OrderHistory'>;

/** Reference ORDER_STATUS_CONFIG: label + tone + icon per status. */
const STATUS_CONFIG: Record<number, {tone: StatusTone; icon: string}> = {
  [BOOKING_STATUS.PENDING]: {tone: 'warning', icon: 'bag-handle-outline'},
  [BOOKING_STATUS.IN_PROGRESS]: {tone: 'info', icon: 'restaurant-outline'},
  [BOOKING_STATUS.COMPLETED]: {tone: 'success', icon: 'checkmark-circle-outline'},
  [BOOKING_STATUS.CANCEL]: {tone: 'danger', icon: 'alert-circle-outline'},
};

function formatOrderDate(iso?: string): string {
  if (!iso) {
    return '';
  }
  const d = new Date(iso);
  const date = d.toLocaleDateString('en-IN', {day: '2-digit', month: 'short', year: 'numeric'});
  const time = d.toLocaleTimeString('en-IN', {hour: '2-digit', minute: '2-digit', hour12: false});
  return `${date} | ${time}`;
}

function OrderCard({
  order,
  canPay,
  paying,
  onPay,
}: {
  order: FoodOrder;
  canPay: boolean;
  paying: boolean;
  onPay: () => void;
}) {
  const {theme} = useTheme();
  const tones = useStatusTones();
  const {focused, onFocus, onBlur} = useTVFocus();

  const statusCfg: {tone: StatusTone; icon: string} =
    STATUS_CONFIG[order.status ?? BOOKING_STATUS.PENDING] ?? {
      tone: 'warning',
      icon: 'bag-handle-outline',
    };
  const statusColor = tones[statusCfg.tone];
  const statusLabel =
    order.status != null ? FOOD_ORDER_STATUS_LABELS[order.status] ?? 'Order' : 'Order';
  const payTone =
    tones[
      (order.paymentStatus != null ? PAYMENT_STATUS_TONES[order.paymentStatus] : undefined) ??
        'warning'
    ];
  const payLabel =
    order.paymentStatus != null
      ? PAYMENT_STATUS_LABELS[order.paymentStatus] ?? 'Pending'
      : 'Pending';
  const discount = (order.totalPrice ?? 0) - (order.totalPriceAfterDisCount ?? order.totalPrice ?? 0);
  const failedRetry = order.paymentStatus === TRANSACTION_STATUS.FAILED && canPay;

  return (
    <View
      style={{
        borderWidth: focused ? 2 : 1,
        borderColor: focused ? theme.colors.focusRing : theme.colors.border,
        borderRadius: 16,
        backgroundColor: theme.colors.surface,
        overflow: 'hidden',
      }}>
      {failedRetry ? (
        <View
          style={{
            backgroundColor: `${theme.colors.danger}1a`,
            paddingHorizontal: 16,
            paddingVertical: 8,
          }}>
          <Text style={{color: theme.colors.danger, fontSize: 12, fontWeight: '600'}}>
            Payment failed — tap below to retry
          </Text>
        </View>
      ) : null}

      <View style={{padding: 16}}>
        {/* Header row */}
        <View className="flex-row items-start justify-between">
          <View>
            <Text style={{color: theme.colors.text, fontSize: IS_TV ? 19 : 16, fontWeight: '700'}}>
              Order #{order._id.slice(-6).toUpperCase()}
            </Text>
            <Text style={{color: theme.colors.textTertiary, fontSize: 12, marginTop: 2}}>
              {formatOrderDate(order.createdAt)}
            </Text>
          </View>
          <View
            className="flex-row items-center"
            style={{
              gap: 5,
              backgroundColor: `${statusColor}1a`,
              borderRadius: 999,
              paddingHorizontal: 12,
              paddingVertical: 5,
            }}>
            <Icon name={statusCfg.icon} size={14} color={statusColor} />
            <Text style={{color: statusColor, fontSize: 13, fontWeight: '600'}}>{statusLabel}</Text>
          </View>
        </View>

        {/* Items */}
        <View style={{marginTop: 12, gap: 6}}>
          {(order.foodItems ?? []).map((item, index) => (
            <View key={index} className="flex-row items-center justify-between" style={{gap: 8}}>
              <View className="flex-row items-center" style={{gap: 8, flex: 1, minWidth: 0}}>
                <VegIndicator type={item.foodDetail?.type} size={14} />
                <Text
                  numberOfLines={1}
                  style={{color: theme.colors.text, fontSize: IS_TV ? 17 : 15, flexShrink: 1}}>
                  {item.foodDetail?.name ?? 'Item'}
                </Text>
                <Text style={{color: theme.colors.muted, fontSize: 13}}>
                  {item.quantity ?? 1} x ₹{item.price ?? 0}
                </Text>
              </View>
              <Text style={{color: theme.colors.textSecondary, fontSize: IS_TV ? 16 : 14}}>
                ₹{(item.quantity ?? 1) * (item.price ?? 0)}
              </Text>
            </View>
          ))}
        </View>

        {/* Bill details */}
        <View
          style={{
            marginTop: 12,
            paddingTop: 12,
            borderTopWidth: 1,
            borderTopColor: theme.colors.border,
            borderStyle: 'dashed',
            gap: 4,
          }}>
          <View className="flex-row justify-between">
            <Text style={{color: theme.colors.textTertiary, fontSize: 13}}>Item Total</Text>
            <Text style={{color: theme.colors.textSecondary, fontSize: 13}}>
              ₹{order.totalPrice ?? 0}
            </Text>
          </View>
          {discount > 0 ? (
            <View className="flex-row justify-between">
              <Text style={{color: theme.colors.success, fontSize: 13}}>Discount</Text>
              <Text style={{color: theme.colors.success, fontSize: 13}}>
                -₹{discount.toFixed(2)}
              </Text>
            </View>
          ) : null}
          <View className="flex-row justify-between">
            <Text style={{color: theme.colors.textTertiary, fontSize: 13}}>
              Taxes & Charges ({order.tax ?? 0}%)
            </Text>
            <Text style={{color: theme.colors.textSecondary, fontSize: 13}}>
              ₹{(order.taxInAmount ?? 0).toFixed(2)}
            </Text>
          </View>
          <View
            className="flex-row justify-between"
            style={{
              marginTop: 4,
              paddingTop: 8,
              borderTopWidth: 1,
              borderTopColor: theme.colors.border,
            }}>
            <Text style={{color: theme.colors.text, fontSize: IS_TV ? 17 : 14, fontWeight: '700'}}>
              To Pay
            </Text>
            <Text style={{color: theme.colors.primary, fontSize: IS_TV ? 17 : 14, fontWeight: '700'}}>
              ₹{order.totalPriceAfterTax ?? 0}
            </Text>
          </View>
        </View>

        {/* Pay / retry (never on TV) */}
        {canPay ? (
          <Pressable
            onPress={onPay}
            onFocus={onFocus}
            onBlur={onBlur}
            disabled={paying}
            focusable={!paying}
            accessibilityRole="button"
            style={{
              marginTop: 14,
              height: 52,
              borderRadius: 14,
              backgroundColor: theme.colors.primary,
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'row',
              gap: 10,
              opacity: paying ? 0.7 : 1,
            }}>
            {paying ? <ActivityIndicator color={theme.colors.primaryForeground} /> : (
              <Icon name="card-outline" size={18} color={theme.colors.primaryForeground} />
            )}
            <Text
              style={{
                color: theme.colors.primaryForeground,
                fontSize: 16,
                fontWeight: '700',
              }}>
              {paying
                ? 'Processing…'
                : `${failedRetry ? 'Retry Payment' : 'Pay Online'} — ₹${order.totalPriceAfterTax ?? 0}`}
            </Text>
          </Pressable>
        ) : null}

        {/* Footer: payment badge */}
        <View className="flex-row justify-end" style={{marginTop: 12}}>
          <View
            style={{
              borderWidth: 1,
              borderColor: `${payTone}99`,
              borderRadius: 999,
              paddingHorizontal: 12,
              paddingVertical: 3,
            }}>
            <Text style={{color: payTone, fontSize: 13, fontWeight: '500'}}>{payLabel}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

/**
 * Order history — reference `OrderHistory.jsx`: manual refresh (remote has no
 * pull gesture), pending-payment banner (phone only), status pills + outlined
 * payment badges, per-order bill block, Pay/Retry (phone only), 30 s poll
 * while an order is active.
 */
export function OrderHistoryScreen({navigation}: Props) {
  const {theme} = useTheme();
  const vm = useOrderHistoryViewModel();
  const {focused: refreshFocused, onFocus: onRefreshFocus, onBlur: onRefreshBlur} = useTVFocus();

  const headerRight =
    !vm.isLoading && vm.orders.length > 0 ? (
      <Pressable
        onPress={() => vm.refetch()}
        onFocus={onRefreshFocus}
        onBlur={onRefreshBlur}
        focusable
        accessibilityRole="button"
        accessibilityLabel="Refresh orders"
        className="h-10 w-10 items-center justify-center rounded-full"
        style={{
          borderWidth: refreshFocused ? 2 : 0,
          borderColor: refreshFocused ? theme.colors.focusRing : 'transparent',
        }}>
        {vm.isRefetching ? (
          <ActivityIndicator size="small" color={theme.colors.primary} />
        ) : (
          <Icon name="refresh" size={20} color={theme.colors.text} />
        )}
      </Pressable>
    ) : undefined;

  return (
    <SafeAreaView style={{flex: 1, backgroundColor: theme.colors.background}} edges={['top']}>
      <Header title="Your orders" onBack={() => navigation.goBack()} right={headerRight} />

      {vm.isLoading ? (
        <Loader label="Loading orders…" />
      ) : vm.error ? (
        <ErrorState message={vm.error} onRetry={vm.refetch} />
      ) : vm.orders.length === 0 ? (
        <EmptyState
          icon="receipt-outline"
          title="No orders yet"
          message="Your food orders will show up here."
          action={
            <Button
              label="Order food"
              variant="secondary"
              onPress={() => navigation.navigate('Food')}
              fullWidth
            />
          }
        />
      ) : (
        <ScrollView contentContainerStyle={{paddingHorizontal: 20, paddingBottom: 24, gap: 16}}>
          {vm.hasPendingPayment ? (
            <View
              className="flex-row items-center"
              style={{
                gap: 10,
                borderWidth: 1,
                borderColor: `${theme.colors.warning}4d`,
                backgroundColor: `${theme.colors.warning}14`,
                borderRadius: 14,
                padding: 14,
              }}>
              <Icon name="warning-outline" size={20} color={theme.colors.warning} />
              <View style={{flex: 1}}>
                <Text style={{color: theme.colors.text, fontSize: 13, fontWeight: '600'}}>
                  Payment pending for your order
                </Text>
                <Text style={{color: theme.colors.textTertiary, fontSize: 12, marginTop: 2}}>
                  Complete the payment or it will remain as Cash on Delivery
                </Text>
              </View>
            </View>
          ) : null}

          {vm.orders.map(order => (
            <OrderCard
              key={order._id}
              order={order}
              canPay={vm.canPayOnline(order)}
              paying={vm.payingOrderId === order._id}
              onPay={() => vm.payOnline(order)}
            />
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
