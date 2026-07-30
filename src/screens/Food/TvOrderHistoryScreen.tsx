import React, {useMemo, useState} from 'react';
import {ActivityIndicator, ScrollView, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {
  DS,
  FONT,
  GlassPanel,
  TvBackdrop,
  TvFooter,
  TvPressable,
  TvTopBar,
} from '../../components/TvGlass';
import {useFoodMenuViewModel, useOrderHistoryViewModel} from '../../viewmodels';
import {formatRupees} from '../../utils';
import {BOOKING_STATUS} from '../../constants/status';
import {
  FoodRail,
  GlassButton,
  GoldButton,
  OrderThumbs,
  orderItemCount,
  orderStamp,
  orderStatusLabel,
  orderTone,
  useMenuFoodLookup,
} from './components/TvFoodParts';
import type {FoodOrder} from '../../models/food.model';
import type {HomeStackParamList} from '../../navigation/types';

type Props = NativeStackScreenProps<HomeStackParamList, 'OrderHistory'>;

/**
 * Order History (TV) — the client's Figma frame 3.
 *
 * The same category rail as the menu (so the guest can jump straight back into
 * ordering) beside a list of past orders: stamp, dish thumbnails, order id,
 * status, amount, and a way into the detail frame.
 *
 * Polling, the 30 s refresh while an order is live, and the "no online payment
 * on TV" rule all come from `useOrderHistoryViewModel` — this screen only
 * lays them out.
 */

/** The status filter behind the Figma's "All Orders" dropdown. */
const FILTERS: {id: number | null; label: string}[] = [
  {id: null, label: 'All Orders'},
  {id: BOOKING_STATUS.PENDING, label: 'Order Placed'},
  {id: BOOKING_STATUS.IN_PROGRESS, label: 'Preparing'},
  {id: BOOKING_STATUS.COMPLETED, label: 'Delivered'},
  {id: BOOKING_STATUS.CANCEL, label: 'Cancelled'},
];

function OrderRow({
  order,
  imageFor,
  onOpen,
}: {
  order: FoodOrder;
  imageFor: (name?: string) => string | undefined;
  onOpen: () => void;
}) {
  const tone = orderTone(order.status);
  const stamp = orderStamp(order.createdAt);
  const count = orderItemCount(order);

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        marginBottom: DS.gap,
        borderRadius: DS.radius,
        borderWidth: 1,
        borderColor: DS.borderSoft,
        backgroundColor: 'rgba(255,255,255,0.07)',
      }}>
      {/* Stamp */}
      <View style={{width: 96}}>
        <Text style={{color: DS.text, fontSize: 12, fontWeight: '600', fontFamily: FONT}}>
          {stamp.date}
        </Text>
        <Text style={{color: DS.muted, fontSize: 10, marginTop: 2, fontFamily: FONT}}>
          {stamp.time}
        </Text>
      </View>

      <OrderThumbs order={order} imageFor={imageFor} size={54} />

      {/* Identity */}
      <View style={{flex: 1, paddingHorizontal: 14}}>
        <Text style={{color: DS.muted, fontSize: 9, letterSpacing: 0.8, fontFamily: FONT}}>
          ORDER ID
        </Text>
        <Text numberOfLines={1} style={{color: DS.text, fontSize: 12, marginTop: 2, fontFamily: FONT}}>
          #{order._id.slice(-8).toUpperCase()}
        </Text>
        <Text style={{color: DS.text2, fontSize: 10, marginTop: 4, fontFamily: FONT}}>
          {count} {count === 1 ? 'Item' : 'Items'}
        </Text>
      </View>

      {/* Status */}
      <View style={{width: 132, alignItems: 'flex-start'}}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            borderRadius: 999,
            borderWidth: 1,
            borderColor: `${tone.color}66`,
            backgroundColor: `${tone.color}1f`,
            paddingHorizontal: 10,
            paddingVertical: 4,
          }}>
          <Icon name={tone.icon} size={13} color={tone.color} />
          <Text
            style={{
              color: tone.color,
              fontSize: 10,
              fontWeight: '700',
              letterSpacing: 0.6,
              marginLeft: 6,
              fontFamily: FONT,
            }}>
            {orderStatusLabel(order.status).toUpperCase()}
          </Text>
        </View>
      </View>

      {/* Money + CTA */}
      <View style={{width: 132, alignItems: 'flex-end'}}>
        <Text style={{color: DS.gold, fontSize: 15, fontWeight: '700', fontFamily: FONT}}>
          {formatRupees(order.totalPriceAfterTax ?? order.totalPrice)}
        </Text>
        <GlassButton
          label="View Details"
          onPress={onOpen}
          height={30}
          style={{marginTop: 8, paddingHorizontal: 10}}
        />
      </View>
    </View>
  );
}

export function TvOrderHistoryScreen({navigation}: Props) {
  const vm = useOrderHistoryViewModel();
  const menu = useFoodMenuViewModel();
  const lookup = useMenuFoodLookup();
  const [statusFilter, setStatusFilter] = useState<number | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);

  const railCategories = useMemo(
    () => menu.categories.map(cat => ({id: cat._id, name: cat.name ?? 'Category'})),
    [menu.categories],
  );

  const orders = useMemo(
    () => (statusFilter == null ? vm.orders : vm.orders.filter(o => o.status === statusFilter)),
    [vm.orders, statusFilter],
  );

  const activeFilterLabel =
    FILTERS.find(f => f.id === statusFilter)?.label ?? 'All Orders';

  const imageFor = (name?: string) => lookup.find(name)?.imageURL ?? undefined;

  return (
    <SafeAreaView style={{flex: 1, backgroundColor: DS.pageBg}} edges={['top']}>
      <TvBackdrop />

      <View style={{flex: 1, paddingHorizontal: DS.margin, paddingTop: DS.margin, paddingBottom: 14}}>
        <TvTopBar />

        <View style={{flex: 1, flexDirection: 'row', marginTop: 16}}>
          <FoodRail
            title="Food Order"
            subtitle="Order delicious meals"
            onBack={() => navigation.goBack()}
            categories={railCategories}
            activeId={null}
            historyActive
            onSelect={id => navigation.navigate('Food', {foodCategoryId: id})}
            onHistory={() => vm.refetch()}
          />

          <GlassPanel style={{flex: 1, padding: 16}}>
            {/* Header + filter */}
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
              <View style={{flex: 1}}>
                <Text
                  style={{
                    color: DS.text,
                    fontSize: 16,
                    fontWeight: '600',
                    letterSpacing: 1,
                    fontFamily: FONT,
                  }}>
                  ORDER HISTORY
                </Text>
                <Text style={{color: DS.text2, fontSize: 10, marginTop: 2, fontFamily: FONT}}>
                  Your past food orders
                </Text>
              </View>

              <GlassButton
                label={vm.isRefetching ? 'Refreshing…' : 'Refresh'}
                icon="refresh"
                onPress={() => vm.refetch()}
                height={38}
                style={{marginRight: DS.gap}}
              />
              <GlassButton
                label={activeFilterLabel}
                icon="funnel-outline"
                onPress={() => setFilterOpen(open => !open)}
                height={38}
                style={{
                  width: 168,
                  backgroundColor:
                    statusFilter == null ? 'rgba(255,255,255,0.10)' : 'rgba(212,180,131,0.28)',
                }}
              />
            </View>

            {/* Filter menu — an inline list, not a native picker: a dropdown
                overlay cannot be walked reliably with a D-pad. */}
            {filterOpen ? (
              <View
                style={{
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  gap: 8,
                  marginTop: 12,
                  paddingTop: 12,
                  borderTopWidth: 1,
                  borderTopColor: DS.divider,
                }}>
                {FILTERS.map(filter => {
                  const active = filter.id === statusFilter;
                  return (
                    <TvPressable
                      key={String(filter.id)}
                      onPress={() => {
                        setStatusFilter(filter.id);
                        setFilterOpen(false);
                      }}
                      label={filter.label}
                      restBorderColor={active ? DS.gold : DS.borderSoft}
                      style={{
                        borderRadius: 999,
                        paddingHorizontal: 14,
                        paddingVertical: 6,
                        backgroundColor: active ? 'rgba(212,180,131,0.30)' : 'rgba(255,255,255,0.08)',
                      }}>
                      <Text
                        style={{
                          color: active ? DS.gold : DS.text,
                          fontSize: 11,
                          fontWeight: '600',
                          fontFamily: FONT,
                        }}>
                        {filter.label}
                      </Text>
                    </TvPressable>
                  );
                })}
              </View>
            ) : null}

            {/* List */}
            {vm.isLoading ? (
              <View style={{flex: 1, alignItems: 'center', justifyContent: 'center'}}>
                <ActivityIndicator size="large" color={DS.gold} />
                <Text style={{color: DS.text2, fontSize: 13, marginTop: 12, fontFamily: FONT}}>
                  Loading your orders…
                </Text>
              </View>
            ) : vm.error ? (
              <View style={{flex: 1, alignItems: 'center', justifyContent: 'center'}}>
                <Icon name="cloud-offline-outline" size={34} color={DS.gold} />
                <Text
                  style={{
                    color: DS.text2,
                    fontSize: 13,
                    marginTop: 12,
                    textAlign: 'center',
                    fontFamily: FONT,
                  }}>
                  {vm.error}
                </Text>
                <GoldButton
                  label="Try again"
                  icon={null}
                  onPress={() => vm.refetch()}
                  style={{marginTop: 16, alignSelf: 'center'}}
                />
              </View>
            ) : orders.length === 0 ? (
              <View style={{flex: 1, alignItems: 'center', justifyContent: 'center'}}>
                <Icon name="receipt-outline" size={34} color={DS.muted} />
                <Text style={{color: DS.text, fontSize: 14, marginTop: 12, fontFamily: FONT}}>
                  {statusFilter == null ? 'No orders yet' : 'No orders with this status'}
                </Text>
                <Text style={{color: DS.text2, fontSize: 11, marginTop: 4, fontFamily: FONT}}>
                  Your food orders will show up here.
                </Text>
                <GoldButton
                  label="Order Food"
                  onPress={() => navigation.navigate('Food')}
                  style={{marginTop: 18, alignSelf: 'center'}}
                />
              </View>
            ) : (
              <ScrollView style={{flex: 1, marginTop: 14}} showsVerticalScrollIndicator={false}>
                {orders.map(order => (
                  <OrderRow
                    key={order._id}
                    order={order}
                    imageFor={imageFor}
                    onOpen={() => navigation.navigate('OrderDetail', {orderId: order._id})}
                  />
                ))}
              </ScrollView>
            )}
          </GlassPanel>
        </View>

        <TvFooter marginTop={12} />
      </View>
    </SafeAreaView>
  );
}
