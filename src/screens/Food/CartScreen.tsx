import React, {useState} from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Button, EmptyState, Header, toast} from '../../components';
import {useCartViewModel, type PaymentMethod} from '../../viewmodels';
import {useTheme} from '../../theme';
import {IS_TV, IS_WEB_BUILD} from '../../utils/responsive';
import {getApiErrorMessage} from '../../utils/errorHandler';
import {BillDetails} from './components/BillDetails';
import {CartItemRow} from './components/CartItemRow';
import {DeliveryCard} from './components/DeliveryCard';
import {PaymentSheet} from './components/PaymentSheet';
import type {HomeStackParamList} from '../../navigation/types';

type Props = NativeStackScreenProps<HomeStackParamList, 'Cart'>;

/**
 * Cart — reference `Cart.jsx`: item rows, coupon input + applied banner,
 * delivery card, collapsible bill, bottom bar [Apply Coupon][Place Order],
 * payment bottom sheet (TV: cash only), full-screen processing overlay.
 *
 * The webOS build skips the payment sheet entirely and orders as cash on
 * delivery — the sheet already hid the online option and preselected cash on a
 * TV, so the only thing lost is a confirmation step the client did not want.
 * It also replaces the stack on success so Back from the orders page reaches
 * the food menu rather than this screen, which is empty by then.
 */
export function CartScreen({navigation}: Props) {
  const {theme} = useTheme();
  const vm = useCartViewModel();
  const [sheetOpen, setSheetOpen] = useState(false);
  const busy = vm.isPlacingOrder || vm.paymentProcessing;

  const onConfirm = (method: PaymentMethod) => {
    vm.placeOrder(method)
      .then(placed => {
        if (!placed) {
          return; // guard blocked it; the viewmodel already toasted the reason
        }
        setSheetOpen(false);
        toast.success('Your order has been placed.');
        if (IS_WEB_BUILD) {
          // Drop Cart (and FoodDetail) from history: the cart was just cleared,
          // so going Back to it would land on the empty state.
          navigation.reset({index: 1, routes: [{name: 'Food'}, {name: 'OrderHistory'}]});
        } else {
          navigation.navigate('OrderHistory');
        }
      })
      .catch(error => {
        // Sheet stays open, cart intact — the guest can retry (reference).
        toast.error(getApiErrorMessage(error, 'Could not place your order. Please try again.'));
      });
  };

  if (vm.items.length === 0) {
    return (
      <SafeAreaView style={{flex: 1, backgroundColor: theme.colors.background}} edges={['top']}>
        <Header
          title="Cart"
          subtitle={vm.roomNumber != null ? `Room No. ${vm.roomNumber}` : undefined}
          onBack={() => navigation.goBack()}
        />
        <EmptyState
          icon="cart-outline"
          title="Your cart is empty"
          message="Add some dishes from the menu to get started."
          action={
            <Button
              label="Browse food"
              variant="secondary"
              onPress={() => navigation.navigate('Food')}
              fullWidth
            />
          }
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{flex: 1, backgroundColor: theme.colors.background}} edges={['top', 'bottom']}>
      <Header
        title="Cart"
        subtitle={vm.roomNumber != null ? `Room No. ${vm.roomNumber}` : undefined}
        onBack={() => navigation.goBack()}
      />
      <KeyboardAvoidingView
        style={{flex: 1}}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={{paddingHorizontal: 20, paddingBottom: 140}}
          keyboardShouldPersistTaps="handled">
          {/* Items */}
          <View style={{gap: 12}}>
            {vm.items.map(item => (
              <CartItemRow
                key={item.id}
                item={item}
                onIncrement={() => vm.increment(item)}
                onDecrement={() => vm.decrement(item)}
                onRemove={() => vm.remove(item)}
              />
            ))}
          </View>

          {/* Coupon */}
          <View
            className="flex-row items-center"
            style={{
              marginTop: 24,
              height: 52,
              borderRadius: 12,
              backgroundColor: theme.colors.surface,
              borderWidth: 1,
              borderColor: theme.colors.border,
              paddingHorizontal: 16,
            }}>
            <Icon name="pricetag-outline" size={18} color={theme.colors.muted} />
            <TextInput
              value={vm.couponCode}
              onChangeText={vm.onCouponChange}
              editable={!vm.isApplyingCoupon}
              placeholder="Apply flat coupon only"
              placeholderTextColor={theme.colors.muted}
              autoCapitalize="characters"
              autoCorrect={false}
              onSubmitEditing={vm.applyCoupon}
              style={{
                flex: 1,
                marginLeft: 10,
                color: theme.colors.text,
                fontSize: IS_TV ? 17 : 15,
                letterSpacing: 2,
              }}
            />
          </View>

          {vm.appliedCouponName ? (
            <View
              className="flex-row items-center justify-between"
              style={{
                marginTop: 10,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: `${theme.colors.primary}66`,
                backgroundColor: `${theme.colors.primary}14`,
                paddingHorizontal: 14,
                paddingVertical: 10,
              }}>
              <View style={{flex: 1, paddingRight: 10}}>
                <Text style={{color: theme.colors.primary, fontSize: 13, fontWeight: '600'}}>
                  Coupon <Text style={{fontWeight: '800'}}>{vm.appliedCouponName}</Text> applied
                </Text>
                {vm.totalSavings > 0 ? (
                  <Text style={{color: theme.colors.success, fontSize: 12, marginTop: 2}}>
                    You save ₹{vm.totalSavings}
                  </Text>
                ) : null}
              </View>
              <Pressable
                onPress={vm.removeCoupon}
                focusable
                accessibilityRole="button"
                accessibilityLabel="Remove coupon"
                style={{
                  borderWidth: 1,
                  borderColor: `${theme.colors.danger}66`,
                  borderRadius: 999,
                  paddingHorizontal: 12,
                  paddingVertical: 5,
                }}>
                <Text style={{color: theme.colors.danger, fontSize: 12, fontWeight: '600'}}>
                  Remove
                </Text>
              </Pressable>
            </View>
          ) : null}

          {/* Delivery info */}
          <View style={{marginTop: 20}}>
            <DeliveryCard
              roomNumber={vm.roomNumber}
              guestName={vm.guestName}
              guestPhone={vm.guestPhone}
            />
          </View>

          {/* Bill */}
          <View style={{marginTop: 16}}>
            <BillDetails
              items={vm.items}
              itemsTotal={vm.itemsTotal}
              taxRate={vm.taxRate}
              taxAmount={vm.taxAmount}
              payableAmount={vm.payableAmount}
              couponResponse={vm.couponResponse}
              appliedCouponName={vm.appliedCouponName}
            />
          </View>
        </ScrollView>

        {/* Bottom bar */}
        <View
          className="flex-row"
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: theme.colors.surfaceElevated,
            borderTopWidth: 1,
            borderTopColor: theme.colors.border,
            paddingHorizontal: 20,
            paddingVertical: 16,
            gap: 12,
          }}>
          <Button
            label={vm.isApplyingCoupon ? 'Applying…' : 'Apply Coupon'}
            variant="ghost"
            disabled={vm.isApplyingCoupon || !vm.couponCode.trim()}
            onPress={vm.applyCoupon}
            style={{borderWidth: 1, borderColor: theme.colors.primary, borderRadius: 18}}
          />
          <View style={{flex: 1}}>
            <Button
              label={`Place Order - ₹ ${vm.payableAmount.toFixed(2)}`}
              onPress={() => (IS_WEB_BUILD ? onConfirm('cod') : setSheetOpen(true))}
              disabled={busy}
              fullWidth
            />
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Never opens on webOS — the order is placed straight from the button. */}
      {!IS_WEB_BUILD ? (
        <PaymentSheet
          visible={sheetOpen}
          total={vm.payableAmount}
          roomNumber={vm.roomNumber}
          busy={busy}
          onConfirm={onConfirm}
          onCancel={() => setSheetOpen(false)}
        />
      ) : null}

      {/* Processing overlay (reference) */}
      {busy ? (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.7)',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 60,
          }}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={{color: '#ffffff', fontSize: 16, fontWeight: '600', marginTop: 16}}>
            {vm.paymentProcessing ? 'Verifying payment…' : 'Placing your order…'}
          </Text>
          <Text style={{color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 6}}>
            Please don't close this page
          </Text>
        </View>
      ) : null}
    </SafeAreaView>
  );
}
