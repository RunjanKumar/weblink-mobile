import React from 'react';
import {ActivityIndicator, ScrollView, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {dialog, toast} from '../../components';
import {
  DS,
  FONT,
  GLASS_BLUR,
  GlassPanel,
  TvBackButton,
  TvBackdrop,
  TvFooter,
  TvPressable,
  TvTopBar,
} from '../../components/TvGlass';
import {useLaundryOrdersViewModel} from '../../viewmodels';
import {formatRupees} from '../../utils';
import {formatDateTime} from '../../utils/format';
import {
  LAUNDRY_ORDER_FLOW,
  LAUNDRY_ORDER_STATUS_LABELS,
  serviceTypeLabel,
} from '../../constants/laundry';
import {getApiErrorMessage} from '../../utils/errorHandler';
import {GarmentPhoto} from './components/GarmentImages';
import type {LaundryOrder} from '../../models/laundry.model';
import type {HomeStackParamList} from '../../navigation/types';

type Props = NativeStackScreenProps<HomeStackParamList, 'LaundryOrders'>;

/**
 * Laundry order history (TV).
 *
 * The phone screen's content — status, the five-step track, item lines, total,
 * cancel-while-REQUESTED — in the glass design system, laid out for ten feet:
 * the track becomes a labelled stepper (a bare 5-segment bar says nothing from
 * across the room), and the cancel gets a confirm dialog, because on a remote
 * the OK button is one press away from wherever focus happens to be.
 *
 * Data is `useLaundryOrdersViewModel`, unchanged and shared with the phone.
 */

/** TV palette is fixed (the glass never follows the light/dark theme). */
const STATUS_TONE: Record<string, string> = {
  REQUESTED: '#E7C77A',
  PICKED_UP: '#9CC7E8',
  IN_PROCESS: '#9CC7E8',
  READY: '#C9B3E8',
  DELIVERED: '#8FD9A8',
  CANCELLED: '#F28B82',
};

const STATUS_ICON: Record<string, string> = {
  REQUESTED: 'time-outline',
  PICKED_UP: 'basket-outline',
  IN_PROCESS: 'water-outline',
  READY: 'checkmark-circle-outline',
  DELIVERED: 'cube-outline',
  CANCELLED: 'close-circle-outline',
};

function toneFor(status?: string): string {
  return (status ? STATUS_TONE[status] : undefined) ?? DS.muted;
}

function labelFor(status?: string): string {
  return (status ? LAUNDRY_ORDER_STATUS_LABELS[status] : undefined) ?? status ?? 'Unknown';
}

/* ── Five-step progress track with labels ── */
function ProgressTrack({status}: {status?: string}) {
  const current = LAUNDRY_ORDER_FLOW.indexOf(status ?? '');
  return (
    <View style={{flexDirection: 'row', marginTop: 14}}>
      {LAUNDRY_ORDER_FLOW.map((step, index) => {
        const done = index <= current;
        return (
          <View key={step} style={{flex: 1, marginRight: index === LAUNDRY_ORDER_FLOW.length - 1 ? 0 : 6}}>
            <View
              style={{
                height: 4,
                borderRadius: 999,
                backgroundColor: done ? DS.gold : 'rgba(255,255,255,0.16)',
              }}
            />
            <Text
              numberOfLines={1}
              style={{
                color: done ? DS.champagne : DS.muted,
                fontSize: 9,
                letterSpacing: 0.4,
                marginTop: 5,
                fontFamily: FONT,
              }}>
              {LAUNDRY_ORDER_STATUS_LABELS[step] ?? step}
            </Text>
          </View>
        );
      })}
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
  const tone = toneFor(order.status);
  const isCancelled = order.status === 'CANCELLED';
  const canCancel = order.status === 'REQUESTED';
  const billed = order.status === 'DELIVERED' && Boolean(order.folio?.transactionId);
  const items = order.items ?? [];

  return (
    <View
      style={{
        borderRadius: DS.radius,
        borderWidth: 1,
        borderColor: DS.borderSoft,
        backgroundColor: 'rgba(255,255,255,0.055)',
        padding: 14,
        marginBottom: DS.gap,
        ...(GLASS_BLUR ?? {}),
      }}>
      {/* Header */}
      <View style={{flexDirection: 'row', alignItems: 'center'}}>
        <View style={{flex: 1}}>
          <Text style={{color: DS.text, fontSize: 14, fontWeight: '600', fontFamily: FONT}}>
            {order.orderNumber ? `Order ${order.orderNumber}` : `Order #${order._id.slice(-6).toUpperCase()}`}
          </Text>
          <View style={{flexDirection: 'row', alignItems: 'center', marginTop: 3}}>
            <Text style={{color: DS.muted, fontSize: 10, fontFamily: FONT}}>
              {order.createdAt ? formatDateTime(order.createdAt) : ''}
            </Text>
            {order.isExpress ? (
              <>
                <Text style={{color: DS.muted, fontSize: 10, marginHorizontal: 6, fontFamily: FONT}}>
                  ·
                </Text>
                <Icon name="flash-outline" size={11} color={DS.gold} />
                <Text style={{color: DS.gold, fontSize: 10, marginLeft: 3, fontFamily: FONT}}>
                  Express
                </Text>
              </>
            ) : null}
          </View>
        </View>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            borderRadius: 999,
            borderWidth: 1,
            borderColor: `${tone}66`,
            backgroundColor: `${tone}1f`,
            paddingHorizontal: 12,
            paddingVertical: 5,
          }}>
          <Icon name={(order.status && STATUS_ICON[order.status]) || 'ellipse-outline'} size={13} color={tone} />
          <Text
            style={{
              color: tone,
              fontSize: 11,
              fontWeight: '700',
              letterSpacing: 0.6,
              marginLeft: 6,
              fontFamily: FONT,
            }}>
            {labelFor(order.status).toUpperCase()}
          </Text>
        </View>
      </View>

      {/* Progress — meaningless once cancelled, so it is dropped there */}
      {!isCancelled ? <ProgressTrack status={order.status} /> : null}

      {/* Items */}
      <View style={{marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: DS.divider}}>
        {items.length === 0 ? (
          <Text style={{color: DS.muted, fontSize: 11, fontFamily: FONT}}>
            No item breakdown was returned for this order.
          </Text>
        ) : (
          items.map((item, index) => (
            <View
              key={`${item.itemId ?? 'item'}-${item.serviceType ?? index}`}
              style={{flexDirection: 'row', alignItems: 'center', paddingVertical: 4}}>
              <GarmentPhoto name={item.itemName} size={28} glyphColor={DS.champagne} />
              <Text
                numberOfLines={1}
                style={{flex: 1, color: DS.text2, fontSize: 12, marginLeft: 10, fontFamily: FONT}}>
                {item.itemName ?? 'Item'} × {item.qty ?? 0}
                <Text style={{color: DS.muted}}> · {serviceTypeLabel(item.serviceType)}</Text>
              </Text>
              <Text style={{color: DS.text, fontSize: 12, fontFamily: FONT}}>
                {formatRupees(item.amount)}
              </Text>
            </View>
          ))
        )}

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: 10,
            paddingTop: 10,
            borderTopWidth: 1,
            borderTopColor: DS.divider,
          }}>
          <Text
            style={{
              color: DS.text,
              fontSize: 12,
              fontWeight: '700',
              letterSpacing: 0.6,
              fontFamily: FONT,
            }}>
            TOTAL{order.taxPercentage ? ' (incl. tax)' : ''}
          </Text>
          <Text style={{color: DS.gold, fontSize: 17, fontWeight: '700', fontFamily: FONT}}>
            {formatRupees(order.totalAmount)}
          </Text>
        </View>

        {billed ? (
          <View style={{flexDirection: 'row', alignItems: 'center', marginTop: 6}}>
            <Icon name="checkmark-circle-outline" size={13} color="#8FD9A8" />
            <Text style={{color: '#8FD9A8', fontSize: 10, marginLeft: 6, fontFamily: FONT}}>
              Added to your room bill
            </Text>
          </View>
        ) : null}
      </View>

      {canCancel ? (
        <TvPressable
          onPress={cancelling ? () => {} : onCancel}
          label="Cancel this laundry request"
          restBorderColor="rgba(242,139,130,0.55)"
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            height: 38,
            marginTop: 12,
            borderRadius: 10,
            backgroundColor: 'rgba(242,139,130,0.12)',
            opacity: cancelling ? 0.6 : 1,
          }}>
          {cancelling ? (
            <ActivityIndicator size="small" color={DS.danger} />
          ) : (
            <>
              <Icon name="close-circle-outline" size={14} color={DS.danger} />
              <Text
                style={{
                  color: DS.danger,
                  fontSize: 11,
                  fontWeight: '700',
                  letterSpacing: 0.8,
                  marginLeft: 8,
                  fontFamily: FONT,
                }}>
                CANCEL REQUEST
              </Text>
            </>
          )}
        </TvPressable>
      ) : null}
    </View>
  );
}

function SectionHeading({label, color}: {label: string; color: string}) {
  return (
    <Text
      style={{
        color,
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 1.2,
        marginBottom: 10,
        fontFamily: FONT,
      }}>
      {label}
    </Text>
  );
}

export function TvLaundryOrdersScreen({navigation}: Props) {
  const vm = useLaundryOrdersViewModel();
  const rootNavigation = useNavigation();

  /**
   * The phone cancels instantly; a remote must not. Focus can land on this
   * button while the guest is only scrolling, and one OK press would drop a
   * real request with no way back.
   */
  const cancel = async (order: LaundryOrder) => {
    const confirmed = await dialog.confirm({
      title: 'Cancel this laundry request?',
      message: 'Housekeeping will not collect these items.',
      confirmLabel: 'Cancel Request',
      cancelLabel: 'Keep It',
      destructive: true,
    });
    if (!confirmed) {
      return;
    }
    vm.cancelOrder(order)
      .then(() =>
        toast.success(`Order ${order.orderNumber ?? order._id.slice(-6)} has been cancelled.`),
      )
      .catch(error => toast.error(getApiErrorMessage(error, 'Could not cancel this order.')));
  };

  return (
    <SafeAreaView style={{flex: 1, backgroundColor: DS.pageBg}} edges={['top']}>
      <TvBackdrop />

      <View style={{flex: 1, paddingHorizontal: DS.margin, paddingTop: DS.margin, paddingBottom: 14}}>
        <TvTopBar />

        <View style={{flex: 1, flexDirection: 'row', marginTop: 16}}>
          {/* ── Left: the orders ── */}
          <GlassPanel style={{flex: 1, marginRight: DS.gap, padding: 16}}>
            <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 14}}>
              <TvBackButton onPress={() => navigation.goBack()} size={40} />
              <View style={{flex: 1, marginLeft: 14}}>
                <Text
                  style={{
                    color: DS.text,
                    fontSize: 17,
                    fontWeight: '600',
                    letterSpacing: 1,
                    fontFamily: FONT,
                  }}>
                  LAUNDRY ORDERS
                </Text>
                <Text style={{color: DS.text2, fontSize: 10, marginTop: 2, fontFamily: FONT}}>
                  Track every request from pickup to delivery
                </Text>
              </View>
              <TvPressable
                onPress={() => vm.refetch()}
                label="Refresh laundry orders"
                restBorderColor={DS.border}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  height: 36,
                  borderRadius: 10,
                  paddingHorizontal: 14,
                  backgroundColor: 'rgba(255,255,255,0.08)',
                }}>
                {vm.isRefetching ? (
                  <ActivityIndicator size="small" color={DS.gold} />
                ) : (
                  <Icon name="refresh" size={15} color={DS.text} />
                )}
                <Text
                  style={{
                    color: DS.text,
                    fontSize: 11,
                    fontWeight: '600',
                    letterSpacing: 0.6,
                    marginLeft: 8,
                    fontFamily: FONT,
                  }}>
                  REFRESH
                </Text>
              </TvPressable>
            </View>

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
                <TvPressable
                  onPress={() => vm.refetch()}
                  label="Try again"
                  restBorderColor="#E5CFA5"
                  style={{
                    height: 38,
                    justifyContent: 'center',
                    borderRadius: 11,
                    paddingHorizontal: 22,
                    backgroundColor: DS.gold,
                    marginTop: 16,
                  }}>
                  <Text
                    style={{
                      color: DS.text,
                      fontSize: 12,
                      fontWeight: '700',
                      letterSpacing: 1,
                      fontFamily: FONT,
                    }}>
                    TRY AGAIN
                  </Text>
                </TvPressable>
              </View>
            ) : vm.isEmpty ? (
              <View style={{flex: 1, alignItems: 'center', justifyContent: 'center'}}>
                <Icon name="shirt-outline" size={34} color={DS.muted} />
                <Text style={{color: DS.text, fontSize: 15, marginTop: 12, fontFamily: FONT}}>
                  No laundry orders yet
                </Text>
                <Text style={{color: DS.text2, fontSize: 11, marginTop: 4, fontFamily: FONT}}>
                  Your requests will appear here once you send one.
                </Text>
              </View>
            ) : (
              <ScrollView style={{flex: 1}} showsVerticalScrollIndicator={false}>
                {vm.active.length > 0 ? (
                  <>
                    <SectionHeading label="IN PROGRESS" color="#E7C77A" />
                    {vm.active.map(order => (
                      <OrderCard
                        key={order._id}
                        order={order}
                        cancelling={vm.cancellingId === order._id}
                        onCancel={() => cancel(order)}
                      />
                    ))}
                  </>
                ) : null}

                {vm.past.length > 0 ? (
                  <>
                    <SectionHeading label="PAST ORDERS" color={DS.muted} />
                    {vm.past.map(order => (
                      <OrderCard
                        key={order._id}
                        order={order}
                        cancelling={false}
                        onCancel={() => cancel(order)}
                      />
                    ))}
                  </>
                ) : null}
              </ScrollView>
            )}
          </GlassPanel>

          {/* ── Right: at-a-glance + the way back into the rate list ── */}
          <View style={{width: 300}}>
            <GlassPanel style={{flex: 1, padding: 16}}>
              <Text
                style={{
                  color: DS.text,
                  fontSize: 13,
                  fontWeight: '700',
                  letterSpacing: 1,
                  fontFamily: FONT,
                }}>
                AT A GLANCE
              </Text>

              <View style={{flexDirection: 'row', marginTop: 14}}>
                <View style={{flex: 1}}>
                  <Text style={{color: DS.gold, fontSize: 30, fontWeight: '600', fontFamily: FONT}}>
                    {vm.active.length}
                  </Text>
                  <Text style={{color: DS.text2, fontSize: 10, marginTop: 2, fontFamily: FONT}}>
                    In progress
                  </Text>
                </View>
                <View style={{width: 1, backgroundColor: DS.divider, marginHorizontal: 10}} />
                <View style={{flex: 1}}>
                  <Text style={{color: DS.text, fontSize: 30, fontWeight: '600', fontFamily: FONT}}>
                    {vm.past.length}
                  </Text>
                  <Text style={{color: DS.text2, fontSize: 10, marginTop: 2, fontFamily: FONT}}>
                    Completed
                  </Text>
                </View>
              </View>

              <Text
                style={{
                  color: DS.text2,
                  fontSize: 10,
                  lineHeight: 15,
                  marginTop: 16,
                  fontFamily: FONT,
                }}>
                Charges are added to your room bill once housekeeping delivers the order. You can
                cancel a request until it is picked up.
              </Text>

              <View style={{flex: 1}} />

              <TvPressable
                onPress={() => navigation.navigate('Laundry')}
                label="Request a new pickup"
                restBorderColor="#E5CFA5"
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: 46,
                  borderRadius: 11,
                  backgroundColor: DS.gold,
                }}>
                <Text
                  style={{
                    color: DS.text,
                    fontSize: 12,
                    fontWeight: '700',
                    letterSpacing: 1,
                    fontFamily: FONT,
                  }}>
                  NEW PICKUP
                </Text>
                <Icon name="add" size={16} color={DS.text} style={{marginLeft: 8}} />
              </TvPressable>

              <View style={{flexDirection: 'row', alignItems: 'center', marginTop: 14}}>
                <View style={{flex: 1, paddingRight: 10}}>
                  <Text
                    style={{
                      color: DS.text,
                      fontSize: 11,
                      fontWeight: '600',
                      letterSpacing: 0.6,
                      fontFamily: FONT,
                    }}>
                    NEED ASSISTANCE?
                  </Text>
                  <Text style={{color: DS.muted, fontSize: 9, marginTop: 2, fontFamily: FONT}}>
                    Press OK to chat with Front Desk
                  </Text>
                </View>
                <TvPressable
                  onPress={() =>
                    (rootNavigation as unknown as {navigate: (n: string) => void}).navigate(
                      'ReceptionTab',
                    )
                  }
                  label="Chat with front desk"
                  restBorderColor="rgba(212,180,131,0.55)"
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 21,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'rgba(212,180,131,0.16)',
                  }}>
                  <Icon name="headset-outline" size={20} color={DS.gold} />
                </TvPressable>
              </View>
            </GlassPanel>
          </View>
        </View>

        <TvFooter marginTop={12} />
      </View>
    </SafeAreaView>
  );
}
