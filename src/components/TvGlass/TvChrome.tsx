import React, {useEffect, useState} from 'react';
import {ActivityIndicator, Image, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import Svg, {Path, Polygon, Rect} from 'react-native-svg';
import {useNavigation} from '@react-navigation/native';
import {toast} from '../Toast';
import {DS, DISPLAY, FONT, GLASS_BLUR, TvBackdrop, TvPressable, toSource} from './TvGlass';
import {NoSmokingIcon} from './RoomIcons';
import {useDashboardViewModel} from '../../viewmodels';
import {useFoodOrder} from '../../store/FoodOrderContext';
import {getDisplayName} from '../../models/user.model';
import {SHOW_COMING_SOON} from '../../utils/responsive';

import nexgenLogo from '../../assets/tv/nexgen-logo.png';

/**
 * The chrome every ten-foot screen wears: the top bar (room number, quick
 * launchers, greeting, cart, clock) and the footer (non-smoking, hotel
 * wordmark, vendor mark).
 *
 * Lives here rather than in a screen because the client's Figma repeats it
 * VERBATIM on the dashboard and on all four food frames — the moment one screen
 * hand-rolls it, the bar shifts by a pixel between pages and the illusion that
 * the guest is moving around ONE surface breaks.
 *
 * Sizes follow the TvGlass unit rule (spec ÷ 1.5, because the page renders
 * under the global `zoom: 1.5` in web/index.html).
 */

const comingSoon = () =>
  toast.info('Coming soon — this feature is not available yet.', {duration: 3000});

/**
 * Top-bar chip glyph size. One constant, because View Bill (a font glyph),
 * Netflix and Google Cast (SVG marks) have to measure the SAME on the row — at
 * ten feet a 2px difference between the three reads as a misaligned bar.
 * Sized up from the spec's 19 on client request: the launchers are the first
 * thing the guest hunts for from the bed, and the old marks were sofa-illegible.
 */
export const CHIP_ICON = 27;

/* ── Brand icons (client asked for the real marks, not lookalikes) ── */
export function NetflixIcon({size = CHIP_ICON}: {size?: number}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect x={5} y={2} width={4.2} height={20} fill="#B1060F" />
      <Rect x={14.8} y={2} width={4.2} height={20} fill="#B1060F" />
      <Polygon points="5,2 9.2,2 19,22 14.8,22" fill="#E50914" />
    </Svg>
  );
}

export function CastIcon({size = CHIP_ICON, color = DS.text}: {size?: number; color?: string}) {
  // Material "cast" glyph — screen with signal arcs.
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M21 3H3c-1.1 0-2 .9-2 2v3h2V5h18v14h-7v2h7c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM1 18v3h3c0-1.66-1.34-3-3-3zm0-4v2c2.76 0 5 2.24 5 5h2c0-3.87-3.13-7-7-7zm0-4v2c4.97 0 9 4.03 9 9h2c0-6.08-4.92-11-11-11z"
        fill={color}
      />
    </Svg>
  );
}

export function TopChip({
  icon,
  iconNode,
  label,
  onPress,
}: {
  icon?: string;
  iconNode?: React.ReactNode;
  label: string;
  onPress: () => void;
}) {
  return (
    <TvPressable
      onPress={onPress}
      label={label}
      // Fixed height + fixed icon slot so View Bill / Netflix / Google Cast all
      // measure identically — SVG marks and font glyphs baseline differently.
      style={{
        height: 56,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 10,
        borderRadius: 10,
      }}>
      <View style={{height: CHIP_ICON + 1, justifyContent: 'center'}}>
        {iconNode ?? <Icon name={icon ?? 'apps-outline'} size={CHIP_ICON} color={DS.text} />}
      </View>
      <Text
        numberOfLines={1}
        style={{color: DS.muted, fontSize: 10, marginTop: 3, letterSpacing: 0.5, fontFamily: FONT}}>
        {label.toUpperCase()}
      </Text>
    </TvPressable>
  );
}

export function TvClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);
  const time = now.toLocaleTimeString('en-US', {hour: '2-digit', minute: '2-digit', hour12: true});
  const date = `${now.getDate()} ${now.toLocaleDateString('en-US', {month: 'short'})}`;
  return (
    <View style={{alignItems: 'flex-end'}}>
      <Text style={{color: DS.text, fontSize: 17, fontWeight: '600', fontFamily: FONT}}>{time}</Text>
      <Text style={{color: DS.muted, fontSize: 11, marginTop: 1, fontFamily: FONT}}>{date}</Text>
    </View>
  );
}

/** Cart glyph + live count badge — the same control on every screen. */
export function TvCartButton({
  onPress,
  showLabel = false,
}: {
  onPress: () => void;
  showLabel?: boolean;
}) {
  const {getFoodCartCount} = useFoodOrder();
  const count = getFoodCartCount();
  return (
    <TvPressable
      onPress={onPress}
      label={count > 0 ? `Cart, ${count} items` : 'Cart'}
      style={{borderRadius: 10, padding: 7, alignItems: 'center'}}>
      <View>
        {/* Matches CHIP_ICON: the cart is a launcher on the same row as View
            Bill / Netflix, and a smaller glyph left the bar's right end
            looking unfinished once those grew. */}
        <Icon name="cart-outline" size={CHIP_ICON} color={DS.text} />
        {count > 0 ? (
          <View
            style={{
              position: 'absolute',
              top: -5,
              right: -8,
              minWidth: 18,
              height: 18,
              borderRadius: 9,
              backgroundColor: DS.gold,
              alignItems: 'center',
              justifyContent: 'center',
              paddingHorizontal: 3,
            }}>
            <Text style={{color: DS.dark, fontSize: 10, fontWeight: '800', fontFamily: FONT}}>
              {count}
            </Text>
          </View>
        ) : null}
      </View>
      {showLabel ? (
        <Text
          style={{color: DS.muted, fontSize: 8, letterSpacing: 0.5, marginTop: 3, fontFamily: FONT}}>
          CART
        </Text>
      ) : null}
    </TvPressable>
  );
}

export function TvDivider({height = 38, marginHorizontal = 10}: {height?: number; marginHorizontal?: number}) {
  return <View style={{width: 1, height, backgroundColor: DS.divider, marginHorizontal}} />;
}

/**
 * Top bar (Figma header, 88px → 59).
 *
 * Navigation is done through the ROOT navigator on purpose: View Bill lives in
 * the Home stack and Cart in the Food stack, so a screen inside either one
 * cannot reach the other with a plain `navigate()` — it is silently dropped.
 */
export function TvTopBar({onMenu}: {onMenu?: () => void}) {
  const dash = useDashboardViewModel();
  const navigation = useNavigation();
  const rootNavigate = (name: string, params?: object) =>
    (navigation as unknown as {navigate: (n: string, p?: object) => void}).navigate(name, params);

  return (
    <View style={{flexDirection: 'row', alignItems: 'center'}}>
      <View style={{paddingRight: 14}}>
        <Text style={{color: DS.muted, fontSize: 9, letterSpacing: 1, fontFamily: FONT}}>
          ROOM NO.
        </Text>
        <Text style={{color: DS.text, fontSize: 26, fontWeight: '600', fontFamily: FONT}}>
          {dash.roomNumber ?? '—'}
        </Text>
      </View>
      <TvDivider marginHorizontal={0} />

      <View style={{flexDirection: 'row', marginLeft: 6}}>
        <TopChip
          icon="receipt-outline"
          label="View Bill"
          onPress={() => rootNavigate('Home', {screen: 'ViewBill'})}
        />
        {SHOW_COMING_SOON ? (
          <>
            <TopChip iconNode={<NetflixIcon />} label="Netflix" onPress={comingSoon} />
            <TopChip iconNode={<CastIcon />} label="Google Cast" onPress={comingSoon} />
          </>
        ) : null}
      </View>

      <View style={{flex: 1, alignItems: 'center'}}>
        {dash.isLoading ? (
          <ActivityIndicator color={DS.gold} />
        ) : dash.profileError && !dash.user ? (
          // Only when there is no greeting to show: a refetch that fails while
          // the TV is offline keeps the cached guest (the offline notice says why).
          <Text style={{color: DS.danger, fontSize: 13, fontWeight: '600', fontFamily: FONT}}>
            Could not load profile
          </Text>
        ) : (
          <>
            {/* The guest greeting is the emotional centre of the bar, so it is
                sized ABOVE the room number (26) rather than below it — client
                asked for it to read from across the room. */}
            <Text
              numberOfLines={1}
              style={{color: DS.text, fontSize: 29, fontWeight: '600', fontFamily: FONT}}>
              Dear {getDisplayName(dash.user)}
            </Text>
            <Text
              numberOfLines={1}
              style={{color: DS.text2, fontSize: 15, marginTop: 3, fontFamily: FONT}}>
              Welcome to {dash.hotel?.name ?? 'your hotel'}
            </Text>
          </>
        )}
      </View>

      <TvCartButton onPress={() => rootNavigate('FoodTab', {screen: 'Cart'})} />

      <TvDivider />
      <TvClock />

      {onMenu ? (
        <TvPressable onPress={onMenu} label="Menu" style={{borderRadius: 10, padding: 7, marginLeft: 8}}>
          <Icon name="ellipsis-vertical" size={23} color={DS.text} />
        </TvPressable>
      ) : null}
    </View>
  );
}

/** Footer: non-smoking left, hotel wordmark centre, vendor mark right. */
export function TvFooter({marginTop = 16}: {marginTop?: number}) {
  const dash = useDashboardViewModel();
  return (
    <View style={{flexDirection: 'row', alignItems: 'center', marginTop}}>
      <View style={{flex: 1, flexDirection: 'row', alignItems: 'center'}}>
        {/* 28, not 26: the mark is a filled ring that uses its whole box, and
            the extra 2px is what makes the cut cigarette inside it legible. The
            row's height is set by the 32px vendor logo, so this costs nothing. */}
        <NoSmokingIcon size={28} color={DS.text2} />
        <Text style={{color: DS.text2, fontSize: 12, marginLeft: 8, fontFamily: FONT}}>
          Non-Smoking Room
        </Text>
      </View>
      <Text
        style={{
          color: DS.champagne,
          fontSize: 23,
          fontFamily: DISPLAY,
          fontWeight: '300',
          letterSpacing: 1.2,
        }}>
        {dash.hotel?.name ?? 'your hotel'}
      </Text>
      {/* Vendor mark, right-aligned. flex: 1 mirrors the non-smoking block on
          the left so the hotel wordmark stays optically centred. */}
      <View style={{flex: 1, alignItems: 'flex-end'}}>
        {/* The inner block is only as wide as the logo, and its children align
            left inside it — so "POWERED BY" starts flush with the logo's left
            edge instead of sitting centred above it. */}
        <View style={{alignItems: 'flex-start'}}>
          <Text
            style={{color: DS.muted, fontSize: 7, letterSpacing: 1.4, marginBottom: 3, fontFamily: FONT}}>
            POWERED BY
          </Text>
          <Image
            source={toSource(nexgenLogo)}
            resizeMode="contain"
            // 3:1 — the trimmed asset's own aspect, so nothing is squashed.
            style={{width: 96, height: 32}}
          />
        </View>
      </View>
    </View>
  );
}

/**
 * A translucent panel — the rounded pane the Figma floats every column and card
 * inside. `padded` is off for panels whose children paint to the edge.
 */
export function GlassPanel({
  style,
  children,
}: {
  style?: object;
  children: React.ReactNode;
}) {
  return (
    <View
      style={{
        borderRadius: DS.radius,
        borderWidth: 1,
        borderColor: DS.borderSoft,
        backgroundColor: DS.glass,
        overflow: 'hidden',
        ...(GLASS_BLUR ?? {}),
        ...(style ?? {}),
      }}>
      {children}
    </View>
  );
}

/**
 * The page frame: backdrop, overscan-safe padding, top bar, footer.
 *
 * Every ten-foot frame is this sandwich with a different filling, and the
 * numbers matter — the top bar and footer have to land on the same pixel row on
 * every page or the glass reads as two surfaces instead of one. Children supply
 * their own `flex: 1` row so the middle absorbs the viewport.
 */
export function TvScreen({
  onMenu,
  children,
}: {
  /** Renders the ⋮ in the top bar (the dashboard's guest menu). */
  onMenu?: () => void;
  children: React.ReactNode;
}) {
  return (
    <SafeAreaView style={{flex: 1, backgroundColor: DS.pageBg}} edges={['top']}>
      <TvBackdrop />
      <View
        style={{flex: 1, paddingHorizontal: DS.margin, paddingTop: DS.margin, paddingBottom: 14}}>
        <TvTopBar onMenu={onMenu} />
        {children}
        <TvFooter marginTop={12} />
      </View>
    </SafeAreaView>
  );
}

/** Back button + page name — the header row inside a panel's top-left. */
export function TvPanelHeader({
  title,
  subtitle,
  onBack,
  right,
  size = 34,
  marginBottom = 14,
}: {
  title: string;
  subtitle?: string;
  onBack: () => void;
  /** Trailing control (refresh, a count) on the same row. */
  right?: React.ReactNode;
  size?: number;
  marginBottom?: number;
}) {
  return (
    <View style={{flexDirection: 'row', alignItems: 'center', marginBottom}}>
      <TvBackButton onPress={onBack} size={size} />
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
        {subtitle ? (
          <Text
            numberOfLines={1}
            style={{color: DS.text2, fontSize: 9, marginTop: 2, fontFamily: FONT}}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right}
    </View>
  );
}

/** Square glass back button — the Figma's ← at the top-left of every panel. */
export function TvBackButton({onPress, size = 44}: {onPress: () => void; size?: number}) {
  return (
    <TvPressable
      onPress={onPress}
      label="Back"
      restBorderColor={DS.border}
      style={{
        width: size,
        height: size,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: DS.glass,
        ...(GLASS_BLUR ?? {}),
      }}>
      <Icon name="arrow-back" size={Math.round(size * 0.45)} color={DS.text} />
    </TvPressable>
  );
}
