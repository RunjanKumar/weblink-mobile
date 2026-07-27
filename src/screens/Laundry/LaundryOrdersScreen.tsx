import React from 'react';
import {Alert, RefreshControl, ScrollView, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Button, Card, EmptyState, ErrorState, Header, Loader} from '../../components';
import {useLaundryOrdersViewModel} from '../../viewmodels';
import {useTheme} from '../../theme';
import {
  LAUNDRY_ORDER_STATUS_COLORS,
  LAUNDRY_ORDER_STATUS_LABELS,
  serviceTypeLabel,
} from '../../constants/laundry';
import {formatDateTime} from '../../utils/format';
import {getApiErrorMessage} from '../../utils/errorHandler';
import type {LaundryOrder} from '../../models/laundry.model';
import type {HomeStackParamList} from '../../navigation/types';

type Props = NativeStackScreenProps<HomeStackParamList, 'LaundryOrders'>;

function StatusBadge({status}: {status?: string}) {
  const color = status ? LAUNDRY_ORDER_STATUS_COLORS[status] ?? '#6b7280' : '#6b7280';
  const label = status ? LAUNDRY_ORDER_STATUS_LABELS[status] ?? status : 'Unknown';
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
  cancelling,
  onCancel,
}: {
  order: LaundryOrder;
  cancelling: boolean;
  onCancel: () => void;
}) {
  const {theme} = useTheme();
  const canCancel = order.status === 'REQUESTED';
  const billed = order.status === 'DELIVERED' && Boolean(order.folio?.transactionId);

  return (
    <Card className="mb-3">
      <View className="flex-row items-start justify-between">
        <View>
          <Text className="text-sm font-bold text-content">
            Order #{order.orderNumber ?? order._id.slice(-6)}
          </Text>
          {order.createdAt ? (
            <Text className="mt-0.5 text-[11px] text-content-tertiary">
              {formatDateTime(order.createdAt)}
            </Text>
          ) : null}
        </View>
        <StatusBadge status={order.status} />
      </View>

      {order.isExpress ? (
        <View className="mt-2 flex-row items-center">
          <Icon name="flash" size={13} color={theme.colors.warning} />
          <Text className="ml-1 text-[11px] font-medium text-warning">Express</Text>
        </View>
      ) : null}

      <View className="mt-3 border-t border-border pt-3">
        {(order.items ?? []).map((it, idx) => (
          <View key={`${it.itemId ?? idx}`} className="flex-row items-center justify-between py-1">
            <Text className="flex-1 pr-2 text-xs text-content-secondary" numberOfLines={1}>
              {it.itemName ?? 'Item'} · {serviceTypeLabel(it.serviceType)} × {it.qty ?? 0}
            </Text>
            {it.amount != null ? (
              <Text className="text-xs text-content-tertiary">₹{it.amount}</Text>
            ) : null}
          </View>
        ))}
      </View>

      <View className="mt-3 flex-row items-center justify-between">
        <Text className="text-sm font-bold text-content">Total</Text>
        <Text className="text-sm font-bold text-primary">₹{order.totalAmount ?? 0}</Text>
      </View>

      {billed ? (
        <Text className="mt-2 text-[11px] text-success">✓ Added to your room bill</Text>
      ) : null}

      {canCancel ? (
        <View className="mt-3">
          <Button
            label="Cancel order"
            variant="ghost"
            size="sm"
            loading={cancelling}
            onPress={onCancel}
            fullWidth
          />
        </View>
      ) : null}
    </Card>
  );
}

export function LaundryOrdersScreen({navigation}: Props) {
  const {theme} = useTheme();
  const vm = useLaundryOrdersViewModel();

  const confirmCancel = (order: LaundryOrder) => {
    Alert.alert('Cancel order', 'Are you sure you want to cancel this laundry order?', [
      {text: 'No', style: 'cancel'},
      {
        text: 'Yes, cancel',
        style: 'destructive',
        onPress: () =>
          vm
            .cancelOrder(order)
            .catch(error =>
              Alert.alert('Error', getApiErrorMessage(error, 'Could not cancel this order.')),
            ),
      },
    ]);
  };

  return (
    <SafeAreaView style={{flex: 1, backgroundColor: theme.colors.background}} edges={['top']}>
      <Header title="My laundry" onBack={() => navigation.goBack()} />

      {vm.isLoading ? (
        <Loader label="Loading orders…" />
      ) : vm.error ? (
        <ErrorState message={vm.error} onRetry={vm.refetch} />
      ) : vm.isEmpty ? (
        <EmptyState
          icon="shirt-outline"
          title="No laundry orders yet"
          message="Your pickup requests will appear here."
          action={
            <Button
              label="Request pickup"
              variant="secondary"
              onPress={() => navigation.navigate('Laundry')}
              fullWidth
            />
          }
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
          {vm.active.length > 0 ? (
            <View className="mb-4">
              <Text className="mb-2 text-sm font-bold text-content-secondary">In Progress</Text>
              {vm.active.map(order => (
                <OrderCard
                  key={order._id}
                  order={order}
                  cancelling={vm.cancellingId === order._id}
                  onCancel={() => confirmCancel(order)}
                />
              ))}
            </View>
          ) : null}

          {vm.past.length > 0 ? (
            <View className="mb-4">
              <Text className="mb-2 text-sm font-bold text-content-secondary">Past Orders</Text>
              {vm.past.map(order => (
                <OrderCard
                  key={order._id}
                  order={order}
                  cancelling={false}
                  onCancel={() => confirmCancel(order)}
                />
              ))}
            </View>
          ) : null}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
