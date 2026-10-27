import React, {useCallback, useEffect, useRef, useState} from 'react';
import {Animated, Platform, Text, View} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {onlineManager} from '@tanstack/react-query';
// Straight from the leaf module, not the `../TvGlass` barrel: that barrel also
// re-exports TvChrome, which imports `toast` from here — an import cycle the
// bundler would have to break at runtime. TvGlass.tsx itself imports nothing
// from components/.
import {DS, FONT, GLASS_BLUR, GlassSheen, SHADOW} from '../TvGlass/TvGlass';
import {useTheme} from '../../theme';
import {IS_TV} from '../../utils/responsive';
import {subscribeToToasts, toast, type ToastItem} from './toast';

const MAX_VISIBLE = 3;

const KIND_ICON: Record<ToastItem['kind'], string> = {
  success: 'checkmark-circle',
  error: 'alert-circle',
  info: 'information-circle',
};

/**
 * Ten-foot accents: the dashboard's own palette, so a toast reads as part of the
 * glass surface rather than a phone notification pasted over it.
 *
 * Each kind carries THREE values, not one. Colour used to arrive as a 4px rule
 * down the left edge, which on a 16px-rounded card is a bare stripe clipped by
 * the corner — it read as something stuck onto the glass, and at ten feet an
 * error was indistinguishable from an info. The accent now gets AREA instead: a
 * tinted chip behind the icon and a tinted card edge, both drawn from the same
 * hue, so the toast stays one object and the kind is legible across the room.
 *
 * The rgba values are the solid colour at low alpha — kept literal because RN
 * has no colour-mix, and a helper would only hide three constants.
 */
const TV_ACCENT: Record<ToastItem['kind'], {solid: string; tint: string; edge: string}> = {
  success: {solid: DS.good, tint: 'rgba(143,217,168,0.18)', edge: 'rgba(143,217,168,0.55)'},
  error: {solid: DS.danger, tint: 'rgba(242,139,130,0.18)', edge: 'rgba(242,139,130,0.55)'},
  info: {solid: DS.gold, tint: 'rgba(212,180,131,0.20)', edge: 'rgba(212,180,131,0.55)'},
};

/**
 * The TV's "no internet" notice. A toast-shaped card, but it stays up for as
 * long as the network is gone: a timed toast would leave the guest staring at
 * error states with nothing saying why once it faded.
 */
const OFFLINE_NOTICE: ToastItem = {
  id: -1,
  kind: 'error',
  message: "No internet connection. Check the TV's network — the app reconnects by itself.",
  duration: 0,
};

/**
 * Online/offline as React Query hears it (window online/offline in the web
 * builds; native never goes offline here). TV only — a phone has its own
 * system indicator. Says "Back online" when the network returns, because the
 * screens reload on their own and the guest should know that is why.
 */
function useTvOffline(): boolean {
  const [offline, setOffline] = useState(() => IS_TV && !onlineManager.isOnline());
  useEffect(() => {
    if (!IS_TV) {
      return;
    }
    return onlineManager.subscribe(online => {
      setOffline(!online);
      if (online) {
        toast.success('Back online.');
      }
    });
  }, []);
  return offline;
}

function ToastCard({
  item,
  onDone,
  persistent = false,
  icon,
}: {
  item: ToastItem;
  onDone?: (id: number) => void;
  /** Stays until unmounted instead of fading after `item.duration`. */
  persistent?: boolean;
  icon?: string;
}) {
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
    if (persistent) {
      return;
    }
    const timer = setTimeout(() => {
      Animated.timing(opacity, {toValue: 0, duration: 220, useNativeDriver: useNative}).start(
        () => onDone?.(item.id),
      );
    }, item.duration);
    return () => clearTimeout(timer);
  }, [item, opacity, translate, onDone, persistent]);

  const tv = TV_ACCENT[item.kind];
  const accent = IS_TV
    ? tv.solid
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
              // A WARM TRANSLUCENT plate, matching the dashboard's PanelCards —
              // not the dialog's near-opaque one. The dialog can be a dark slab
              // because it sits on its own dark scrim; a toast sits directly on
              // the dashboard, where every other surface is frosted glass, so an
              // opaque box was the only dark object on the screen.
              //
              // It cannot be the panels' literal `DS.glass` (white 12%) though:
              // the panels are legible because the BLURRED BACKDROP is behind
              // them, whereas a toast lands over the tile photos, and white text
              // on white glass over a bright photo is unreadable. This is the
              // same trick the hero uses for text over a photo — a warm scrim —
              // taken just far enough to hold the message.
              backgroundColor: 'rgba(46,34,20,0.72)',
              borderRadius: DS.radius,
              borderWidth: 1,
              // The panels' own border, so the frame reads as the same material.
              // The kind is carried by the icon chip, which has the area for it.
              borderColor: DS.border,
              paddingHorizontal: 18,
              paddingVertical: 13,
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
      {IS_TV ? (
        // Chip, not a bare glyph: it is what gives the accent enough area to be
        // read as a colour at ten feet.
        <View
          style={{
            width: 30,
            height: 30,
            borderRadius: 15,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: tv.tint,
            borderWidth: 1,
            borderColor: tv.edge,
          }}>
          <Icon name={icon ?? KIND_ICON[item.kind]} size={17} color={accent} />
        </View>
      ) : (
        <Icon name={icon ?? KIND_ICON[item.kind]} size={20} color={accent} />
      )}
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
  const offline = useTvOffline();

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

  if (items.length === 0 && !offline) {
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
      {offline ? <ToastCard item={OFFLINE_NOTICE} persistent icon="cloud-offline-outline" /> : null}
      {items.map(item => (
        <ToastCard key={item.id} item={item} onDone={remove} />
      ))}
    </View>
  );
}
