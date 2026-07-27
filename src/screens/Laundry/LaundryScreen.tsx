import React from 'react';
import {
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
import {Button, Card, ErrorState, Header, Loader, Stepper, Toggle} from '../../components';
import {useLaundryViewModel} from '../../viewmodels';
import {useTVFocus} from '../../hooks/useTVFocus';
import {useTheme} from '../../theme';
import {serviceTypeLabel} from '../../constants/laundry';
import {getApiErrorMessage} from '../../utils/errorHandler';
import type {LaundryItem} from '../../models/laundry.model';
import type {HomeStackParamList} from '../../navigation/types';

type Props = NativeStackScreenProps<HomeStackParamList, 'Laundry'>;

function ServiceChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const {theme} = useTheme();
  const {focused, onFocus, onBlur} = useTVFocus();
  return (
    <Pressable
      onPress={onPress}
      onFocus={onFocus}
      onBlur={onBlur}
      focusable
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 999,
        marginRight: 8,
        marginBottom: 8,
        backgroundColor: active ? theme.colors.primary : theme.colors.surfaceElevated,
        borderWidth: 2,
        borderColor: focused ? theme.colors.focusRing : 'transparent',
      }}>
      <Text
        style={{
          color: active ? theme.colors.primaryForeground : theme.colors.textTertiary,
          fontSize: 12,
          fontWeight: '600',
        }}>
        {label}
      </Text>
    </Pressable>
  );
}

function RateItemCard({
  item,
  line,
  cheapest,
  rateFor,
  onAdd,
  onRemove,
  onQty,
  onServiceType,
}: {
  item: LaundryItem;
  line: {serviceType: string; qty: number} | undefined;
  cheapest: number;
  rateFor: (item: LaundryItem, serviceType: string) => number;
  onAdd: () => void;
  onRemove: () => void;
  onQty: (qty: number) => void;
  onServiceType: (serviceType: string) => void;
}) {
  const {theme} = useTheme();
  const inBasket = Boolean(line);
  const lineAmount = line ? rateFor(item, line.serviceType) * line.qty : 0;

  return (
    <Card className="mb-3">
      <View className="flex-row items-center justify-between">
        <View className="flex-1 pr-3">
          <Text className="text-sm font-bold text-content">{item.name}</Text>
          {!inBasket ? (
            <Text className="mt-0.5 text-xs text-content-tertiary">
              from ₹{cheapest}
              {item.unit ? ` per ${item.unit}` : ''}
            </Text>
          ) : null}
        </View>
        {!inBasket ? (
          <Button label="Add" size="sm" variant="secondary" onPress={onAdd} />
        ) : (
          <Pressable
            onPress={onRemove}
            focusable
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={`Remove ${item.name ?? 'item'}`}>
            <Icon name="trash-outline" size={20} color={theme.colors.danger} />
          </Pressable>
        )}
      </View>

      {inBasket && line ? (
        <View className="mt-3 border-t border-border pt-3">
          <View className="flex-row flex-wrap">
            {(item.rates ?? []).map(r => (
              <ServiceChip
                key={r.serviceType}
                label={`${serviceTypeLabel(r.serviceType)} · ₹${r.rate}`}
                active={line.serviceType === r.serviceType}
                onPress={() => onServiceType(r.serviceType)}
              />
            ))}
          </View>
          <View className="mt-2 flex-row items-center justify-between">
            <View style={{width: 150}}>
              <Stepper
                value={line.qty}
                min={1}
                max={99}
                step={1}
                onChange={onQty}
                accessibilityLabel="Quantity"
              />
            </View>
            <Text className="text-sm font-bold text-primary">₹{lineAmount}</Text>
          </View>
        </View>
      ) : null}
    </Card>
  );
}

export function LaundryScreen({navigation}: Props) {
  const {theme} = useTheme();
  const vm = useLaundryViewModel();

  const onSubmit = () => {
    vm.submit()
      .then(() => navigation.navigate('LaundryOrders'))
      .catch(error =>
        Alert.alert('Error', getApiErrorMessage(error, 'Could not place your laundry request.')),
      );
  };

  const headerRight = (
    <Pressable
      onPress={() => navigation.navigate('LaundryOrders')}
      focusable
      accessibilityRole="button"
      accessibilityLabel="My orders"
      className="rounded-full bg-surface-elevated px-3 py-2">
      <Text className="text-xs font-semibold text-primary">My Orders</Text>
    </Pressable>
  );

  return (
    <SafeAreaView style={{flex: 1, backgroundColor: theme.colors.background}} edges={['top']}>
      <Header title="Laundry" onBack={() => navigation.goBack()} right={headerRight} />

      {vm.isLoading ? (
        <Loader label="Loading rate list…" />
      ) : vm.error ? (
        <ErrorState message={vm.error} onRetry={vm.refetch} />
      ) : vm.items.length === 0 ? (
        <Text className="mt-10 px-8 text-center text-sm text-content-tertiary">
          Laundry service is not available right now.
        </Text>
      ) : (
        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={{paddingHorizontal: 20, paddingBottom: 16}}>
            {vm.items.map(item => {
              const rates = item.rates ?? [];
              const cheapest = rates.length ? Math.min(...rates.map(r => r.rate)) : 0;
              return (
                <RateItemCard
                  key={item._id}
                  item={item}
                  line={vm.basket[item._id]}
                  cheapest={cheapest}
                  rateFor={vm.rateFor}
                  onAdd={() => vm.addItem(item)}
                  onRemove={() => vm.removeItem(item._id)}
                  onQty={qty => vm.setQty(item._id, qty)}
                  onServiceType={st => vm.setServiceType(item._id, st)}
                />
              );
            })}

            {vm.summary.lines.length > 0 ? (
              <Card className="mt-2">
                <View className="flex-row items-center justify-between">
                  <View className="flex-1 pr-3">
                    <Text className="text-sm font-semibold text-content">Express service</Text>
                    <Text className="text-xs text-content-tertiary">Faster turnaround</Text>
                  </View>
                  <Toggle
                    value={vm.isExpress}
                    onValueChange={vm.setIsExpress}
                    accessibilityLabel="Express service"
                  />
                </View>
                <View className="mt-3 border-t border-border pt-3">
                  <Text className="mb-2 text-sm font-medium text-content-secondary">
                    Housekeeping notes
                  </Text>
                  <TextInput
                    value={vm.notes}
                    onChangeText={vm.setNotes}
                    placeholder="Any special instructions (optional)"
                    placeholderTextColor={theme.colors.muted}
                    multiline
                    textAlignVertical="top"
                    className="rounded-xl bg-surface-elevated px-4 py-3 text-base text-content"
                    style={{minHeight: 90, borderWidth: 1.5, borderColor: theme.colors.border}}
                  />
                </View>
              </Card>
            ) : null}
          </ScrollView>

          {vm.summary.lines.length > 0 ? (
            <View className="border-t border-border px-5 pb-6 pt-3">
              <View className="mb-1 flex-row justify-between">
                <Text className="text-xs text-content-tertiary">
                  {vm.summary.pieceCount} piece{vm.summary.pieceCount !== 1 ? 's' : ''} · Subtotal
                </Text>
                <Text className="text-xs text-content-secondary">₹{vm.summary.subTotal.toFixed(2)}</Text>
              </View>
              {vm.summary.taxPercentage > 0 ? (
                <View className="mb-1 flex-row justify-between">
                  <Text className="text-xs text-content-tertiary">
                    Tax ({vm.summary.taxPercentage}%)
                  </Text>
                  <Text className="text-xs text-content-secondary">
                    ₹{vm.summary.taxAmount.toFixed(2)}
                  </Text>
                </View>
              ) : null}
              <View className="mb-3 flex-row justify-between">
                <Text className="text-sm font-bold text-content">Total</Text>
                <Text className="text-sm font-bold text-primary">
                  ₹{vm.summary.totalAmount.toFixed(2)}
                </Text>
              </View>
              <Button
                label="Request pickup"
                onPress={onSubmit}
                loading={vm.isSubmitting}
                fullWidth
              />
            </View>
          ) : null}
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}
