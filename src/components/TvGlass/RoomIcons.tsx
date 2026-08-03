import React from 'react';
import Svg, {Circle, Ellipse, G, Path, Rect} from 'react-native-svg';

/**
 * Line icons for the room's light fixtures, drawn to the Figma's Light Control
 * screen.
 *
 * Hand-drawn rather than picked from Ionicons because the set the design calls
 * for — pendant lamp, cove light, wardrobe, balcony railing, a bed with the lamp
 * on a specific side — simply does not exist in any icon font. A "bulb" standing
 * in for all ten reads as ten identical tiles from across the room, which is the
 * one thing this screen must not do.
 *
 * All paths are authored in a 64×64 box with a 1.8 stroke, so they stay
 * optically consistent at any size and inherit `color` for the on/off state.
 */
export type RoomIconName =
  | 'pendant'
  | 'door'
  | 'ceiling'
  | 'bedLeft'
  | 'bedRight'
  | 'cove'
  | 'bathroom'
  | 'mirror'
  | 'wardrobe'
  | 'balcony'
  | 'fan'
  | 'bulb';

/** Device `friendlyname` → icon. Ordered: the first match wins. */
const BY_NAME: {re: RegExp; icon: RoomIconName}[] = [
  {re: /\bfan\b|exhaust/i, icon: 'fan'},
  {re: /master|all\s*light/i, icon: 'pendant'},
  {re: /entrance|entry|foyer|lobby|corridor|passage|\bdoor\b/i, icon: 'door'},
  {re: /ceiling|down\s*light|main\s*light|roof/i, icon: 'ceiling'},
  {re: /(bed|night|side).*(left|lt\b)|left.*(bed|lamp)/i, icon: 'bedLeft'},
  {re: /(bed|night|side).*(right|rt\b)|right.*(bed|lamp)/i, icon: 'bedRight'},
  {re: /cove|strip|profile|valance|pelmet/i, icon: 'cove'},
  {re: /bath|wash|shower|toilet|\bwc\b|basin/i, icon: 'bathroom'},
  {re: /mirror|vanity|dress/i, icon: 'mirror'},
  {re: /wardrobe|closet|cupboard|almirah/i, icon: 'wardrobe'},
  {re: /balcony|terrace|patio|deck|garden|outdoor/i, icon: 'balcony'},
  {re: /bed/i, icon: 'bedLeft'},
];

export function roomIconFor(name?: string): RoomIconName {
  const value = name ?? '';
  return BY_NAME.find(entry => entry.re.test(value))?.icon ?? 'bulb';
}

function Bed() {
  return (
    <G>
      {/* table lamp, clear of the bed */}
      <Path d="M4 25 L8 16 H15 L19 25 Z" />
      <Path d="M11.5 25 V39" />
      <Path d="M7 39 H16" />
      {/* bed from the side, headboard on the right */}
      <Path d="M56 42 V24 a3 3 0 0 0 -3 -3 H47" />
      <Path d="M24 42 V34 H56" />
      <Path d="M29 34 V28 H40 V34" />
      <Path d="M22 42 H58" />
      <Path d="M26 42 V47" />
      <Path d="M55 42 V47" />
    </G>
  );
}

const PATHS: Record<RoomIconName, React.ReactNode> = {
  /* pendant lamp with light spilling below — the "master" fixture */
  pendant: (
    <G>
      <Path d="M32 6 V17" />
      <Path d="M11 36 C11 24 20 17 32 17 C44 17 53 24 53 36 Z" />
      <Path d="M28 36 v3 a4 4 0 0 0 8 0 v-3" />
      <Path d="M17 45 L13 51" />
      <Path d="M32 48 V55" />
      <Path d="M47 45 L51 51" />
    </G>
  ),
  /* entrance door with handle, standing on the floor line */
  door: (
    <G>
      <Rect x={16} y={8} width={32} height={47} rx={2} />
      <Rect x={21} y={13} width={22} height={37} rx={1.5} />
      <Circle cx={39} cy={33} r={2} />
      <Path d="M10 55 H54" />
    </G>
  ),
  /* flush ring ceiling light casting downwards */
  ceiling: (
    <G>
      <Ellipse cx={32} cy={27} rx={17} ry={6} />
      <Ellipse cx={32} cy={27} rx={8.5} ry={3} />
      <Path d="M12 35 L8 42" />
      <Path d="M22 38 L19 46" />
      <Path d="M32 39 V48" />
      <Path d="M42 38 L45 46" />
      <Path d="M52 35 L56 42" />
    </G>
  ),
  bedLeft: <Bed />,
  /* same bed, mirrored so the lamp sits on the other side */
  bedRight: (
    <G transform="translate(64,0) scale(-1,1)">
      <Bed />
    </G>
  ),
  /* cove / trough detail washing the ceiling */
  cove: (
    <G>
      <Path d="M8 22 H56" />
      <Path d="M14 22 L20 34 H44 L50 22" />
      <Path d="M21 42 L17 49" />
      <Path d="M32 44 V51" />
      <Path d="M43 42 L47 49" />
    </G>
  ),
  /* round mirror light above the basin */
  bathroom: (
    <G>
      <Circle cx={32} cy={20} r={7.5} />
      <Path d="M32 7 V4" />
      <Path d="M32 36 V33" />
      <Path d="M45 20 H48" />
      <Path d="M16 20 H19" />
      <Path d="M41.5 10.5 L43.5 8.5" />
      <Path d="M22.5 29.5 L20.5 31.5" />
      <Path d="M41.5 29.5 L43.5 31.5" />
      <Path d="M22.5 10.5 L20.5 8.5" />
      <Path d="M15 40 H49" />
      <Path d="M19 40 L23 51 H41 L45 40" />
      <Path d="M32 51 V57" />
      <Path d="M25 57 H39" />
    </G>
  ),
  /* full-length mirror flanked by light strips */
  mirror: (
    <G>
      <Rect x={24} y={8} width={17} height={48} rx={8.5} />
      <Path d="M29 44 L37 28" />
      <Path d="M32 48 L36 41" />
      <Path d="M13 18 V46" />
      <Path d="M52 18 V46" />
    </G>
  ),
  /* wardrobe with the rail lit inside */
  wardrobe: (
    <G>
      <Rect x={12} y={9} width={40} height={46} rx={2} />
      <Path d="M18 17 H46" />
      <Path d="M25 17 V21" />
      <Path d="M39 17 V21" />
      <Path d="M25 21 C21 24 20 30 21 36 H29 C30 30 29 24 25 21 Z" />
      <Path d="M39 21 C35 24 34 30 35 36 H43 C44 30 43 24 39 21 Z" />
      <Path d="M12 43 H52" />
      <Path d="M27 49 H37" />
    </G>
  ),
  /* planter standing on the balcony railing */
  balcony: (
    <G>
      <Path d="M32 29 C32 21 27 16 21 15" />
      <Path d="M32 29 C32 21 37 16 43 15" />
      <Path d="M32 29 V22" />
      <Path d="M25 29 H39 L37 41 H27 Z" />
      <Path d="M8 45 H56" />
      <Path d="M8 57 H56" />
      <Path d="M17 45 V57" />
      <Path d="M27 45 V57" />
      <Path d="M37 45 V57" />
      <Path d="M47 45 V57" />
    </G>
  ),
  fan: (
    <G>
      <Circle cx={32} cy={32} r={4.5} />
      <G rotation={0} origin="32, 32">
        <Path d="M32 27.5 C30 18 22 12 17 16 C12.5 20 20 27 32 27.5 Z" />
      </G>
      <G rotation={120} origin="32, 32">
        <Path d="M32 27.5 C30 18 22 12 17 16 C12.5 20 20 27 32 27.5 Z" />
      </G>
      <G rotation={240} origin="32, 32">
        <Path d="M32 27.5 C30 18 22 12 17 16 C12.5 20 20 27 32 27.5 Z" />
      </G>
    </G>
  ),
  bulb: (
    <G>
      <Path d="M32 8 C22 8 15 15.5 15 25 C15 32 19 35.5 21 40 H43 C45 35.5 49 32 49 25 C49 15.5 42 8 32 8 Z" />
      <Path d="M23 46 H41" />
      <Path d="M26 52 H38" />
    </G>
  ),
};

export function RoomIcon({
  name,
  size = 76,
  color,
}: {
  name: RoomIconName;
  size?: number;
  color: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <G fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        {PATHS[name]}
      </G>
    </Svg>
  );
}

/* ── Room modes (the dashboard's DND & MMR card) ─────────────────────────────
   The client's Figma draws these two as real signs, not as mood glyphs: a door
   hanger with a moon in it, and a housekeeping trolley with a linen sack. A
   crescent and a sparkle (Ionicons `moon-outline` / `sparkles-outline`, what
   this card used to show) are the ABSTRACTIONS of those signs — they say "night"
   and "clean" rather than "hang this on your door" and "come and service the
   room", which is the whole point of the pair. */

/**
 * DND: the door hanger, with the moon knocked out of it.
 *
 * Filled, not stroked — matching the Figma, and for the same reason
 * `NoSmokingIcon` is filled: at the 22px this renders on the card, an outlined
 * tag with an outlined moon inside it silts up into a grey blob. One <Path> with
 * `fillRule="evenodd"`, so the handle hole and the crescent both cancel out of
 * the tag body and show the glass behind them.
 *
 * The crescent is two arcs — the outer edge on an r8.5 circle at (32,40), the
 * bite on an r7.6 circle at (36.8,37) — meeting at their two intersection
 * points. Those endpoints are computed from the circles, so if you move one
 * centre you must recompute both, or the moon springs open into a leaf.
 */
export function DoNotDisturbIcon({size = 38, color}: {size?: number; color: string}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Path
        fill={color}
        fillRule="evenodd"
        d={[
          // tag: semicircular top, straight sides, rounded foot. Deliberately
          // squat (34×56 of the 64 box) — a true hanger's 2:5 proportions drew a
          // pill barely 9px wide on the card, with no room left for the moon.
          'M15 21 A17 17 0 0 1 49 21 V49 A11 11 0 0 1 38 60 H26 A11 11 0 0 1 15 49 Z',
          // the hole that goes over the door handle
          'M32 12.4 A5.6 5.6 0 1 1 32 23.6 A5.6 5.6 0 1 1 32 12.4 Z',
          // crescent moon
          'M42.21 47.29 A11.5 11.5 0 1 1 31.05 30.55 A10.2 10.2 0 0 0 42.21 47.29 Z',
        ].join(' ')}
      />
    </Svg>
  );
}

/**
 * MMR: the housekeeping trolley — linen sack on the frame, two castors, and the
 * "freshly serviced" sparkles the Figma sets above it.
 *
 * Stroked, like every other room sign here, because that IS how the Figma draws
 * it (the hanger beside it is the deliberate exception). The cart is stripped to
 * sack + frame + wheels: the real thing carries bottles and folded towels on its
 * shelves, and every one of them turns to grit at 22px.
 */
export function MakeMyRoomIcon({
  size = 38,
  color,
  strokeWidth,
}: {
  size?: number;
  color: string;
  strokeWidth?: number;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <G
        fill="none"
        stroke={color}
        // Same rule as ServiceGlyph: small marks need a heavier relative stroke
        // or they grey out at ten feet; large ones fill in.
        strokeWidth={strokeWidth ?? (size <= 30 ? 3.2 : 2.6)}
        strokeLinecap="round"
        strokeLinejoin="round">
        {/* linen sack, hanging in the frame */}
        <Path d="M28 16 H54 L52 34 H30 Z" />
        <Path d="M25 16 H57" />
        {/* frame: top rail, two uprights, lower shelf */}
        <Path d="M22 34 H58" />
        <Path d="M25 34 V50" />
        <Path d="M55 34 V50" />
        <Path d="M25 50 H55" />
        <Circle cx={29} cy={55.5} r={3.4} />
        <Circle cx={51} cy={55.5} r={3.4} />
      </G>
      {/* Sparkles are FILLED — the Figma draws them solid, and an outlined
          4-point star this small is just a smudge with a hole in it. */}
      <G fill={color}>
        <Path d="M11 7.5 Q12.95 12.05 17.5 14 Q12.95 15.95 11 20.5 Q9.05 15.95 4.5 14 Q9.05 12.05 11 7.5 Z" />
        <Path d="M20.5 2.3 Q21.46 4.54 23.7 5.5 Q21.46 6.46 20.5 8.7 Q19.54 6.46 17.3 5.5 Q19.54 4.54 20.5 2.3 Z" />
      </G>
    </Svg>
  );
}

/**
 * The international no-smoking mark (ISO 7010 P002): prohibition ring, diagonal
 * bar, struck-through cigarette.
 *
 * Unlike every other icon in this file it is drawn SOLID, not with open strokes.
 * At the 28px it renders in the footer a 2-3px stroke around a shape this
 * intricate silts up — the earlier outlined cigarette-and-ring version arrived
 * as a grey smudge. Filled geometry holds its edges all the way down.
 *
 * The one trick worth knowing is `fillRule="evenodd"` with all four subpaths in
 * a single <Path>. Even-odd cancels overlaps, which buys two things for free:
 * the outer and inner circles become a ring, and — the important one — where the
 * bar crosses the cigarette the fill count reaches 4 and drops out, leaving the
 * clean gap that a real sign gets from printing the bar in a second colour. We
 * only have one colour here (the icon inherits `color` over a glass panel, so
 * there is no solid background to knock out against), and this gets the same
 * result geometrically.
 *
 * Consequences if you edit the numbers: the bar's corners must stay inside the
 * inner radius (23.5) or even-odd will erase the slice of ring it touches, and
 * the cigarette is deliberately one bar rather than body-plus-filter — the bar's
 * diagonal swath lands right where a filter joint would be and would swallow it.
 */
export function NoSmokingIcon({size = 28, color}: {size?: number; color: string}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <G
        fill="none"
        stroke={color}
        // 3.4 in a 64 box = ~1.5 CSS px at the footer's 28, which the TV's zoom
        // renders at ~2.2 device px. Thinner than this and the ring greys out.
        strokeWidth={3.4}
        strokeLinecap="round"
        strokeLinejoin="round">
        {/* prohibition ring */}
        <Circle cx={32} cy={32} r={27} />
        {/* bar: 45°, upper-left to lower-right, stopping ON the ring */}
        <Path d="M13 13 L51 51" />
        {/* cigarette: body + filter, drawn as one bar with the joint marked.
            Sits below centre so the bar crosses it rather than tracing it. */}
        <Path d="M14 36 H45 V43 H14 Z" />
        <Path d="M38 36 V43" />
        {/* two smoke curls off the lit end — the detail that stops the mark
            reading as a struck-through ruler */}
        <Path d="M45 30 Q49 27 45.5 23.5 Q42.5 20.5 46 17.5" strokeWidth={2.8} />
        <Path d="M52 30.5 Q55.5 28 52.5 25" strokeWidth={2.8} />
      </G>
    </Svg>
  );
}

/**
 * Curtain marks for the dashboard's Curtain Control card.
 *
 * SOLID, not outlined — the one decision everything else here follows from.
 * These were hairline outlines twice over and the client rejected both: at the
 * card's 38px a 2.9 stroke lands under 2 device px, so the mark dissolves into
 * a wireframe and reads as cheap next to the filled glyphs around it. A fill
 * holds its silhouette at any size. The folds are cut OUT of that fill with
 * `fillRule="evenodd"`, which keeps them as negative space — no second colour,
 * so the mark still works on the glass card, the gold pressed state, and the
 * light backdrop alike.
 *
 * Three things carry "curtain" rather than "plank", all of them necessary:
 *   flared hem   the drape widens as it falls
 *   scalloped hem  fabric never ends in a straight cut
 *   tall panels  a 46-of-64 drop; anything shorter reads as a pelmet, which is
 *                exactly how the first filled attempt failed
 *
 * The two stay tellable apart AS SILHOUETTES, since a guest reading the card
 * from the bed sees shape before they read the label: main is a PARTED pair
 * with a 16-unit gap, sheer is ONE continuous panel spanning the whole window
 * with finer folds. Same rod on both, which is what makes them read as a set.
 *
 * Re-check any change at 38px, not at a comfortable preview size. Every failure
 * these marks have had — the basket, the hourglass, the fence posts, the
 * pelmet — was invisible until they were rendered small.
 */

/** Rod + finials. Identical on both marks, on purpose. */
function CurtainRod({color}: {color: string}) {
  return (
    <>
      <Rect x={4} y={5.2} width={56} height={3.2} rx={1.6} fill={color} />
      <Circle cx={3.2} cy={6.8} r={2.5} fill={color} />
      <Circle cx={60.8} cy={6.8} r={2.5} fill={color} />
    </>
  );
}

export function MainCurtainIcon({size = 40, color}: {size?: number; color: string}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <CurtainRod color={color} />
      {/* Left drape: heading x9–24 spilling to x6.6–26.4 at the hem, three
          scallops, two folds cut through it. TWO folds, not three — a third
          leaves ~1px of fabric between slits at 38px and the panel greys out. */}
      <Path
        fill={color}
        fillRule="evenodd"
        d="M9 9 H24 L26.4 55 Q23.1 57.8 19.8 55 Q16.5 57.8 13.2 55 Q9.9 57.8 6.6 55 Z
           M12.4 12 H14.8 V50 H12.4 Z M18.2 12 H20.6 V50 H18.2 Z"
      />
      {/* right drape: the mirror about x=32 */}
      <Path
        fill={color}
        fillRule="evenodd"
        d="M40 9 H55 L57.4 55 Q54.1 57.8 50.8 55 Q47.5 57.8 44.2 55 Q40.9 57.8 37.6 55 Z
           M43.4 12 H45.8 V50 H43.4 Z M49.2 12 H51.6 V50 H49.2 Z"
      />
    </Svg>
  );
}

export function SheerCurtainIcon({size = 40, color}: {size?: number; color: string}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <CurtainRod color={color} />
      {/* One continuous panel across the whole window — "covers it all" is the
          entire difference from the parted drapes above. Six scallops and five
          folds against the main's three and two: finer pleating is what says
          NET rather than blackout, without resorting to a lower opacity, which
          was tried and simply read as disabled. */}
      <Path
        fill={color}
        fillRule="evenodd"
        d="M9 9 H55 L56.5 55 Q52.42 57.4 48.33 55 Q44.25 57.4 40.17 55 Q36.08 57.4 32 55
           Q27.92 57.4 23.83 55 Q19.75 57.4 15.67 55 Q11.58 57.4 7.5 55 Z
           M14.83 12 H17.03 V50 H14.83 Z M22.87 12 H25.07 V50 H22.87 Z
           M30.9 12 H33.1 V50 H30.9 Z M38.93 12 H41.13 V50 H38.93 Z
           M46.97 12 H49.17 V50 H46.97 Z"
      />
    </Svg>
  );
}
