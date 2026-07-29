import React, {useCallback, useEffect, useRef, useState} from 'react';
import {Animated, Platform, Text, View} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {useTheme} from '../../theme';
import {IS_TV} from '../../utils/responsive';
import {subscribeToToasts, type ToastItem} from './toast';

const MAX_VISIBLE = 3;

const KIND_ICON: Record<ToastItem['kind'], string> = {
  success: 'checkmark-circle',
  error: 'alert-circle',
  info: 'information-circle',
};

function ToastCard({item, onDone}: {item: ToastItem; onDone: (id: number) => void}) {
  const {theme, scheme} = useTheme();
  // Core Animated only — reanimated does not initialise reliably in the
  // webpack/webOS bundle (see Skeleton.tsx).
  const opacity = useRef(new Animated.Value(0)).current;
  const translate = useRef(new Animated.Value(-12)).current;

  useEffect(() => {
    const useNative = Platform.OS !== 'web';
    Animated.parallel([
      Animated.timing(opacity, {toValue: 1, duration: 180, useNativeDriver: useNative}),
      Animated.timing(translate, {toValue: 0, duration: 180, useNativeDriver: useNative}),
    ]).start();
    const timer = setTimeout(() => {
      Animated.timing(opacity, {toValue: 0, duration: 220, useNativeDriver: useNative}).start(
        () => onDone(item.id),
      );
    }, item.duration);
    return () => clearTimeout(timer);
  }, [item, opacity, translate, onDone]);

  const accent =
    item.kind === 'success'
      ? theme.colors.success
      : item.kind === 'error'
        ? theme.colors.danger
        : theme.colors.info;

  return (
    <Animated.View
      style={{
        opacity,
        transform: [{translateY: translate}],
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'center',
        maxWidth: IS_TV ? 720 : 480,
        backgroundColor: theme.colors.surface,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderLeftWidth: 4,
        borderLeftColor: accent,
        paddingHorizontal: 16,
        paddingVertical: 12,
        marginTop: 8,
        // Visible lift on the light theme; harmless on dark.
        shadowColor: '#000',
        shadowOpacity: scheme === 'dark' ? 0.5 : 0.15,
        shadowRadius: 12,
        shadowOffset: {width: 0, height: 4},
        elevation: 6,
      }}>
      <Icon name={KIND_ICON[item.kind]} size={IS_TV ? 24 : 20} color={accent} />
      <Text
        style={{
          marginLeft: 10,
          flexShrink: 1,
          color: theme.colors.text,
          fontSize: IS_TV ? 18 : 14,
          fontWeight: '600',
        }}>
        {item.message}
      </Text>
    </Animated.View>
  );
}

/**
 * Renders the toast stack. Mount ONCE, inside ThemeProvider, outside the
 * navigator. `pointerEvents="none"` keeps toasts out of the TV's D-pad focus
 * graph and lets touches pass through on the phone.
 */
export function ToastHost() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(
    () =>
      subscribeToToasts(item =>
        setItems(prev => [...prev.slice(-(MAX_VISIBLE - 1)), item]),
      ),
    [],
  );

  const remove = useCallback(
    (id: number) => setItems(prev => prev.filter(t => t.id !== id)),
    [],
  );

  if (items.length === 0) {
    return null;
  }

  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: IS_TV ? 32 : 56,
        left: 20,
        right: 20,
        zIndex: 1000,
      }}>
      {items.map(item => (
        <ToastCard key={item.id} item={item} onDone={remove} />
      ))}
    </View>
  );
}
