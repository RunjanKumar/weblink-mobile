import React from 'react';
import {RefreshControl, ScrollView, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Button, Card, ErrorState, Header, Loader, RefreshButton, toast} from '../../components';
import {IS_TV} from '../../utils/responsive';
import {useLaundryOrdersViewModel} from '../../viewmodels';
import {useTheme, useStatusTones} from '../../theme';
import {
  LAUNDRY_ORDER_STATUS_TONES,
  LAUNDRY_ORDER_STATUS_LABELS,
  LAUNDRY_ORDER_FLOW,
  serviceTypeLabel,
} from '../../constants/laundry';
import {formatDateTime} from '../../utils/format';
import {getApiErrorMessage} from '../../utils/errorHandler';
import type {LaundryOrder} from '../../models/laundry.model';
import type {HomeStackParamList} from '../../navigation/types';

type Props = NativeStackScreenProps<HomeStackParamList, 'LaundryOrders'>;

function StatusBadge({status}: {status?: string}) {
  const tones = useStatusTones();
  const color = tones[(status ? LAUNDRY_ORDER_STATUS_TONES[status] : undefined) ?? 'muted'];
  const label = status ? LAUNDRY_ORDER_STATUS_LABELS[status] ?? status : 'Unknown';
  return (
    <View
      className="self-start rounded-full px-3 py-1"
      style={{backgroundColor: `${color}22`, borderWidth: 1, borderColor: `${color}66`}}>
      <Text style={{color, fontSize: 11, fontWeight: '600'}}>{label}</Text>
    </View>
  );
}

/**
 * Reference LaundryOrderCard: order number + timestamp (· Express inline),
 * status pill, 5-segment progress track (hidden once cancelled), item lines,
 * Total (incl. tax) row, folio note, and an instant Cancel Request button
 * while the order is still REQUESTED.
 */
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
  const tones = useStatusTones();
  const isCancelled = order.status === 'CANCELLED';
  const currentStep = LAUNDRY_ORDER_FLOW.indexOf(order.status ?? '');
  const canCancel = order.status === 'REQUESTED';
  const billed = order.status === 'DELIVERED' && Boolean(order.folio?.transactionId);

  return (
    <Card className="mb-3">
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-3">
          <Text className="text-sm font-semibold text-content">
            {order.orderNumber ?? `#${order._id.slice(-6)}`}
          </Text>
          {order.createdAt ? (
            <Text className="mt-1 text-[11px] text-content-tertiary">
              {formatDateTime(order.createdAt)}
              {order.isExpress ? (
                <Text style={{color: tones.warning}}> · Express</Text>
              ) : null}
            </Text>
          ) : null}
        </View>
        <StatusBadge status={order.status} />
      </View>

      {!isCancelled ? (
        <View className="mt-4 flex-row items-center" style={{gap: 4}}>
          {LAUNDRY_ORDER_FLOW.map((step, i) => (
            <View
              key={step}
              style={{
                height: 4,
                flex: 1,
                borderRadius: 999,
                backgroundColor: i <= currentStep ? theme.colors.primary : theme.colors.border,
              }}
            />
          ))}
        </View>
      ) : null}

      <View className="mt-4 border-t border-border pt-3">
        {(order.items ?? []).map((it, idx) => (
          <View key={`${it.itemId ?? idx}`} className="mb-1.5 flex-row justify-between">
            <Text className="flex-1 pr-3 text-xs capitalize text-content-secondary" numberOfLines={1}>
              {it.itemName ?? 'Item'} × {it.qty ?? 0}
              <Text className="text-content-tertiary"> · {serviceTypeLabel(it.serviceType)}</Text>
            </Text>
            <Text className="text-xs text-content-tertiary">
              ₹{Number(it.amount ?? 0).toFixed(2)}
            </Text>
          </View>
        ))}

        <View className="mt-2 flex-row justify-between border-t border-border pt-3">
          <Text className="text-sm font-semibold text-content">
            Total{order.taxPercentage ? ' (incl. tax)' : ''}
          </Text>
          <Text className="text-sm font-semibold text-primary">
            ₹{Number(order.totalAmount ?? 0).toFixed(2)}
          </Text>
        </View>

        {billed ? (
          <Text className="mt-2 text-[11px] text-success">Added to your room bill</Text>
        ) : null}
      </View>

      {canCancel ? (
        <View className="mt-4">
          <Button
            label={cancelling ? 'Cancelling…' : 'Cancel Request'}
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
  const tones = useStatusTones();
  const vm = useLaundryOrdersViewModel();

  // Reference cancels immediately (no confirm dialog) and toasts the result.
  const cancel = (order: LaundryOrder) => {
    vm.cancelOrder(order)
      .then(() => toast.success(`Order ${order.orderNumber ?? order._id.slice(-6)} has been cancelled.`))
      .catch(error => toast.error(getApiErrorMessage(error, 'Could not cancel this order.')));
  };

  return (
    <SafeAreaView style={{flex: 1, backgroundColor: theme.colors.background}} edges={['top']}>
      <Header
        title="My Laundry"
        onBack={() => navigation.goBack()}
        right={
          <RefreshButton
            onPress={vm.refetch}
            busy={vm.isRefetching}
            accessibilityLabel="Refresh laundry orders"
          />
        }
      />

      {vm.isLoading ? (
        <Loader label="Loading orders…" />
      ) : vm.error ? (
        <ErrorState message={vm.error} onRetry={vm.refetch} />
      ) : (
        <>
          {vm.isEmpty ? (
            <View className="flex-1 items-center justify-center">
              <Text className="text-sm text-content-tertiary">No laundry orders yet</Text>
            </View>
          ) : (
            <ScrollView
              contentContainerStyle={{paddingHorizontal: 20, paddingBottom: 16}}
              // No pull gesture exists on a remote — TV refreshes from the
              // header button instead.
              refreshControl={
                IS_TV ? undefined : (
                  <RefreshControl
                    refreshing={vm.isRefetching}
                    onRefresh={vm.refetch}
                    tintColor={theme.colors.primary}
                    colors={[theme.colors.primary]}
                  />
                )
              }>
              {vm.active.length > 0 ? (
                <View className="mb-4">
                  <Text className="mb-3 text-sm font-semibold" style={{color: tones.warning}}>
                    In Progress
                  </Text>
                  {vm.active.map(order => (
                    <OrderCard
                      key={order._id}
                      order={order}
                      cancelling={vm.cancellingId === order._id}
                      onCancel={() => cancel(order)}
                    />
                  ))}
                </View>
              ) : null}

              {vm.past.length > 0 ? (
                <View className="mb-4">
                  <Text className="mb-3 text-sm font-semibold text-content-tertiary">
                    Past Orders
                  </Text>
                  {vm.past.map(order => (
                    <OrderCard
                      key={order._id}
                      order={order}
                      cancelling={false}
                      onCancel={() => cancel(order)}
                    />
                  ))}
                </View>
              ) : null}
            </ScrollView>
          )}

          {/* Reference: persistent bottom CTA back to the rate list. */}
          <View className="border-t border-border px-5 pb-6 pt-3">
            <Button label="Request Pickup" onPress={() => navigation.navigate('Laundry')} fullWidth />
          </View>
        </>
      )}
    </SafeAreaView>
  );
}
