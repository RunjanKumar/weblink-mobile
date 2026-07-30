import React, {useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {useQuery} from '@tanstack/react-query';
import {DS, FONT, GLASS_BLUR, GlassPanel, TvBackButton, TvPressable} from '../../../components/TvGlass';
import {toast} from '../../../components';
import {foodRepository} from '../../../repositories/food.repository';
import {resolveImageUrl} from '../../../utils/imageUrl';
import {getApiErrorMessage} from '../../../utils/errorHandler';
import {BOOKING_STATUS} from '../../../constants/status';
import {FOOD_ORDER_STATUS_LABELS} from '../../../constants/food';
import type {Food, FoodOrder} from '../../../models/food.model';

/**
 * The pieces the four TV food frames share — left rail, glass food image, qty
 * stepper, money rows, CTAs, and the order-status vocabulary.
 *
 * They live in one file rather than one-per-component because none of them is
 * useful outside the food frames, and keeping them together is what stops the
 * cart's stepper from drifting away from the menu's.
 *
 * Sizes follow the TvGlass unit rule: Figma px ÷ 1.5 (global `zoom: 1.5`).
 */

/* ── Food image ─────────────────────────────────────────────────────────────
   NOT `components/AppImage`: its fallback block is painted with the THEME's
   surface colour, which on the light theme is a near-white slab — bright enough
   on the dark glass backdrop to read as a rendering bug. This one falls back to
   the same glass the card is made of. */
export function FoodImage({
  src,
  size,
  radius = DS.radiusSm,
  style,
}: {
  src?: string | null;
  /** Square shorthand; pass `style` for non-square. */
  size?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const [failed, setFailed] = useState(false);
  const uri = resolveImageUrl(src);
  const box = [
    {
      width: size,
      height: size,
      borderRadius: radius,
      overflow: 'hidden' as const,
      backgroundColor: 'rgba(255,255,255,0.10)',
    },
    style,
  ];

  if (!uri || failed) {
    return (
      <View style={[...box, {alignItems: 'center', justifyContent: 'center'}]}>
        <Icon name="restaurant-outline" size={Math.max(14, (size ?? 40) * 0.38)} color={DS.muted} />
      </View>
    );
  }
  return (
    <View style={box}>
      <Image
        source={{uri}}
        resizeMode="cover"
        onError={() => setFailed(true)}
        style={{width: '100%', height: '100%'}}
      />
    </View>
  );
}

/* ── Quantity stepper (− 1 +) ── */
export function QtyStepper({
  quantity,
  onIncrement,
  onDecrement,
  size = 26,
}: {
  quantity: number;
  onIncrement: () => void;
  onDecrement: () => void;
  size?: number;
}) {
  const round = {
    width: size,
    height: size,
    borderRadius: size / 2,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: 'rgba(255,255,255,0.14)',
  };
  return (
    <View style={{flexDirection: 'row', alignItems: 'center'}}>
      <TvPressable onPress={onDecrement} label="Decrease quantity" restBorderColor={DS.border} style={round}>
        <Icon name="remove" size={Math.round(size * 0.5)} color={DS.text} />
      </TvPressable>
      <Text
        style={{
          color: DS.text,
          fontSize: 14,
          fontWeight: '600',
          minWidth: 30,
          textAlign: 'center',
          fontFamily: FONT,
        }}>
        {quantity}
      </Text>
      <TvPressable onPress={onIncrement} label="Increase quantity" restBorderColor={DS.border} style={round}>
        <Icon name="add" size={Math.round(size * 0.5)} color={DS.text} />
      </TvPressable>
    </View>
  );
}

/** Round glass "+" — the add-to-cart affordance on a menu card. */
export function AddCircle({onPress, label, size = 30}: {onPress: () => void; label: string; size?: number}) {
  return (
    <TvPressable
      onPress={onPress}
      label={label}
      restBorderColor={DS.border}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.16)',
      }}>
      <Icon name="add" size={Math.round(size * 0.55)} color={DS.text} />
    </TvPressable>
  );
}

/* ── CTAs and the money row now live in the design system ───────────────────
   They are not food-specific — the bill, profile, settings and feedback frames
   end in the same two buttons — so they moved to `components/TvGlass`. Kept
   re-exported here because the four food frames import them from this file. */
export {GoldButton, GlassButton, MoneyRow} from '../../../components/TvGlass';

/* ── Left rail ──────────────────────────────────────────────────────────────
   Shared by the menu and the order-history frames so the guest never sees the
   category list jump when they move between them. */

/** Category name → Ionicons glyph (the Figma draws one per row). */
export function categoryIcon(name?: string): string {
  const key = (name ?? '').toLowerCase();
  if (key.includes('breakfast')) return 'egg-outline';
  if (key.includes('soup') || key.includes('salad')) return 'leaf-outline';
  if (key.includes('sandwich') || key.includes('burger')) return 'fast-food-outline';
  if (key.includes('dessert') || key.includes('sweet')) return 'ice-cream-outline';
  if (key.includes('beverage') || key.includes('drink') || key.includes('bar')) return 'wine-outline';
  if (key.includes('pizza')) return 'pizza-outline';
  if (key.includes('main') || key.includes('course')) return 'restaurant-outline';
  if (key.includes('all day') || key.includes('dining')) return 'restaurant-outline';
  return 'restaurant-outline';
}

export interface RailCategory {
  id: string;
  name: string;
}

export function FoodRail({
  title,
  subtitle,
  onBack,
  categories,
  activeId,
  onSelect,
  onHistory,
  historyActive = false,
  width = 172,
}: {
  title: string;
  subtitle: string;
  onBack: () => void;
  categories: RailCategory[];
  /** `null` while the history entry owns the selection. */
  activeId?: string | null;
  onSelect: (id: string) => void;
  onHistory: () => void;
  historyActive?: boolean;
  width?: number;
}) {
  return (
    <View style={{width, marginRight: DS.gap}}>
      <GlassPanel style={{flex: 1, padding: 12}}>
        {/* Header: back + screen name */}
        <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 14}}>
          <TvBackButton onPress={onBack} size={34} />
          <View style={{marginLeft: 10, flex: 1}}>
            <Text
              numberOfLines={1}
              style={{
                color: DS.text,
                fontSize: 15,
                fontWeight: '600',
                letterSpacing: 0.8,
                fontFamily: FONT,
              }}>
              {title.toUpperCase()}
            </Text>
            <Text numberOfLines={1} style={{color: DS.text2, fontSize: 9, marginTop: 2, fontFamily: FONT}}>
              {subtitle}
            </Text>
          </View>
        </View>

        {/* flex: 1 keeps a long category list scrolling INSIDE the rail rather
            than stretching it past the panel. */}
        <ScrollView style={{flex: 1}} showsVerticalScrollIndicator={false}>
          {categories.map(cat => {
            const active = !historyActive && cat.id === activeId;
            return (
              <TvPressable
                key={cat.id}
                onPress={() => onSelect(cat.id)}
                label={cat.name}
                restBorderColor={active ? DS.gold : 'transparent'}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  borderRadius: DS.radiusSm,
                  paddingHorizontal: 10,
                  paddingVertical: 10,
                  marginBottom: 4,
                  backgroundColor: active ? 'rgba(212,180,131,0.30)' : 'transparent',
                }}>
                <Icon
                  name={categoryIcon(cat.name)}
                  size={17}
                  color={active ? DS.gold : DS.text2}
                />
                <Text
                  numberOfLines={1}
                  style={{
                    color: active ? DS.gold : DS.text,
                    fontSize: 11,
                    fontWeight: active ? '700' : '500',
                    letterSpacing: 0.6,
                    marginLeft: 10,
                    flex: 1,
                    fontFamily: FONT,
                  }}>
                  {cat.name.toUpperCase()}
                </Text>
              </TvPressable>
            );
          })}
        </ScrollView>
      </GlassPanel>

      {/* Order history sits in its own pane below the list — the Figma keeps it
          visually separate from the categories because it is a destination, not
          a filter. */}
      <TvPressable
        onPress={onHistory}
        label="View order history"
        restBorderColor={historyActive ? DS.gold : DS.borderSoft}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          height: 46,
          marginTop: DS.gap,
          borderRadius: DS.radius,
          backgroundColor: historyActive ? 'rgba(212,180,131,0.30)' : DS.glass,
          ...(GLASS_BLUR ?? {}),
        }}>
        <Icon name="time-outline" size={16} color={historyActive ? DS.gold : DS.text} />
        <Text
          numberOfLines={1}
          style={{
            color: historyActive ? DS.gold : DS.text,
            fontSize: 10,
            fontWeight: '700',
            letterSpacing: 0.8,
            marginLeft: 8,
            fontFamily: FONT,
          }}>
          VIEW ORDER HISTORY
        </Text>
      </TvPressable>
    </View>
  );
}

/**
 * Places the cart as CASH ON DELIVERY and reports the result.
 *
 * TV never offers online payment: Razorpay's checkout is an iframe that cannot
 * be driven by a remote (the same reason `useOrderHistoryViewModel` hides its
 * Pay CTA on TV), so the payment sheet the phone shows would be a dead end. The
 * backend creates every order COD-first, so this is the one honest path.
 *
 * `onPlaced` runs ONLY when the order exists — a guard-blocked attempt already
 * toasted its own reason and must not navigate.
 */
export function placeTvOrder(
  placeOrder: (method: 'cod') => Promise<boolean>,
  onPlaced: () => void,
) {
  placeOrder('cod')
    .then(placed => {
      if (placed) {
        toast.success('Your order has been placed.');
        onPlaced();
      }
    })
    .catch(error =>
      toast.error(getApiErrorMessage(error, 'Could not place your order. Please try again.')),
    );
}

/** Full-screen "don't touch the remote" veil while an order is in flight. */
export function BusyOverlay({label}: {label: string}) {
  return (
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
      <ActivityIndicator size="large" color={DS.gold} />
      <Text style={{color: DS.text, fontSize: 16, fontWeight: '600', marginTop: 16, fontFamily: FONT}}>
        {label}
      </Text>
      <Text style={{color: DS.muted, fontSize: 12, marginTop: 6, fontFamily: FONT}}>
        Please don't turn off your TV
      </Text>
    </View>
  );
}

/* ── Order status vocabulary ────────────────────────────────────────────────
   The phone screen resolves tones through the theme; the TV palette is fixed
   (it never follows the light/dark theme — the glass is always dark), so the
   colours are literal here. */
export interface OrderTone {
  color: string;
  icon: string;
}

const PLACED_TONE: OrderTone = {color: '#E7C77A', icon: 'time-outline'};

export const ORDER_TONE: Record<number, OrderTone> = {
  [BOOKING_STATUS.PENDING]: PLACED_TONE,
  [BOOKING_STATUS.IN_PROGRESS]: {color: '#9CC7E8', icon: 'restaurant-outline'},
  [BOOKING_STATUS.COMPLETED]: {color: '#8FD9A8', icon: 'checkmark-circle-outline'},
  [BOOKING_STATUS.CANCEL]: {color: '#F28B82', icon: 'close-circle-outline'},
};

/** An unknown status still has to render, so it reads as freshly placed. */
export function orderTone(status?: number): OrderTone {
  return (status != null ? ORDER_TONE[status] : undefined) ?? PLACED_TONE;
}

export function orderStatusLabel(status?: number): string {
  return (status != null ? FOOD_ORDER_STATUS_LABELS[status] : undefined) ?? 'Order Placed';
}

/** "18 Jun 2024" / "08:45 PM" — the Figma's two-line order stamp. */
export function orderStamp(iso?: string): {date: string; time: string} {
  if (!iso) {
    return {date: '', time: ''};
  }
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return {date: '', time: ''};
  }
  return {
    date: d.toLocaleDateString('en-GB', {day: '2-digit', month: 'short', year: 'numeric'}),
    time: d.toLocaleTimeString('en-US', {hour: '2-digit', minute: '2-digit', hour12: true}),
  };
}

/**
 * The Figma's dish thumbnails on an order row: the first two dishes, then a
 * "+N" tile for the rest. Names that no longer exist on the menu fall back to
 * `FoodImage`'s glass tile, so a retired dish leaves a gap, never a broken row.
 */
export function OrderThumbs({
  order,
  imageFor,
  size = 54,
  max = 2,
}: {
  order: FoodOrder;
  imageFor: (name?: string) => string | undefined;
  size?: number;
  max?: number;
}) {
  const items = order.foodItems ?? [];
  const shown = items.slice(0, max);
  const extra = items.length - shown.length;
  return (
    <View style={{flexDirection: 'row', alignItems: 'center'}}>
      {shown.map((item, index) => (
        <FoodImage
          key={index}
          src={imageFor(item.foodDetail?.name)}
          size={size}
          style={{marginRight: 6}}
        />
      ))}
      {extra > 0 ? (
        <View
          style={{
            width: size,
            height: size,
            borderRadius: DS.radiusSm,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(255,255,255,0.14)',
          }}>
          <Text style={{color: DS.text, fontSize: 13, fontWeight: '700', fontFamily: FONT}}>
            +{extra}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

export function orderItemCount(order: FoodOrder): number {
  return (order.foodItems ?? []).reduce((sum, item) => sum + (item.quantity ?? 1), 0);
}

/* ── Menu lookup ────────────────────────────────────────────────────────────
   Orders come back with only `foodDetail: {name, type}` — no image and no id —
   so the history frames have nothing to show a thumbnail from and nothing to
   re-order with. The menu, however, is already in the React Query cache under
   the SAME key the menu screen uses, so this reads it (no extra request) and
   matches by name. Anything unmatched simply falls back to the glass tile. */
export function useMenuFoodLookup() {
  const query = useQuery({
    queryKey: ['food', 'categories'],
    queryFn: () => foodRepository.getCategoriesWithOffers(),
    staleTime: 5 * 60 * 1000,
  });

  return useMemo(() => {
    const byName = new Map<string, Food>();
    for (const cat of query.data?.categories ?? []) {
      for (const food of cat.foodsInCategories ?? []) {
        const key = (food.name ?? '').trim().toLowerCase();
        if (key && !byName.has(key)) {
          byName.set(key, food);
        }
      }
    }
    return {
      /** The menu item behind an order line, when the name still matches. */
      find: (name?: string): Food | undefined =>
        name ? byName.get(name.trim().toLowerCase()) : undefined,
      isReady: byName.size > 0,
    };
  }, [query.data]);
}
