import React from 'react';
import {RefreshControl, ScrollView, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Button, Card, EmptyState, ErrorState, Header, Loader} from '../../components';
import {useOrderHistoryViewModel} from '../../viewmodels';
import {useTheme} from '../../theme';
import {BOOKING_STATUS_COLORS} from '../../constants/status';
import {
  FOOD_ORDER_STATUS_LABELS,
  PAYMENT_STATUS_COLORS,
  PAYMENT_STATUS_LABELS,
} from '../../constants/food';
import {formatDateTime} from '../../utils/format';
import type {FoodOrder} from '../../models/food.model';
import type {HomeStackParamList} from '../../navigation/types';

type Props = NativeStackScreenProps<HomeStackParamList, 'OrderHistory'>;

function Badge({label, color}: {label: string; color: string}) {
  return (
    <View
      className="self-start rounded-full px-2.5 py-1"
      style={{backgroundColor: `${color}22`, borderWidth: 1, borderColor: `${color}66`}}>
      <Text style={{color, fontSize: 11, fontWeight: '600'}}>{label}</Text>
    </View>
  );
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
  const statusColor = order.status != null ? BOOKING_STATUS_COLORS[order.status] ?? '#6b7280' : '#6b7280';
  const statusLabel = order.status != null ? FOOD_ORDER_STATUS_LABELS[order.status] ?? 'Order' : 'Order';
  const payColor = order.paymentStatus != null ? PAYMENT_STATUS_COLORS[order.paymentStatus] ?? '#6b7280' : '#6b7280';
  const payLabel = order.paymentStatus != null ? PAYMENT_STATUS_LABELS[order.paymentStatus] ?? '' : '';

  return (
    <Card className="mb-3">
      <View className="flex-row items-start justify-between">
        <View>
          <Text className="text-sm font-bold text-content">Order #{order._id.slice(-6).toUpperCase()}</Text>
          {order.createdAt ? (
            <Text className="mt-0.5 text-[11px] text-content-tertiary">{formatDateTime(order.createdAt)}</Text>
          ) : null}
        </View>
        <Badge label={statusLabel} color={statusColor} />
      </View>

      <View className="mt-3 border-t border-border pt-3">
        {(order.foodItems ?? []).map((it, idx) => (
          <View key={idx} className="flex-row items-center justify-between py-0.5">
            <Text className="flex-1 pr-2 text-xs text-content-secondary" numberOfLines={1}>
              {it.foodDetail?.name ?? 'Item'} × {it.quantity ?? 0}
            </Text>
            {it.price != null ? <Text className="text-xs text-content-tertiary">₹{it.price}</Text> : null}
          </View>
        ))}
      </View>

      <View className="mt-3 flex-row items-center justify-between">
        <Badge label={payLabel} color={payColor} />
        <Text className="text-sm font-bold text-primary">
          ₹{order.totalPriceAfterTax ?? order.totalPrice ?? 0}
        </Text>
      </View>

      {canPay ? (
        <View className="mt-3">
          <Button
            label="Pay online"
            size="sm"
            loading={paying}
            onPress={onPay}
            fullWidth
            leftIcon={<Icon name="card-outline" size={16} color={theme.colors.primaryForeground} />}
          />
        </View>
      ) : null}
    </Card>
  );
}

export function OrderHistoryScreen({navigation}: Props) {
  const {theme} = useTheme();
  const vm = useOrderHistoryViewModel();

  return (
    <SafeAreaView style={{flex: 1, backgroundColor: theme.colors.background}} edges={['top']}>
      <Header title="Your orders" onBack={() => navigation.goBack()} />

      {vm.isLoading ? (
        <Loader label="Loading orders…" />
      ) : vm.error ? (
        <ErrorState message={vm.error} onRetry={vm.refetch} />
      ) : vm.orders.length === 0 ? (
        <EmptyState
          icon="receipt-outline"
          title="No orders yet"
          message="Your food orders will show up here."
          action={<Button label="Order food" variant="secondary" onPress={() => navigation.navigate('Food')} fullWidth />}
        />
      ) : (
        <ScrollView
          contentContainerStyle={{paddingHorizontal: 20, paddingBottom: 24}}
          refreshControl={
            <RefreshControl
              refreshing={vm.isRefetching}
              onRefresh={vm.refetch}
              tintColor={theme.colors.primary}
              colors={[theme.colors.primary]}
            />
          }>
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
