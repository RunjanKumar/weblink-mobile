import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Animated,
  Modal,
  Platform,
  Pressable,
  Text,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {useTheme, useThemeVars} from '../../../theme';
import {IS_TV} from '../../../utils/responsive';
import {registerModal} from '../../../services/modalRegistry';
import type {PaymentMethod} from '../../../viewmodels';

const SHEET_ROOT_ID = 'payment-sheet-root';

function MethodCard({
  icon,
  title,
  subtitle,
  selected,
  onPress,
}: {
  icon: string;
  title: string;
  subtitle: string;
  selected: boolean;
  onPress: () => void;
}) {
  const {theme} = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <Pressable
      onPress={onPress}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      focusable
      accessibilityRole="radio"
      accessibilityState={{selected}}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: focused
          ? theme.colors.focusRing
          : selected
            ? theme.colors.primary
            : theme.colors.border,
        backgroundColor: selected ? `${theme.colors.primary}0d` : 'transparent',
        borderRadius: 16,
        padding: 16,
        gap: 14,
      }}>
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: selected ? `${theme.colors.primary}26` : theme.colors.surfaceElevated,
        }}>
        <Icon
          name={icon}
          size={22}
          color={selected ? theme.colors.primary : theme.colors.muted}
        />
      </View>
      <View style={{flex: 1}}>
        <Text
          style={{
            color: selected ? theme.colors.primary : theme.colors.text,
            fontSize: IS_TV ? 18 : 16,
            fontWeight: '600',
          }}>
          {title}
        </Text>
        <Text style={{color: theme.colors.textTertiary, fontSize: IS_TV ? 14 : 12, marginTop: 2}}>
          {subtitle}
        </Text>
      </View>
      <View
        style={{
          width: 20,
          height: 20,
          borderRadius: 10,
          borderWidth: 2,
          borderColor: selected ? theme.colors.primary : theme.colors.border,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        {selected ? (
          <View style={{width: 10, height: 10, borderRadius: 5, backgroundColor: theme.colors.primary}} />
        ) : null}
      </View>
    </Pressable>
  );
}

/**
 * Reference `PaymentBottomSheet` (Cart.jsx): slide-up sheet with payment-method
 * radio cards. On the TV only Cash-on-delivery exists (Razorpay's checkout
 * iframe cannot be driven by a remote), preselected. Backdrop cancels (but is
 * not D-pad focusable); the TV Back key closes the sheet via the modal registry.
 */
export function PaymentSheet({
  visible,
  total,
  roomNumber,
  busy,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  total: number;
  roomNumber: string | number | null;
  busy: boolean;
  onConfirm: (method: PaymentMethod) => void;
  onCancel: () => void;
}) {
  const {theme} = useTheme();
  const themeVars = useThemeVars();
  const [method, setMethod] = useState<PaymentMethod>(IS_TV ? 'cod' : 'online');
  const translate = useRef(new Animated.Value(600)).current;

  useEffect(() => {
    if (visible) {
      setMethod(IS_TV ? 'cod' : 'online');
      Animated.timing(translate, {
        toValue: 0,
        duration: 300,
        useNativeDriver: Platform.OS !== 'web',
      }).start();
    } else {
      translate.setValue(600);
    }
  }, [visible, translate]);

  const cancel = useCallback(() => {
    if (!busy) {
      onCancel();
    }
  }, [busy, onCancel]);

  useEffect(() => {
    if (!visible) {
      return;
    }
    return registerModal({rootId: SHEET_ROOT_ID, close: cancel});
  }, [visible, cancel]);

  // Web: seed D-pad focus inside the sheet.
  useEffect(() => {
    if (!visible || Platform.OS !== 'web' || typeof document === 'undefined') {
      return;
    }
    const timer = setTimeout(() => {
      const root = document.getElementById(SHEET_ROOT_ID);
      root?.querySelector<HTMLElement>('[tabindex]:not([tabindex="-1"]), button')?.focus();
    }, 120);
    return () => clearTimeout(timer);
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={cancel}>
      <Pressable
        onPress={cancel}
        focusable={false}
        style={[themeVars, {flex: 1, backgroundColor: theme.colors.overlay, justifyContent: 'flex-end'}]}>
        <Animated.View style={{transform: [{translateY: translate}]}}>
          <Pressable
            nativeID={SHEET_ROOT_ID}
            onPress={() => {}}
            focusable={false}
            style={{
              backgroundColor: theme.colors.surface,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: 24,
              paddingBottom: IS_TV ? 40 : 32,
              alignSelf: 'center',
              width: '100%',
              maxWidth: IS_TV ? 720 : undefined,
            }}>
            {/* grab handle */}
            <View
              style={{
                alignSelf: 'center',
                width: 40,
                height: 5,
                borderRadius: 3,
                backgroundColor: theme.colors.border,
                marginBottom: 18,
              }}
            />
            <Text style={{color: theme.colors.text, fontSize: IS_TV ? 26 : 22, fontWeight: '700'}}>
              Choose payment method
            </Text>
            <Text
              style={{
                color: theme.colors.textTertiary,
                fontSize: IS_TV ? 16 : 14,
                marginTop: 4,
                marginBottom: 20,
              }}>
              Total: ₹ {total.toFixed(2)}
              {roomNumber != null ? ` · Room ${roomNumber}` : ''}
            </Text>

            <View style={{gap: 12}}>
              {!IS_TV ? (
                <MethodCard
                  icon="card-outline"
                  title="Pay online"
                  subtitle="UPI, card, net banking via Razorpay"
                  selected={method === 'online'}
                  onPress={() => setMethod('online')}
                />
              ) : null}
              <MethodCard
                icon="cash-outline"
                title="Cash on delivery"
                subtitle="Pay when order arrives at your room"
                selected={method === 'cod'}
                onPress={() => setMethod('cod')}
              />
            </View>

            <View
              className="flex-row items-center"
              style={{gap: 8, marginTop: 16, marginBottom: 20}}>
              <Icon name="information-circle-outline" size={16} color={theme.colors.muted} />
              <Text style={{color: theme.colors.muted, fontSize: IS_TV ? 14 : 12, flex: 1}}>
                {IS_TV
                  ? 'Pay with cash when your order arrives at your room.'
                  : 'You can switch to online payment anytime before delivery'}
              </Text>
            </View>

            <Pressable
              onPress={() => onConfirm(method)}
              disabled={busy}
              focusable={!busy}
              accessibilityRole="button"
              style={({pressed}) => ({
                height: 56,
                borderRadius: 18,
                backgroundColor: theme.colors.primary,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                gap: 10,
                opacity: busy ? 0.7 : pressed ? 0.9 : 1,
              })}>
              {busy ? <ActivityIndicator color={theme.colors.primaryForeground} /> : null}
              <Text
                style={{
                  color: theme.colors.primaryForeground,
                  fontSize: IS_TV ? 20 : 18,
                  fontWeight: '700',
                }}>
                {busy ? 'Placing order…' : 'Confirm & place order'}
              </Text>
            </Pressable>
            <Pressable
              onPress={cancel}
              disabled={busy}
              focusable={!busy}
              accessibilityRole="button"
              style={{alignItems: 'center', paddingVertical: 14}}>
              <Text style={{color: theme.colors.textTertiary, fontSize: IS_TV ? 17 : 15}}>
                Cancel
              </Text>
            </Pressable>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}
