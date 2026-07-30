import React, {useEffect, useReducer} from 'react';
import {
  Image,
  type ImageSourcePropType,
  Platform,
  Pressable,
  StyleSheet,
  type StyleProp,
  Text,
  View,
  type ViewStyle,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {useTVFocus} from '../../hooks/useTVFocus';
import {IS_TV} from '../../utils/responsive';

// Client-supplied backdrop plate (assests/background images.jpeg) — the exact
// suite photo the Figma frames sit on. Deliberately NOT hero.jpg: the hero card
// paints its own photo on top, and reusing one image for both flattened the page.
//
// PRE-BLURRED at build time (640×360, blur+brightness+saturation already baked
// in) rather than filtered at runtime. See TvBackdrop for why. `room-bg.jpg` is
// the sharp source, kept so the plate can be re-baked if the look is retuned.
import backdropImg from '../../assets/tv/room-bg-blurred.jpg';

/**
 * The TV ("Luxury Hotel Smart Room UI") design system — tokens plus the glass
 * primitives every ten-foot screen is built from.
 *
 * Lives outside `screens/` because more than one screen wears it: the dashboard
 * and Light Control must look like ONE surface the guest scrolls around in, not
 * two pages that happen to share a colour. Anything duplicated here would drift
 * the moment one screen is tweaked.
 *
 * UNIT RULE: the design system is authored at 1920×1080 DEVICE px, but these
 * screens render under the global `zoom: 1.5` (web/index.html), so every spec
 * value is divided by 1.5. 640px hero → 427, 24px radius → 16, 60px temperature
 * → 40, 30px blur → 20 … If a number looks smaller than the spec, that is why —
 * on the panel it measures exactly what the spec says.
 *
 * NOT exported from `components/index.ts` on purpose: the phone build has no use
 * for it, so it stays a deliberate `components/TvGlass` import.
 */
export const DS = {
  // palette (spec: COLOR PALETTE)
  gold: '#D4B483',
  goldPressed: '#B79259',
  champagne: '#E7D7B5',
  beige: '#F7F2EA',
  text: '#FFFFFF',
  text2: '#EDE7DF',
  muted: '#D9D3CB',
  dark: '#2B2B2B',
  danger: '#F28B82',
  /** "money in your favour" green — payments, refunds, a settled bill. */
  good: '#8FD9A8',
  // glass — spec said white 16%, client then asked for MORE see-through
  // ("glass like effect"), so fills sit slightly below spec
  glass: 'rgba(255,255,255,0.12)',
  glassSoft: 'rgba(255,255,255,0.10)',
  glassGold: 'rgba(212,180,131,0.20)',
  border: 'rgba(255,255,255,0.28)',
  borderSoft: 'rgba(255,255,255,0.24)',
  divider: 'rgba(255,255,255,0.18)',
  // focus ring: champagne — brighter than the gold accent so selection reads
  // at ten feet (the spec defines hover/pressed but TVs need focus)
  focus: '#E7D7B5',
  toggleOff: '#D9D4CC',
  /** Behind the backdrop photo, so a slow image decode never flashes white. */
  pageBg: '#241c10',
  // geometry (spec ÷ 1.5)
  margin: 27,
  gap: 13,
  radius: 16,
  radiusSm: 12,
};

/* spec: shadow #000 18%, blur 40, offset 0/12 → ÷1.5 */
export const SHADOW = {
  shadowColor: '#000000',
  shadowOpacity: 0.18,
  shadowRadius: 27,
  shadowOffset: {width: 0, height: 8},
};

/**
 * spec: backdrop blur 30 / background blur 24 + brightness 85 + saturation 110
 *
 * OFF on TV. Light Control puts this on ten-plus fixture tiles at once, and every
 * `backdrop-filter` region forces the compositor to re-sample and blur the pixels
 * beneath it — at `zoom: 1.5` that is a ~36px device-pixel kernel, a dozen times
 * over a 1920×1080 surface. The webOS SoC locks up under it. Because the backdrop
 * plate now ships pre-blurred, there is nothing sharp left underneath to blur, so
 * the translucent fill plus GlassSheen reads the same for free. Desktop web keeps
 * the real thing.
 */
export const GLASS_BLUR =
  Platform.OS === 'web' && !IS_TV
    ? ({backdropFilter: 'blur(24px) saturate(1.15)'} as object)
    : null;

/* spec: SF Pro Display, alternative Inter — fallback chain until files ship */
export const FONT =
  Platform.OS === 'web'
    ? "'SF Pro Display', 'SF Pro Text', Inter, 'Helvetica Neue', 'Segoe UI', Roboto, sans-serif"
    : undefined;
export const SERIF = Platform.OS === 'web' ? 'Georgia, "Times New Roman", serif' : 'serif';

/** Webpack emits asset URLs (string); Metro emits require ids (number). */
export function toSource(asset: unknown): ImageSourcePropType {
  return typeof asset === 'number' ? asset : {uri: String(asset)};
}

/**
 * The frosted "Vision Pro" sheen. backdrop-filter alone cannot make a PHOTO
 * tile look like glass — the photo covers the card, so there is nothing to see
 * through. The mockup gets its premium look from a milky veil + a diagonal
 * light gradient + a catch-light on the top edge, layered OVER the photo.
 * Built as real layers so it renders even where backdrop-filter is weak.
 */
/**
 * KEEP THESE LOW. The sheen composites ON TOP of the card's own `DS.glass` fill,
 * so its values are not the tile's opacity — they multiply with it. The previous
 * numbers (0.08 veil under a gradient peaking at 0.26) stacked with the 0.12 fill
 * to 40% white at the corner and 21% through the body, against a 16% spec, which
 * is what made the tiles read as painted panels instead of glass. Tuned so the
 * body lands on spec and the corner keeps just enough lift to catch the light.
 */
const SHEEN_GRADIENT =
  Platform.OS === 'web'
    ? ({
        backgroundImage:
          'linear-gradient(165deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.03) 38%, rgba(255,255,255,0.01) 62%, rgba(255,255,255,0.06) 100%)',
      } as object)
    : null;

/**
 * `strength` scales the whole sheen (veil + gradient + catch-light) for
 * surfaces that must read as MORE see-through than a standard card — the light
 * fixture tiles, where the client asked for the glass to be barely there. The
 * default of 1 is a no-op, so every existing caller renders unchanged.
 */
export function GlassSheen({strength = 1}: {strength?: number}) {
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        opacity: strength,
        backgroundColor: 'rgba(252,247,238,0.03)',
        ...(SHEEN_GRADIENT ?? {}),
      }}>
      {/* top-edge catch-light — the strongest single "this is glass" cue, and
          the cheapest: one hairline row, not a fill. */}
      <View style={{height: 1, backgroundColor: 'rgba(255,255,255,0.38)'}} />
    </View>
  );
}

/**
 * The TV stack insets every screen by 24 for overscan
 * (HomeStackNavigator.useStackScreenOptions). The backdrop has to bleed back out
 * over that inset or the photo stops short of the panel edge and leaves two
 * bars of theme colour down the sides.
 */
const STACK_INSET = 24;

/**
 * Full-bleed blurred bedroom photo + warm tint (spec BACKGROUND: "Luxury Hotel
 * Bedroom (Blurred)"). Every TV screen paints this first so the glass cards on
 * top of it all sit on the same field.
 *
 * The blur, brightness and saturation are BAKED INTO THE ASSET — there is no
 * runtime `filter` here on purpose. A full-screen CSS blur is expensive on its
 * own, but the real cost was that it sat underneath a dozen `backdrop-filter`
 * cards on Light Control: each one had to blur a source that was itself being
 * filtered, which the compositor cannot cache, and the TV froze. Retuning the
 * look now means re-baking the plate, not editing a filter string.
 */
export function TvBackdrop() {
  const bleed = {
    ...StyleSheet.absoluteFillObject,
    left: -STACK_INSET,
    right: -STACK_INSET,
  };
  return (
    <>
      {/* scaled past the frame to crop past the dark night window on the left
          of the plate (the blur's own edge smear is already baked in) */}
      <Image
        source={toSource(backdropImg)}
        resizeMode="cover"
        style={{...bleed, transform: [{scale: 1.3}]}}
      />
      {/* warm veil — pulls the whole field towards the champagne palette */}
      <View style={{...bleed, backgroundColor: 'rgba(247,236,218,0.06)'}} />
    </>
  );
}

/* ── Generic focusable wrapper: champagne ring on D-pad focus ── */
export function TvPressable({
  onPress,
  label,
  style,
  restBorderColor = 'transparent',
  hasTVPreferredFocus = false,
  disabled = false,
  children,
}: {
  onPress: () => void;
  label: string;
  style?: StyleProp<ViewStyle>;
  restBorderColor?: string;
  /** Android TV seeds focus here on mount (web seeds focus via the DOM). */
  hasTVPreferredFocus?: boolean;
  /**
   * Greys out AND drops out of the focus order. Both halves matter on a TV:
   * a control that still takes focus but does nothing is a dead stop on the
   * D-pad path, and the guest has no pointer to route around it with.
   */
  disabled?: boolean;
  children: React.ReactNode;
}) {
  const {focused, onFocus, onBlur} = useTVFocus();
  return (
    <Pressable
      onPress={onPress}
      onFocus={onFocus}
      onBlur={onBlur}
      focusable={!disabled}
      disabled={disabled}
      hasTVPreferredFocus={hasTVPreferredFocus}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{disabled}}
      style={[
        {borderWidth: 2, borderColor: focused && !disabled ? DS.focus : restBorderColor},
        style,
      ]}>
      {children}
    </Pressable>
  );
}

/* ── Glass card shell (spec: BOTTOM CONTROL CARDS, 210 → 140) ── */
export function PanelCard({
  title,
  flex = 1,
  width,
  minHeight = 150,
  children,
}: {
  title: string;
  flex?: number;
  /** Fixed width instead of flex (Light Scenes hugs its three squares). */
  width?: number;
  minHeight?: number;
  children: React.ReactNode;
}) {
  return (
    <View
      style={{
        ...(width != null ? {width} : {flex}),
        minHeight,
        overflow: 'hidden',
        backgroundColor: DS.glass,
        borderColor: DS.border,
        borderWidth: 1,
        borderRadius: DS.radius,
        padding: DS.gap,
        ...SHADOW,
        ...(GLASS_BLUR ?? {}),
      }}>
      {/* painted first = sits behind the content, so text stays crisp */}
      <GlassSheen />
      <SectionLabel>{title}</SectionLabel>
      {children}
    </View>
  );
}

/** The small tracked-out caption above a card's contents. */
export function SectionLabel({children}: {children: string}) {
  return (
    <Text
      style={{
        color: DS.muted,
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 1,
        marginBottom: 8,
        fontFamily: FONT,
      }}>
      {children.toUpperCase()}
    </Text>
  );
}

/* ── Round glass icon button (climate ± , fan speed, back) ── */
export function RoundButton({
  icon,
  onPress,
  label,
  filled = false,
  size = 34,
  marginLeft = 6,
}: {
  icon: string;
  onPress: () => void;
  label: string;
  filled?: boolean;
  size?: number;
  marginLeft?: number;
}) {
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
        backgroundColor: filled ? DS.gold : 'rgba(255,255,255,0.14)',
        marginLeft,
      }}>
      <Icon name={icon} size={Math.round(size * 0.47)} color={filled ? DS.dark : DS.text} />
    </TvPressable>
  );
}

/* ── CTAs ───────────────────────────────────────────────────────────────────
   The gold primary and the glass secondary. They started out inside the food
   frames' own parts file; they live here now because every ten-foot frame ends
   in the same two buttons (bill, profile, settings, feedback included) and a
   second copy is how the gold drifts between pages. `screens/Food/components/
   TvFoodParts` re-exports them, so the food frames' imports are unchanged. */
export function GoldButton({
  label,
  onPress,
  icon = 'chevron-forward',
  disabled = false,
  height = 44,
  hasTVPreferredFocus = false,
  style,
}: {
  label: string;
  onPress: () => void;
  /** Trailing glyph; `null` for none. */
  icon?: string | null;
  disabled?: boolean;
  height?: number;
  hasTVPreferredFocus?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <TvPressable
      onPress={disabled ? () => {} : onPress}
      label={label}
      restBorderColor="#E5CFA5"
      hasTVPreferredFocus={hasTVPreferredFocus}
      style={[
        {
          height,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 11,
          paddingHorizontal: 16,
          backgroundColor: DS.gold,
          opacity: disabled ? 0.5 : 1,
        },
        style,
      ]}>
      <Text
        numberOfLines={1}
        style={{color: DS.text, fontSize: 13, fontWeight: '700', letterSpacing: 1, fontFamily: FONT}}>
        {label.toUpperCase()}
      </Text>
      {icon ? <Icon name={icon} size={14} color={DS.text} style={{marginLeft: 8}} /> : null}
    </TvPressable>
  );
}

export function GlassButton({
  label,
  onPress,
  icon,
  badge,
  height = 40,
  tone,
  hasTVPreferredFocus = false,
  style,
}: {
  label: string;
  onPress: () => void;
  icon?: string;
  /** Trailing gold pill (cart count). */
  badge?: number;
  height?: number;
  /** Tints glyph, label, border and fill (log out uses `DS.danger`). */
  tone?: string;
  hasTVPreferredFocus?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <TvPressable
      onPress={onPress}
      label={label}
      restBorderColor={tone ? `${tone}66` : DS.border}
      hasTVPreferredFocus={hasTVPreferredFocus}
      style={[
        {
          height,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 11,
          paddingHorizontal: 14,
          // A tinted button needs the tint in the FILL too: the tone alone on
          // 10% white glass over a bright backdrop is not readable at ten feet.
          backgroundColor: tone ? `${tone}3d` : 'rgba(255,255,255,0.10)',
          ...(GLASS_BLUR ?? {}),
        },
        style,
      ]}>
      {icon ? <Icon name={icon} size={15} color={tone ?? DS.text} style={{marginRight: 8}} /> : null}
      {/* The LABEL stays white even when toned. The glass sits on a photo that
          has bright bands in it, and a pink-on-pale label vanishes in them —
          the tinted fill, border and glyph carry the "destructive" reading. */}
      <Text
        numberOfLines={1}
        style={{
          color: DS.text,
          fontSize: 12,
          fontWeight: '600',
          letterSpacing: 0.8,
          fontFamily: FONT,
        }}>
        {label.toUpperCase()}
      </Text>
      {badge != null && badge > 0 ? (
        <View
          style={{
            minWidth: 18,
            height: 18,
            borderRadius: 9,
            backgroundColor: DS.gold,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 5,
            marginLeft: 8,
          }}>
          <Text style={{color: DS.dark, fontSize: 10, fontWeight: '800', fontFamily: FONT}}>
            {badge}
          </Text>
        </View>
      ) : null}
    </TvPressable>
  );
}

/** Label/value line in a summary block; `total` promotes it to the gold total. */
export function MoneyRow({
  label,
  value,
  total = false,
  positive = false,
}: {
  label: string;
  value: string;
  total?: boolean;
  positive?: boolean;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: total ? 2 : 4,
      }}>
      <Text
        style={{
          color: total ? DS.text : DS.text2,
          fontSize: total ? 14 : 12,
          fontWeight: total ? '700' : '400',
          letterSpacing: total ? 0.6 : 0,
          fontFamily: FONT,
        }}>
        {total ? label.toUpperCase() : label}
      </Text>
      <Text
        style={{
          color: positive ? DS.good : total ? DS.gold : DS.text,
          fontSize: total ? 20 : 13,
          fontWeight: total ? '700' : '500',
          fontFamily: FONT,
        }}>
        {value}
      </Text>
    </View>
  );
}

/* ── Scene squares (spec: 96×96 → 64×64 CSS, selected gold) ── */
export function SceneSquare({
  name,
  icon,
  active,
  onPress,
}: {
  name: string;
  icon: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TvPressable
      onPress={onPress}
      label={`Toggle ${name}`}
      restBorderColor={active ? DS.gold : DS.borderSoft}
      // Fills the card's content height (~92 CSS) instead of the spec's 64 —
      // the client wants no dead space under the squares.
      style={{
        width: 82,
        height: 100,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: DS.radiusSm,
        backgroundColor: active ? 'rgba(212,180,131,0.32)' : 'rgba(255,255,255,0.14)',
        marginRight: 8,
      }}>
      <Icon name={icon} size={26} color={active ? DS.gold : DS.text} />
      <Text
        numberOfLines={1}
        style={{
          color: active ? DS.gold : DS.muted,
          fontSize: 9,
          fontWeight: '700',
          marginTop: 8,
          letterSpacing: 0.5,
          fontFamily: FONT,
        }}>
        {name.toUpperCase()}
      </Text>
    </TvPressable>
  );
}

/* ── Scene taxonomy ─────────────────────────────────────────────────────────
   The room-devices API returns DND, MMR and the lighting moods in ONE list of
   scene buttons; the client wants DND/MMR on their own card and everything else
   under "Light Scenes". The split is by NAME because the API exposes no other
   discriminator — so both screens must use these same rules or a scene shows up
   twice. */
export const DND_RE = /\bdnd\b|do\s*not\s*disturb/i;
export const MMR_RE = /\bmmr\b|make\s*my\s*room/i;

/** True for DND / MMR — i.e. a scene that is NOT a lighting mood. */
export function isRoomModeScene(name?: string): boolean {
  const value = name ?? '';
  return DND_RE.test(value) || MMR_RE.test(value);
}

export function sceneIcon(name?: string): string {
  const key = (name ?? '').toLowerCase();
  if (key.includes('night')) return 'moon-outline';
  if (key.includes('sleep')) return 'bed-outline';
  if (key.includes('movie')) return 'film-outline';
  if (key.includes('read')) return 'book-outline';
  if (key.includes('relax')) return 'flower-outline';
  if (key.includes('master') || key.includes('all')) return 'power';
  return 'bulb-outline';
}

/* ── Demo light scenes ──────────────────────────────────────────────────────
   Shown only while the room has no real scenes, so the client presentation
   still has something to click. State is module-level rather than per-screen:
   a guest who switches "Relax" on from the dashboard and then opens Light
   Control must not find it off again. Dies with the app — nothing is persisted
   and nothing is sent to the backend. */
/* Master Scene is an ORDINARY scene, not a master switch over the others. The
   reference web app proves it: scenes are just room devices with
   `isSceneButton`, and `RoomScenes.toggleScene` fires the same
   `{channelid, action: 'TurnOn' | 'TurnOff'}` exec for every one of them,
   flipping only that device's own key. `isMasterScene` exists, but it only
   mirrors the switch into a second card — it does not change the call or make
   the scenes mutually exclusive. Whatever "master" turns on happens on the
   controller, not here. So: three independent toggles. */
export const DEMO_SCENES = [
  {key: 'relax', name: 'Relax', icon: 'flower-outline'},
  {key: 'sleep', name: 'Sleep', icon: 'bed-outline'},
  {key: 'master', name: 'Master Scene', icon: 'power'},
] as const;

const demoOn: Record<string, boolean> = {};
const demoListeners = new Set<() => void>();

export function useDemoScenes() {
  const [, rerender] = useReducer((n: number) => n + 1, 0);
  useEffect(() => {
    demoListeners.add(rerender);
    return () => {
      demoListeners.delete(rerender);
    };
  }, []);
  return {
    isOn: (key: string) => Boolean(demoOn[key]),
    toggle: (key: string) => {
      demoOn[key] = !demoOn[key];
      demoListeners.forEach(fn => fn());
    },
  };
}
