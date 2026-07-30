import React, {useCallback, useEffect, useRef, useState} from 'react';
import {Animated, Platform, Text, View} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
// Straight from the leaf module, not the `../TvGlass` barrel: that barrel also
// re-exports TvChrome, which imports `toast` from here — an import cycle the
// bundler would have to break at runtime. TvGlass.tsx itself imports nothing
// from components/.
import {DS, FONT, GLASS_BLUR, GlassSheen, SHADOW} from '../TvGlass/TvGlass';
import {useTheme} from '../../theme';
import {IS_TV} from '../../utils/responsive';
import {subscribeToToasts, type ToastItem} from './toast';

const MAX_VISIBLE = 3;

const KIND_ICON: Record<ToastItem['kind'], string> = {
  success: 'checkmark-circle',
  error: 'alert-circle',
  info: 'information-circle',
};

/** Ten-foot accents: the dashboard's own palette, so a toast reads as part of
 *  the glass surface rather than a phone notification pasted over it. */
const TV_ACCENT: Record<ToastItem['kind'], string> = {
  success: DS.good,
  error: DS.danger,
  info: DS.gold,
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

  const accent = IS_TV
    ? TV_ACCENT[item.kind]
    : item.kind === 'success'
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
        marginTop: 8,
        ...(IS_TV
          ? {
              // Same recipe as the TV dialog (AppDialog/DialogProvider): a
              // NEARLY OPAQUE warm-dark plate, because backdrop-filter is off on
              // the TV — a translucent card would let the dashboard's bright
              // tile photos read straight through the message.
              backgroundColor: 'rgba(30,23,13,0.96)',
              borderRadius: DS.radius,
              borderWidth: 1,
              borderColor: DS.border,
              borderLeftWidth: 4,
              borderLeftColor: accent,
              paddingHorizontal: 20,
              paddingVertical: 14,
              overflow: 'hidden',
              ...SHADOW,
              ...(GLASS_BLUR ?? {}),
            }
          : {
              backgroundColor: theme.colors.surface,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: theme.colors.border,
              borderLeftWidth: 4,
              borderLeftColor: accent,
              paddingHorizontal: 16,
              paddingVertical: 12,
              // Visible lift on the light theme; harmless on dark.
              shadowColor: '#000',
              shadowOpacity: scheme === 'dark' ? 0.5 : 0.15,
              shadowRadius: 12,
              shadowOffset: {width: 0, height: 4},
              elevation: 6,
            }),
      }}>
      {IS_TV ? <GlassSheen /> : null}
      <Icon name={KIND_ICON[item.kind]} size={IS_TV ? 22 : 20} color={accent} />
      <Text
        style={{
          marginLeft: IS_TV ? 12 : 10,
          flexShrink: 1,
          color: IS_TV ? DS.text : theme.colors.text,
          fontSize: IS_TV ? 15 : 14,
          fontWeight: '600',
          letterSpacing: IS_TV ? 0.2 : 0,
          fontFamily: IS_TV ? FONT : undefined,
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
        // TV: clear the persistent top bar instead of landing on the room
        // number and clock. The bar starts at the stack's 24px overscan inset
        // plus the page's 27px margin and its chips are 56 tall (≈107), so the
        // toast drops just below it, over the hero.
        top: IS_TV ? 118 : 56,
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
