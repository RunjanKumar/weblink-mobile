import React, {useState} from 'react';
import {ActivityIndicator, ScrollView, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {toast} from '../../components';
import {
  DS,
  FONT,
  GlassPanel,
  TvBackButton,
  TvBackdrop,
  TvFooter,
  TvPressable,
  TvTopBar,
} from '../../components/TvGlass';
import {useOrderHistoryViewModel} from '../../viewmodels';
import {useAuth} from '../../store/AuthContext';
import {useFoodOrder} from '../../store/FoodOrderContext';
import {formatRupees} from '../../utils';
import {PAYMENT_STATUS_LABELS, TRANSACTION_STATUS} from '../../constants/food';
import {
  FoodImage,
  GlassButton,
  GoldButton,
  MoneyRow,
  OrderThumbs,
  orderItemCount,
  orderStamp,
  orderStatusLabel,
  orderTone,
  useMenuFoodLookup,
} from './components/TvFoodParts';
import {toCartItem} from './foodCart';
import type {FoodOrder} from '../../models/food.model';
import type {HomeStackParamList} from '../../navigation/types';

type Props = NativeStackScreenProps<HomeStackParamList, 'OrderDetail'>;

/**
 * Order Details (TV) — the client's Figma frame 4.
 *
 * The order list stays on the left so the guest can step through their orders
 * WITHOUT going back and forward: picking one here swaps the detail in place
 * (local state), it does not push a screen. Orders come from the same
 * `['food','orders']` query the history frame filled, so opening this screen
 * costs no request and the 30 s poll keeps a live order's status honest.
 *
 * Two Figma elements are not built, because nothing behind them exists yet:
 * the card-number "Payment Method" line (the API reports a payment STATUS, not
 * an instrument — that status is shown instead) and the five-star "How was your
 * dining experience?" row (there is no per-order rating endpoint; the general
 * feedback screen is a different thing and would silently discard the score).
 */

function SectionLabel({children, style}: {children: string; style?: object}) {
  return (
    <Text
      style={{
        color: DS.muted,
        fontSize: 9,
        fontWeight: '700',
        letterSpacing: 1,
        fontFamily: FONT,
        ...(style ?? {}),
      }}>
      {children}
    </Text>
  );
}

/* ── Left rail: every order, compact ── */
function OrderStrip({
  order,
  active,
  imageFor,
  onPress,
}: {
  order: FoodOrder;
  active: boolean;
  imageFor: (name?: string) => string | undefined;
  onPress: () => void;
}) {
  const tone = orderTone(order.status);
  const stamp = orderStamp(order.createdAt);
  return (
    <TvPressable
      onPress={onPress}
      label={`Order ${order._id.slice(-8)}, ${orderStatusLabel(order.status)}`}
      restBorderColor={active ? DS.gold : DS.borderSoft}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        padding: 8,
        marginBottom: 8,
        borderRadius: DS.radiusSm,
        backgroundColor: active ? 'rgba(212,180,131,0.24)' : 'rgba(255,255,255,0.07)',
      }}>
      <View style={{width: 70}}>
        <Text style={{color: DS.text, fontSize: 10, fontWeight: '600', fontFamily: FONT}}>
          {stamp.date}
        </Text>
        <Text style={{color: DS.muted, fontSize: 9, marginTop: 1, fontFamily: FONT}}>
          {stamp.time}
        </Text>
      </View>
      <OrderThumbs order={order} imageFor={imageFor} size={34} />
      <View style={{flex: 1, alignItems: 'flex-end', paddingLeft: 6}}>
        <Text numberOfLines={1} style={{color: tone.color, fontSize: 9, fontWeight: '700', fontFamily: FONT}}>
          {orderStatusLabel(order.status).toUpperCase()}
        </Text>
        <Text style={{color: DS.gold, fontSize: 12, fontWeight: '700', marginTop: 2, fontFamily: FONT}}>
          {formatRupees(order.totalPriceAfterTax ?? order.totalPrice)}
        </Text>
      </View>
    </TvPressable>
  );
}

export function TvOrderDetailScreen({navigation, route}: Props) {
  const vm = useOrderHistoryViewModel();
  const lookup = useMenuFoodLookup();
  const {hotel, session} = useAuth();
  const {addToFoodCart, updateFoodCartQuantity} = useFoodOrder();
  const rootNavigation = useNavigation();

  // Which order the middle/right columns describe. Seeded from the route, then
  // owned by the left rail.
  const [selectedId, setSelectedId] = useState(route.params.orderId);
  const order = vm.orders.find(o => o._id === selectedId) ?? vm.orders[0] ?? null;

  const imageFor = (name?: string) => lookup.find(name)?.imageURL ?? undefined;
  const roomNumber = session?.booking?.roomData?.roomNumber ?? null;

  const onOrderAgain = () => {
    if (!order) {
      return;
    }
    let added = 0;
    let missing = 0;
    for (const line of order.foodItems ?? []) {
      const food = lookup.find(line.foodDetail?.name);
      if (!food || food.isAvailable === false) {
        missing += 1;
        continue;
      }
      addToFoodCart(toCartItem(food));
      const quantity = Math.max(1, line.quantity ?? 1);
      if (quantity > 1) {
        // addToFoodCart queued an append; this functional update runs after it
        // and lands the ORDERED quantity rather than the default step.
        updateFoodCartQuantity(food._id, quantity);
      }
      added += 1;
    }
    if (added === 0) {
      toast.error(
        lookup.isReady
          ? 'These dishes are no longer on the menu.'
          : 'The menu is still loading — please try again.',
      );
      return;
    }
    toast.success(
      missing > 0
        ? `${added} added to your cart · ${missing} no longer available.`
        : 'Added to your cart.',
    );
    navigation.navigate('Cart');
  };

  const tone = orderTone(order?.status);
  const stamp = orderStamp(order?.createdAt);
  const discount =
    (order?.totalPrice ?? 0) - (order?.totalPriceAfterDisCount ?? order?.totalPrice ?? 0);
  const payLabel =
    (order?.paymentStatus != null ? PAYMENT_STATUS_LABELS[order.paymentStatus] : undefined) ??
    'Payment Pending';
  const paid = order?.paymentStatus === TRANSACTION_STATUS.SUCCESS;

  return (
    <SafeAreaView style={{flex: 1, backgroundColor: DS.pageBg}} edges={['top']}>
      <TvBackdrop />

      <View style={{flex: 1, paddingHorizontal: DS.margin, paddingTop: DS.margin, paddingBottom: 14}}>
        <TvTopBar />

        <View style={{flex: 1, flexDirection: 'row', marginTop: 16}}>
          {/* ── Left: the order list ── */}
          <View style={{width: 232, marginRight: DS.gap}}>
            <GlassPanel style={{flex: 1, padding: 12}}>
              <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 12}}>
                <TvBackButton onPress={() => navigation.goBack()} size={32} />
                <View style={{marginLeft: 10, flex: 1}}>
                  <Text
                    numberOfLines={1}
                    style={{
                      color: DS.text,
                      fontSize: 13,
                      fontWeight: '600',
                      letterSpacing: 0.8,
                      fontFamily: FONT,
                    }}>
                    ORDER HISTORY
                  </Text>
                  <Text numberOfLines={1} style={{color: DS.text2, fontSize: 9, marginTop: 2, fontFamily: FONT}}>
                    Your past food orders
                  </Text>
                </View>
              </View>

              <ScrollView style={{flex: 1}} showsVerticalScrollIndicator={false}>
                {vm.orders.map(o => (
                  <OrderStrip
                    key={o._id}
                    order={o}
                    active={o._id === order?._id}
                    imageFor={imageFor}
                    onPress={() => setSelectedId(o._id)}
                  />
                ))}
              </ScrollView>
            </GlassPanel>

            <GlassButton
              label="Back to Orders"
              icon="arrow-back"
              onPress={() => navigation.goBack()}
              height={44}
              style={{marginTop: DS.gap, borderRadius: DS.radius}}
            />
          </View>

          {/* ── Middle: the order itself ── */}
          <GlassPanel style={{flex: 1, marginRight: DS.gap, padding: 16}}>
            {vm.isLoading ? (
              <View style={{flex: 1, alignItems: 'center', justifyContent: 'center'}}>
                <ActivityIndicator size="large" color={DS.gold} />
              </View>
            ) : !order ? (
              <View style={{flex: 1, alignItems: 'center', justifyContent: 'center'}}>
                <Icon name="receipt-outline" size={34} color={DS.muted} />
                <Text style={{color: DS.text, fontSize: 14, marginTop: 12, fontFamily: FONT}}>
                  This order is no longer available
                </Text>
                <GoldButton
                  label="Back to Orders"
                  icon={null}
                  onPress={() => navigation.goBack()}
                  style={{marginTop: 18, alignSelf: 'center'}}
                />
              </View>
            ) : (
              <>
                <View style={{flexDirection: 'row', alignItems: 'center'}}>
                  <Text
                    style={{
                      flex: 1,
                      color: DS.text,
                      fontSize: 16,
                      fontWeight: '600',
                      letterSpacing: 1,
                      fontFamily: FONT,
                    }}>
                    ORDER DETAILS
                  </Text>
                  <SectionLabel>ORDER ID</SectionLabel>
                  <Text style={{color: DS.text, fontSize: 11, marginLeft: 8, fontFamily: FONT}}>
                    #{order._id.slice(-8).toUpperCase()}
                  </Text>
                </View>

                {/* Status banner */}
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    marginTop: 12,
                    paddingHorizontal: 14,
                    paddingVertical: 11,
                    borderRadius: DS.radiusSm,
                    borderWidth: 1,
                    borderColor: `${tone.color}55`,
                    backgroundColor: `${tone.color}1a`,
                  }}>
                  <Icon name={tone.icon} size={18} color={tone.color} />
                  <Text
                    style={{
                      color: tone.color,
                      fontSize: 13,
                      fontWeight: '700',
                      letterSpacing: 0.8,
                      marginLeft: 10,
                      fontFamily: FONT,
                    }}>
                    {orderStatusLabel(order.status).toUpperCase()}
                  </Text>
                  <Text style={{color: DS.text2, fontSize: 11, marginLeft: 12, flex: 1, fontFamily: FONT}}>
                    Placed on {stamp.date} at {stamp.time}
                  </Text>
                </View>

                {/* Items */}
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    marginTop: 16,
                    paddingBottom: 8,
                    borderBottomWidth: 1,
                    borderBottomColor: DS.divider,
                  }}>
                  <Text
                    style={{
                      flex: 1,
                      color: DS.muted,
                      fontSize: 10,
                      fontWeight: '600',
                      letterSpacing: 1,
                      fontFamily: FONT,
                    }}>
                    ORDER ITEMS ({orderItemCount(order)})
                  </Text>
                  <SectionLabel style={{width: 80, textAlign: 'center'}}>PRICE</SectionLabel>
                  <SectionLabel style={{width: 50, textAlign: 'center'}}>QTY</SectionLabel>
                  <SectionLabel style={{width: 84, textAlign: 'right'}}>TOTAL</SectionLabel>
                </View>

                <ScrollView style={{flex: 1}} showsVerticalScrollIndicator={false}>
                  {(order.foodItems ?? []).map((line, index) => (
                    <View
                      key={index}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingVertical: 10,
                        borderTopWidth: index === 0 ? 0 : 1,
                        borderTopColor: DS.divider,
                      }}>
                      <FoodImage src={imageFor(line.foodDetail?.name)} size={46} />
                      <Text
                        numberOfLines={1}
                        style={{
                          flex: 1,
                          color: DS.text,
                          fontSize: 13,
                          marginLeft: 12,
                          fontFamily: FONT,
                        }}>
                        {line.foodDetail?.name ?? 'Item'}
                      </Text>
                      <Text
                        style={{
                          width: 80,
                          color: DS.text2,
                          fontSize: 12,
                          textAlign: 'center',
                          fontFamily: FONT,
                        }}>
                        {formatRupees(line.price)}
                      </Text>
                      <Text
                        style={{
                          width: 50,
                          color: DS.text2,
                          fontSize: 12,
                          textAlign: 'center',
                          fontFamily: FONT,
                        }}>
                        {line.quantity ?? 1}
                      </Text>
                      <Text
                        style={{
                          width: 84,
                          color: DS.text,
                          fontSize: 13,
                          fontWeight: '600',
                          textAlign: 'right',
                          fontFamily: FONT,
                        }}>
                        {formatRupees((line.quantity ?? 1) * (line.price ?? 0))}
                      </Text>
                    </View>
                  ))}
                </ScrollView>

                <GoldButton
                  label="Order Again"
                  icon="refresh"
                  onPress={onOrderAgain}
                  height={44}
                  style={{marginTop: 12, alignSelf: 'flex-end', paddingHorizontal: 26}}
                />
              </>
            )}
          </GlassPanel>

          {/* ── Right: summary ── */}
          <GlassPanel style={{width: 268, padding: 16}}>
            <Text
              style={{
                color: DS.text,
                fontSize: 14,
                fontWeight: '700',
                letterSpacing: 1,
                marginBottom: 12,
                fontFamily: FONT,
              }}>
              ORDER SUMMARY
            </Text>

            <MoneyRow label="Subtotal" value={formatRupees(order?.totalPrice)} />
            {discount > 0 ? (
              <MoneyRow label="Discount" value={`-${formatRupees(discount)}`} positive />
            ) : null}
            <MoneyRow
              label={`Taxes & Charges${order?.tax ? ` (${order.tax}%)` : ''}`}
              value={formatRupees(order?.taxInAmount)}
            />
            <View style={{height: 1, backgroundColor: DS.divider, marginVertical: 10}} />
            <MoneyRow label="Total Amount" value={formatRupees(order?.totalPriceAfterTax)} total />

            {/* Payment — a STATUS, not an instrument: that is all the API has. */}
            <SectionLabel style={{marginTop: 18}}>PAYMENT</SectionLabel>
            <View style={{flexDirection: 'row', alignItems: 'center', marginTop: 6}}>
              <Icon
                name={paid ? 'checkmark-circle-outline' : 'card-outline'}
                size={16}
                color={paid ? '#8FD9A8' : DS.gold}
              />
              <Text
                style={{
                  color: paid ? '#8FD9A8' : DS.text,
                  fontSize: 12,
                  fontWeight: '500',
                  marginLeft: 8,
                  fontFamily: FONT,
                }}>
                {payLabel}
              </Text>
            </View>

            <SectionLabel style={{marginTop: 18}}>DELIVERY ADDRESS</SectionLabel>
            <View style={{flexDirection: 'row', marginTop: 6}}>
              <Icon name="location-outline" size={16} color={DS.text2} />
              <Text style={{flex: 1, color: DS.text2, fontSize: 11, lineHeight: 16, marginLeft: 8, fontFamily: FONT}}>
                {roomNumber != null ? `Room ${roomNumber}` : 'Your room'}
                {hotel?.name ? `, ${hotel.name}` : ''}
              </Text>
            </View>

            <View style={{flex: 1}} />

            <SectionLabel>NEED HELP?</SectionLabel>
            <GlassButton
              label="Contact In-Room Dining"
              icon="headset-outline"
              onPress={() =>
                (rootNavigation as unknown as {navigate: (n: string) => void}).navigate(
                  'ReceptionTab',
                )
              }
              height={42}
              style={{marginTop: 8}}
            />
          </GlassPanel>
        </View>

        <TvFooter marginTop={12} />
      </View>
    </SafeAreaView>
  );
}
