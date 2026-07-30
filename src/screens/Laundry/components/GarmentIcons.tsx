import React from 'react';
import Svg, {Circle, G, Path} from 'react-native-svg';

/**
 * Line icons for the laundry rate list — one silhouette per garment, plus the
 * marks the service types wear.
 *
 * Same reasoning (and same 64-box, open-stroke language) as `TvGlass/RoomIcons`:
 * no icon font ships a trouser, a kurta or a blazer, and ten tiles all wearing
 * `shirt-outline` read as ten identical tiles from across the room — which is
 * exactly what the Figma's photographed garments exist to prevent.
 *
 * Matching is by NAME because the rate list is free text from the hotel's admin
 * panel; anything unrecognised falls back to a clothes hanger rather than a
 * wrong garment.
 */

export type GarmentName =
  | 'shirt'
  | 'tshirt'
  | 'polo'
  | 'trouser'
  | 'jeans'
  | 'shorts'
  | 'dress'
  | 'blazer'
  | 'sweater'
  | 'kurta'
  | 'saree'
  | 'towel'
  | 'linen'
  | 'socks'
  | 'hanger';

/** Rate-list `name` → garment. Ordered: the first match wins. */
const BY_NAME: {re: RegExp; icon: GarmentName}[] = [
  {re: /polo/i, icon: 'polo'},
  {re: /t[\s-]?shirt|tee\b/i, icon: 'tshirt'},
  {re: /blazer|coat|jacket|suit/i, icon: 'blazer'},
  {re: /sweater|jumper|pullover|hoodie|cardigan/i, icon: 'sweater'},
  {re: /kurta|kurti|tunic|sherwani/i, icon: 'kurta'},
  {re: /saree|sari|dupatta|scarf|stole/i, icon: 'saree'},
  {re: /short/i, icon: 'shorts'},
  {re: /jean|denim/i, icon: 'jeans'},
  {re: /trouser|pant|chino|slack|pyjama|pajama|legging/i, icon: 'trouser'},
  {re: /dress|gown|frock|skirt/i, icon: 'dress'},
  {re: /towel|napkin|bathrobe|robe/i, icon: 'towel'},
  {re: /sheet|linen|pillow|duvet|blanket|cover/i, icon: 'linen'},
  // "Undergarments" is what the live rate list actually says — without it the
  // item fell through to the hanger fallback.
  {re: /sock|stocking|innerwear|underwear|undergarment|brief|vest\b/i, icon: 'socks'},
  {re: /shirt|blouse|top\b/i, icon: 'shirt'},
];

export function garmentIconFor(name?: string): GarmentName {
  const value = name ?? '';
  return BY_NAME.find(entry => entry.re.test(value))?.icon ?? 'hanger';
}

/* Shared silhouettes: a long-sleeve body and a short-sleeve body, so the
   collared and neckline variants below stay optically identical in weight. */
const LONG_SLEEVE = 'M24 11 L12 17 L8 33 L16 36 V56 H48 V36 L56 33 L52 17 L40 11';
const SHORT_SLEEVE = 'M24 11 L14 16 L10 29 L18 32 V56 H46 V32 L54 29 L50 16 L40 11';
/** Round neck closing the gap the sleeve paths leave at the shoulders. */
const ROUND_NECK = 'C38 17 35 19 32 19 C29 19 26 17 24 11';

const PATHS: Record<GarmentName, React.ReactNode> = {
  /* collared shirt: pointed collar, full placket, cuffs */
  shirt: (
    <G>
      <Path d={`${SHORT_SLEEVE} L32 20 Z`} />
      <Path d="M24 11 L27 17 L32 20 L37 17 L40 11" />
      <Path d="M32 20 V56" />
      <Circle cx={32} cy={30} r={1.1} />
      <Circle cx={32} cy={40} r={1.1} />
    </G>
  ),
  /* plain tee: round neck, short sleeves */
  tshirt: <Path d={`${SHORT_SLEEVE} ${ROUND_NECK} Z`} />,
  /* polo: tee body + soft collar and a short placket */
  polo: (
    <G>
      <Path d={`${SHORT_SLEEVE} ${ROUND_NECK} Z`} />
      <Path d="M26 14 L32 21 L38 14" />
      <Path d="M32 21 V31" />
    </G>
  ),
  /* trousers: waistband, straight legs, centre seam */
  trouser: (
    <G>
      <Path d="M20 9 H44 L46 56 H35 L32 31 L29 56 H18 Z" />
      <Path d="M20 16 H44" />
      <Path d="M32 16 V31" />
    </G>
  ),
  /* jeans: trousers + the curved front pockets and a rivet */
  jeans: (
    <G>
      <Path d="M20 9 H44 L46 56 H35 L32 31 L29 56 H18 Z" />
      <Path d="M20 16 H44" />
      <Path d="M32 16 V31" />
      <Path d="M21 17 C25 20 27 22 29 23" />
      <Path d="M43 17 C39 20 37 22 35 23" />
    </G>
  ),
  /* shorts: the same block, legs cut at the knee */
  shorts: (
    <G>
      <Path d="M19 13 H45 L47 42 H35 L32 28 L29 42 H17 Z" />
      <Path d="M19 20 H45" />
      <Path d="M32 20 V28" />
    </G>
  ),
  /* dress: fitted bodice flaring into a skirt */
  dress: (
    <G>
      <Path d="M24 11 L17 16 L21 28 L24 26 L17 56 H47 L40 26 L43 28 L47 16 L40 11 C38 17 35 19 32 19 C29 19 26 17 24 11 Z" />
      <Path d="M24 26 H40" />
    </G>
  ),
  /* blazer: long sleeves, open front, notched lapels, breast pocket */
  blazer: (
    <G>
      <Path d={`${LONG_SLEEVE}`} />
      <Path d="M24 11 L28 26 L26 56" />
      <Path d="M40 11 L36 26 L38 56" />
      <Path d="M28 26 L32 20 L36 26" />
      <Path d="M20 34 H25" />
    </G>
  ),
  /* sweater: long sleeves, ribbed hem and cuffs */
  sweater: (
    <G>
      <Path d={`${LONG_SLEEVE} ${ROUND_NECK} Z`} />
      <Path d="M16 49 H48" />
      <Path d="M9.5 31 L16 33.5" />
      <Path d="M54.5 31 L48 33.5" />
    </G>
  ),
  /* kurta: straight tunic, mandarin collar, long placket, side slits */
  kurta: (
    <G>
      <Path d="M24 10 L14 15 L10 29 L18 32 V57 H46 V32 L54 29 L50 15 L40 10 C38 15 35 17 32 17 C29 17 26 15 24 10 Z" />
      <Path d="M27 13 H37" />
      <Path d="M32 17 V36" />
      <Path d="M18 50 H24" />
      <Path d="M46 50 H40" />
    </G>
  ),
  /* saree / scarf: a draped length of cloth */
  saree: (
    <G>
      <Path d="M14 10 C22 18 22 30 14 38 C22 46 22 54 14 56" />
      <Path d="M28 10 C36 18 36 30 28 38 C36 46 36 54 28 56" />
      <Path d="M42 10 C50 18 50 30 42 38 C50 46 50 54 42 56" />
    </G>
  ),
  /* folded towel with woven bands */
  towel: (
    <G>
      <Path d="M12 18 H52 V46 H12 Z" />
      <Path d="M12 25 H52" />
      <Path d="M12 39 H52" />
      <Path d="M46 18 V46" />
    </G>
  ),
  /* bed linen: a sheet with its fold */
  linen: (
    <G>
      <Path d="M9 26 C20 19 44 19 55 26 V44 C44 37 20 37 9 44 Z" />
      <Path d="M9 34 C20 27 44 27 55 34" />
    </G>
  ),
  socks: (
    <G>
      <Path d="M22 10 H36 V34 C36 42 46 42 46 49 C46 55 39 57 34 52 L22 41 Z" />
      <Path d="M22 17 H36" />
    </G>
  ),
  /* fallback: a clothes hanger — honest about not knowing the garment */
  hanger: (
    <G>
      <Circle cx={32} cy={15} r={4} />
      <Path d="M32 19 C32 23 28 23 28 26" />
      <Path d="M28 26 L10 42 C8 44 9 47 12 47 H52 C55 47 56 44 54 42 Z" />
    </G>
  ),
};

export function GarmentIcon({
  name,
  size = 56,
  color,
}: {
  name: GarmentName;
  size?: number;
  color: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <G fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        {PATHS[name]}
      </G>
    </Svg>
  );
}

/* ── Service-type marks ────────────────────────────────────────────────────
   Two are drawn (no icon font has an iron or a garment hanger); the rest come
   from Ionicons, so `LaundryServiceIcon` returns which of the two to render. */

const DRAWN_SERVICE: Record<string, React.ReactNode> = {
  iron: (
    <G>
      <Path d="M8 46 H56 L50 34 H20 C13 34 8 39 8 46 Z" />
      <Path d="M21 34 C21 23 36 19 47 26" />
      <Path d="M13 52 H51" />
    </G>
  ),
  hanger: PATHS.hanger,
  /**
   * The screen's own mark: a front-loader with its drum.
   *
   * Drawn because the header badge previously borrowed Ionicons
   * `water-outline` — which is ALSO this file's mark for the Wash service, so a
   * selected Wash row rendered the identical gold droplet a few hundred pixels
   * from the badge, in a split layout where both are on screen at once.
   */
  washer: (
    <G>
      <Path d="M11 8 H53 a3 3 0 0 1 3 3 V53 a3 3 0 0 1 -3 3 H11 a3 3 0 0 1 -3 -3 V11 a3 3 0 0 1 3 -3 Z" />
      <Path d="M8 20 H56" />
      <Circle cx={17} cy={14} r={1.6} />
      <Circle cx={25} cy={14} r={1.6} />
      <Circle cx={47} cy={14} r={3} />
      <Circle cx={32} cy={38} r={13} />
      <Path d="M23 33 C27 37 37 29 41 33" />
    </G>
  ),
};

/**
 * Service type / name → mark. `drawn` names render through `ServiceGlyph`;
 * everything else is an Ionicons glyph the caller renders itself.
 */
export function laundryServiceIcon(serviceType?: string, label?: string): {
  drawn?: keyof typeof DRAWN_SERVICE;
  ionicon?: string;
} {
  const key = `${serviceType ?? ''} ${label ?? ''}`.toLowerCase();
  if (/dry.?clean/.test(key)) return {drawn: 'hanger'};
  if (/iron|press|steam/.test(key)) return {drawn: 'iron'};
  if (/express|urgent|priority|fast/.test(key)) return {ionicon: 'flash-outline'};
  if (/delicate|fine|care|silk|wool/.test(key)) return {ionicon: 'leaf-outline'};
  if (/stain|spot|treat/.test(key)) return {ionicon: 'color-filter-outline'};
  if (/wash|clean|laundr/.test(key)) return {ionicon: 'water-outline'};
  return {ionicon: 'sparkles-outline'};
}

export function ServiceGlyph({
  name,
  size = 26,
  color,
}: {
  name: keyof typeof DRAWN_SERVICE;
  size?: number;
  color: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <G fill="none" stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
        {DRAWN_SERVICE[name]}
      </G>
    </Svg>
  );
}
