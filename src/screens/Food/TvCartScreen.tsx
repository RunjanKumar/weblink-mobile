import React from 'react';
import {ScrollView, Text, TextInput, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {dialog} from '../../components';
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
import {useCartViewModel} from '../../viewmodels';
import {useFoodOrder} from '../../store/FoodOrderContext';
import {useTVFocus} from '../../hooks/useTVFocus';
import {formatRupees} from '../../utils';
import {
  BusyOverlay,
  FoodImage,
  GlassButton,
  GoldButton,
  MoneyRow,
  QtyStepper,
  placeTvOrder,
} from './components/TvFoodParts';
import type {HomeStackParamList} from '../../navigation/types';

type Props = NativeStackScreenProps<HomeStackParamList, 'Cart'>;

/**
 * View Cart (TV) — the client's Figma frame 2.
 *
 * The order as a table (item / price / qty / total) with the summary column on
 * the right. Same ViewModel as the phone cart, so coupons, discount-aware line
 * totals and the tax base all behave identically; only the layout is the
 * ten-foot one.
 *
 * Payment: TV orders are always placed as cash on delivery — see `placeTvOrder`
 * for why the phone's payment sheet cannot exist here.
 */

/* Table column widths (the Figma's, ÷1.5). ITEM takes what is left. */
const COL_PRICE = 90;
const COL_QTY = 118;
const COL_TOTAL = 90;
const COL_BIN = 40;

function ColumnHeader({label, width}: {label: string; width: number}) {
  return (
    <Text
      style={{
        width,
        color: DS.muted,
        fontSize: 10,
        fontWeight: '600',
        letterSpacing: 1,
        textAlign: 'center',
        fontFamily: FONT,
      }}>
      {label}
    </Text>
  );
}

/* ── Coupon input ── */
function CouponField({
  value,
  onChange,
  onSubmit,
  editable,
}: {
  value: string;
  onChange: (next: string) => void;
  onSubmit: () => void;
  editable: boolean;
}) {
  const {focused, onFocus, onBlur} = useTVFocus();
  return (
    <View
      style={{
        height: 40,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        borderRadius: DS.radiusSm,
        borderWidth: 2,
        borderColor: focused ? DS.focus : DS.borderSoft,
        backgroundColor: 'rgba(255,255,255,0.08)',
      }}>
      <Icon name="pricetag-outline" size={14} color={DS.muted} />
      <TextInput
        value={value}
        onChangeText={onChange}
        onFocus={onFocus}
        onBlur={onBlur}
        onSubmitEditing={onSubmit}
        editable={editable}
        placeholder="COUPON CODE"
        placeholderTextColor={DS.muted}
        autoCapitalize="characters"
        autoCorrect={false}
        accessibilityLabel="Coupon code"
        style={{flex: 1, marginLeft: 8, color: DS.text, fontSize: 12, letterSpacing: 1.5, fontFamily: FONT}}
      />
    </View>
  );
}

export function TvCartScreen({navigation}: Props) {
  const vm = useCartViewModel();
  const {clearFoodCart} = useFoodOrder();
  const busy = vm.isPlacingOrder || vm.paymentProcessing;

  const onClear = async () => {
    const confirmed = await dialog.confirm({
      title: 'Clear your cart?',
      message: 'Every dish you added will be removed.',
      confirmLabel: 'Clear Cart',
      cancelLabel: 'Keep Items',
      destructive: true,
    });
    if (confirmed) {
      clearFoodCart();
    }
  };

  const goToMenu = () =>
    navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Food');

  return (
    <SafeAreaView style={{flex: 1, backgroundColor: DS.pageBg}} edges={['top']}>
      <TvBackdrop />

      <View style={{flex: 1, paddingHorizontal: DS.margin, paddingTop: DS.margin, paddingBottom: 14}}>
        <TvTopBar />

        <View style={{flex: 1, flexDirection: 'row', marginTop: 16}}>
          {/* ── Left: the order as a table ── */}
          <GlassPanel style={{flex: 1, marginRight: DS.gap, padding: 16}}>
            <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 16}}>
              <TvBackButton onPress={goToMenu} size={40} />
              <View style={{marginLeft: 12}}>
                <Text
                  style={{
                    color: DS.text,
                    fontSize: 17,
                    fontWeight: '600',
                    letterSpacing: 1,
                    fontFamily: FONT,
                  }}>
                  VIEW CART
                </Text>
                <Text style={{color: DS.text2, fontSize: 10, marginTop: 2, fontFamily: FONT}}>
                  Review your items before placing the order
                </Text>
              </View>
            </View>

            {vm.items.length === 0 ? (
              <View style={{flex: 1, alignItems: 'center', justifyContent: 'center'}}>
                <Icon name="cart-outline" size={36} color={DS.muted} />
                <Text style={{color: DS.text, fontSize: 15, marginTop: 12, fontFamily: FONT}}>
                  Your cart is empty
                </Text>
                <Text style={{color: DS.text2, fontSize: 11, marginTop: 4, fontFamily: FONT}}>
                  Add some dishes from the menu to get started.
                </Text>
                <GoldButton
                  label="Browse Menu"
                  onPress={goToMenu}
                  style={{marginTop: 18, alignSelf: 'center'}}
                />
              </View>
            ) : (
              <>
                {/* Column headers */}
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingBottom: 10,
                    borderBottomWidth: 1,
                    borderBottomColor: DS.divider,
                  }}>
                  {/* ITEM spans the thumbnail + name columns of the rows below */}
                  <Text
                    style={{
                      flex: 1,
                      color: DS.muted,
                      fontSize: 10,
                      fontWeight: '600',
                      letterSpacing: 1,
                      fontFamily: FONT,
                    }}>
                    ITEM
                  </Text>
                  <ColumnHeader label="PRICE" width={COL_PRICE} />
                  <ColumnHeader label="QTY" width={COL_QTY} />
                  <ColumnHeader label="TOTAL" width={COL_TOTAL} />
                  <View style={{width: COL_BIN}} />
                </View>

                <ScrollView style={{flex: 1}} showsVerticalScrollIndicator={false}>
                  {vm.items.map((item, index) => (
                    <View
                      key={item.id}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingVertical: 12,
                        borderTopWidth: index === 0 ? 0 : 1,
                        borderTopColor: DS.divider,
                      }}>
                      <FoodImage src={item.imageURL} size={54} />
                      <View style={{flex: 1, paddingHorizontal: 12}}>
                        <Text
                          numberOfLines={1}
                          style={{color: DS.text, fontSize: 13, fontWeight: '500', fontFamily: FONT}}>
                          {item.title ?? item.name ?? 'Item'}
                        </Text>
                        {item.isAddOn && item.parentFoodTitle ? (
                          <Text style={{color: DS.muted, fontSize: 9, marginTop: 3, fontFamily: FONT}}>
                            Add-on · {item.parentFoodTitle}
                          </Text>
                        ) : null}
                      </View>
                      <Text
                        style={{
                          width: COL_PRICE,
                          color: DS.text2,
                          fontSize: 12,
                          textAlign: 'center',
                          fontFamily: FONT,
                        }}>
                        {formatRupees(item.unitPrice)}
                      </Text>
                      <View style={{width: COL_QTY, alignItems: 'center'}}>
                        <QtyStepper
                          quantity={item.quantity}
                          size={24}
                          onIncrement={() => vm.increment(item)}
                          onDecrement={() => vm.decrement(item)}
                        />
                      </View>
                      <Text
                        style={{
                          width: COL_TOTAL,
                          color: DS.text,
                          fontSize: 13,
                          fontWeight: '600',
                          textAlign: 'center',
                          fontFamily: FONT,
                        }}>
                        {formatRupees(item.lineTotal)}
                      </Text>
                      <View style={{width: COL_BIN, alignItems: 'flex-end'}}>
                        <TvPressable
                          onPress={() => vm.remove(item)}
                          label={`Remove ${item.title ?? 'item'}`}
                          style={{borderRadius: 8, padding: 5}}>
                          <Icon name="trash-outline" size={16} color={DS.muted} />
                        </TvPressable>
                      </View>
                    </View>
                  ))}
                </ScrollView>

                {/* Footer actions */}
                <View style={{flexDirection: 'row', marginTop: 12, gap: DS.gap}}>
                  <GlassButton
                    label="Continue Ordering"
                    icon="arrow-back"
                    onPress={goToMenu}
                    height={44}
                    style={{flex: 1}}
                  />
                  <GlassButton
                    label="Clear Cart"
                    icon="trash-outline"
                    onPress={onClear}
                    height={44}
                    style={{flex: 1}}
                  />
                </View>
              </>
            )}
          </GlassPanel>

          {/* ── Right: order summary ── */}
          <GlassPanel style={{width: 300, padding: 16}}>
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

            <MoneyRow
              label={`Subtotal (${vm.itemCount} ${vm.itemCount === 1 ? 'Item' : 'Items'})`}
              value={formatRupees(vm.itemsTotal)}
            />
            {vm.totalSavings > 0 ? (
              <MoneyRow label="Coupon savings" value={`-${formatRupees(vm.totalSavings)}`} positive />
            ) : null}
            <MoneyRow
              label={`Taxes & Charges${vm.taxRate ? ` (${vm.taxRate}%)` : ''}`}
              value={formatRupees(vm.taxAmount)}
            />
            <View style={{height: 1, backgroundColor: DS.divider, marginVertical: 10}} />
            <MoneyRow label="Total Amount" value={formatRupees(vm.payableAmount)} total />

            {/* Estimated delivery (Figma copy — the backend has no ETA field) */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginTop: 14,
                paddingHorizontal: 12,
                paddingVertical: 10,
                borderRadius: DS.radiusSm,
                borderWidth: 1,
                borderColor: DS.borderSoft,
                backgroundColor: 'rgba(255,255,255,0.06)',
              }}>
              <Icon name="time-outline" size={16} color={DS.text2} />
              <View style={{marginLeft: 10}}>
                <Text style={{color: DS.muted, fontSize: 9, letterSpacing: 0.8, fontFamily: FONT}}>
                  ESTIMATED DELIVERY
                </Text>
                <Text style={{color: DS.gold, fontSize: 13, fontWeight: '600', fontFamily: FONT}}>
                  30–40 min
                </Text>
              </View>
            </View>

            {/* Delivery target — the order posts to this room, so show it. */}
            <View style={{flexDirection: 'row', alignItems: 'center', marginTop: 10}}>
              <Icon name="location-outline" size={14} color={DS.text2} />
              <Text style={{color: DS.text2, fontSize: 11, marginLeft: 8, flex: 1, fontFamily: FONT}}>
                {vm.roomNumber != null
                  ? `Room ${vm.roomNumber} · ${vm.guestName}`
                  : 'Room details missing — please sign in again'}
              </Text>
            </View>

            {/* Coupon */}
            <View style={{marginTop: 14}}>
              <CouponField
                value={vm.couponCode}
                onChange={vm.onCouponChange}
                onSubmit={vm.applyCoupon}
                editable={!vm.isApplyingCoupon}
              />
              {vm.appliedCouponName ? (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    marginTop: 8,
                    paddingHorizontal: 10,
                    paddingVertical: 8,
                    borderRadius: DS.radiusSm,
                    borderWidth: 1,
                    borderColor: 'rgba(212,180,131,0.55)',
                    backgroundColor: 'rgba(212,180,131,0.14)',
                  }}>
                  <Text style={{flex: 1, color: DS.gold, fontSize: 11, fontWeight: '600', fontFamily: FONT}}>
                    {vm.appliedCouponName} applied
                  </Text>
                  <TvPressable
                    onPress={vm.removeCoupon}
                    label="Remove coupon"
                    restBorderColor="rgba(242,139,130,0.5)"
                    style={{borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3}}>
                    <Text style={{color: DS.danger, fontSize: 10, fontWeight: '700', fontFamily: FONT}}>
                      REMOVE
                    </Text>
                  </TvPressable>
                </View>
              ) : (
                <GlassButton
                  label={vm.isApplyingCoupon ? 'Applying…' : 'Apply Coupon'}
                  onPress={vm.applyCoupon}
                  height={36}
                  style={{marginTop: 8}}
                />
              )}
            </View>

            <View style={{flex: 1}} />

            <GoldButton
              label="Place Order"
              onPress={() => placeTvOrder(vm.placeOrder, () =>
                // The cart is empty by now, so Back must not land here again.
                navigation.reset({index: 1, routes: [{name: 'Food'}, {name: 'OrderHistory'}]}),
              )}
              disabled={busy || vm.items.length === 0}
              height={48}
              style={{marginTop: 14}}
            />
            <View
              style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 8}}>
              <Icon name="lock-closed-outline" size={11} color={DS.muted} />
              <Text style={{color: DS.muted, fontSize: 10, marginLeft: 6, fontFamily: FONT}}>
                Billed to your room · pay at checkout
              </Text>
            </View>
          </GlassPanel>
        </View>

        <TvFooter marginTop={12} />
      </View>

      {busy ? (
        <BusyOverlay label={vm.paymentProcessing ? 'Verifying payment…' : 'Placing your order…'} />
      ) : null}
    </SafeAreaView>
  );
}
