import React from 'react';
import {
  ActivityIndicator,
  Alert,
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
import {Button, Card, EmptyState, Header, Stepper} from '../../components';
import {useCartViewModel, type PaymentMethod} from '../../viewmodels';
import {useTheme} from '../../theme';
import {getApiErrorMessage} from '../../utils/errorHandler';
import type {HomeStackParamList} from '../../navigation/types';

type Props = NativeStackScreenProps<HomeStackParamList, 'Cart'>;

function BillRow({label, value, strong, accent}: {label: string; value: string; strong?: boolean; accent?: boolean}) {
  const {theme} = useTheme();
  return (
    <View className="flex-row justify-between py-1">
      <Text className={strong ? 'text-sm font-bold text-content' : 'text-xs text-content-tertiary'}>
        {label}
      </Text>
      <Text
        className={strong ? 'text-sm font-bold' : 'text-xs'}
        style={{color: accent ? theme.colors.success : strong ? theme.colors.primary : theme.colors.textSecondary}}>
        {value}
      </Text>
    </View>
  );
}

export function CartScreen({navigation}: Props) {
  const {theme} = useTheme();
  const vm = useCartViewModel();
  const busy = vm.isPlacingOrder || vm.paymentProcessing;

  const doPlace = (method: PaymentMethod) => {
    vm.placeOrder(method)
      .then(() => navigation.navigate('OrderHistory'))
      .catch(error => Alert.alert('Error', getApiErrorMessage(error, 'Failed to place order.')));
  };

  const onPlaceOrder = () => {
    Alert.alert('Payment method', 'How would you like to pay?', [
      {text: 'Pay Online', onPress: () => doPlace('online')},
      {text: 'Cash on Delivery', onPress: () => doPlace('cod')},
      {text: 'Cancel', style: 'cancel'},
    ]);
  };

  if (vm.items.length === 0) {
    return (
      <SafeAreaView style={{flex: 1, backgroundColor: theme.colors.background}} edges={['top']}>
        <Header title="Your cart" onBack={() => navigation.goBack()} />
        <EmptyState
          icon="cart-outline"
          title="Your cart is empty"
          message="Add some dishes from the menu to get started."
          action={<Button label="Browse food" variant="secondary" onPress={() => navigation.navigate('Food')} fullWidth />}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{flex: 1, backgroundColor: theme.colors.background}} edges={['top']}>
      <Header title="Your cart" subtitle={`${vm.itemCount} item${vm.itemCount !== 1 ? 's' : ''}`} onBack={() => navigation.goBack()} />
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{paddingHorizontal: 20, paddingBottom: 16}} keyboardShouldPersistTaps="handled">
          {/* Items */}
          {vm.items.map(item => (
            <Card key={item.id} className="mb-3">
              <View className="flex-row items-start justify-between">
                <View className="flex-1 pr-3">
                  <Text className="text-sm font-bold text-content">{item.title ?? item.name}</Text>
                  {item.isAddOn ? (
                    <Text className="text-[10px] text-content-tertiary">Add-on · {item.parentFoodTitle}</Text>
                  ) : null}
                  <Text className="mt-1 text-xs text-primary">₹{item.unitPrice} each</Text>
                </View>
                <Pressable onPress={() => vm.remove(item)} focusable hitSlop={8} accessibilityRole="button" accessibilityLabel="Remove">
                  <Icon name="trash-outline" size={18} color={theme.colors.danger} />
                </Pressable>
              </View>
              <View className="mt-2 flex-row items-center justify-between">
                <View style={{width: 150}}>
                  <Stepper
                    value={item.quantity}
                    min={0}
                    max={99}
                    step={1}
                    onChange={next => (next > item.quantity ? vm.increment(item) : vm.decrement(item))}
                    accessibilityLabel="Quantity"
                  />
                </View>
                <Text className="text-sm font-bold text-content">₹{item.lineTotal}</Text>
              </View>
            </Card>
          ))}

          {/* Coupon */}
          <Card className="mb-3">
            <Text className="mb-2 text-sm font-semibold text-content">Apply coupon</Text>
            <View className="flex-row items-center" style={{gap: 8}}>
              <TextInput
                value={vm.couponCode}
                onChangeText={vm.onCouponChange}
                placeholder="Coupon code"
                placeholderTextColor={theme.colors.muted}
                autoCapitalize="characters"
                className="flex-1 rounded-xl bg-surface-elevated px-3 text-sm text-content"
                style={{paddingVertical: 10, borderWidth: 1, borderColor: theme.colors.border}}
              />
              {vm.appliedCouponName ? (
                <Button label="Remove" size="sm" variant="ghost" onPress={vm.removeCoupon} />
              ) : (
                <Button label="Apply" size="sm" variant="secondary" loading={vm.isApplyingCoupon} onPress={vm.applyCoupon} />
              )}
            </View>
            {vm.couponError ? <Text className="mt-2 text-xs text-danger">{vm.couponError}</Text> : null}
            {vm.appliedCouponName ? (
              <Text className="mt-2 text-xs text-success">Coupon {vm.appliedCouponName} applied</Text>
            ) : null}
          </Card>

          {/* Bill */}
          <Card>
            <Text className="mb-2 text-sm font-bold text-content">Bill details</Text>
            <BillRow label="Item total" value={`₹${vm.itemsTotal.toFixed(2)}`} />
            {vm.totalSavings > 0 ? (
              <BillRow label="Savings" value={`- ₹${vm.totalSavings.toFixed(2)}`} accent />
            ) : null}
            {vm.taxRate > 0 ? (
              <BillRow label={`Tax (${vm.taxRate}%)`} value={`₹${vm.taxAmount.toFixed(2)}`} />
            ) : null}
            <View className="my-2 h-px bg-border" />
            <BillRow label="To pay" value={`₹${vm.payableAmount.toFixed(2)}`} strong />
          </Card>
        </ScrollView>

        <View className="border-t border-border px-5 pb-6 pt-3">
          <Button label={`Place order · ₹${vm.payableAmount.toFixed(2)}`} onPress={onPlaceOrder} loading={busy} fullWidth />
        </View>
      </KeyboardAvoidingView>

      {busy ? (
        <View className="absolute inset-0 items-center justify-center" style={{backgroundColor: theme.colors.overlay}}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text className="mt-3 text-sm text-content">
            {vm.paymentProcessing ? 'Preparing payment…' : 'Placing your order…'}
          </Text>
          <Text className="mt-1 text-xs text-content-tertiary">Please don't close this screen</Text>
        </View>
      ) : null}
    </SafeAreaView>
  );
}
