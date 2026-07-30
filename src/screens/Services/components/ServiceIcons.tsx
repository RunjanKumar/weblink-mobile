import React from 'react';
import Icon from 'react-native-vector-icons/Ionicons';
import Svg, {Circle, G, Path} from 'react-native-svg';

/**
 * Pictograms for the service catalog — one drawn sign per housekeeping request,
 * in the same 64-box open-stroke language as `TvGlass/RoomIcons` and
 * `Laundry/components/GarmentIcons`.
 *
 * DRAWN, not from an icon font, because the client's Figma frames name real
 * objects — a toilet, a vacuum, a stack of folded towels, a bin — and no icon
 * font ships them. Ionicons' nearest neighbours (`water-outline`,
 * `sparkles-outline`) turn eight distinct services into eight near-identical
 * tiles, which is exactly what the frame's drawn signs exist to prevent.
 *
 * Matching is by NAME (plus description) because the catalog is free text from
 * the hotel's admin panel. Anything unrecognised falls back to a drawn service
 * bell — the module's own mark — rather than a wrong object.
 */

export type ServiceIconName =
  | 'bell'
  | 'toilet'
  | 'vacuum'
  | 'towels'
  | 'linen'
  | 'bed'
  | 'toiletries'
  | 'trash'
  | 'bottle'
  | 'pillow'
  | 'spray';

/**
 * A four-point sparkle with concave sides — the "freshly cleaned" mark the
 * Figma puts on the cleaning tiles. Generated rather than hand-written so every
 * one of them is the same shape at whatever size and wherever it is placed.
 */
function sparkle(cx: number, cy: number, r: number): string {
  const i = r * 0.3;
  return (
    `M${cx} ${cy - r} Q${cx + i} ${cy - i} ${cx + r} ${cy} ` +
    `Q${cx + i} ${cy + i} ${cx} ${cy + r} Q${cx - i} ${cy + i} ${cx - r} ${cy} ` +
    `Q${cx - i} ${cy - i} ${cx} ${cy - r} Z`
  );
}

/** The bed both bedroom signs are built on: headboard, mattress, frame, legs. */
const BED_FRAME = (
  <G>
    <Path d="M9 45 V27 C9 24.5 10.5 23 13 23 C15.5 23 17 24.5 17 27 V33" />
    <Path d="M17 33 H49 C52.5 33 55 35.5 55 39 V45" />
    <Path d="M9 39.5 H55" />
    <Path d="M11 45 V50" />
    <Path d="M53 45 V50" />
  </G>
);

/** One folded towel — three of these stacked make the Extra Towel sign. */
function towel(y: number, left: number, right: number) {
  const h = 8;
  const r = h / 2;
  return (
    <G>
      <Path
        d={
          `M${left + 4} ${y} H${right - 4} C${right - 4 + 2.2} ${y} ${right} ${y + 1.8} ${right} ${y + r} ` +
          `C${right} ${y + h - 1.8} ${right - 4 + 2.2} ${y + h} ${right - 4} ${y + h} ` +
          `H${left + 4} C${left + 1.8} ${y + h} ${left} ${y + h - 1.8} ${left} ${y + r} ` +
          `C${left} ${y + 1.8} ${left + 1.8} ${y} ${left + 4} ${y} Z`
        }
      />
      {/* the fold at the towel's near end — what makes a bar read as cloth */}
      <Path d={`M${left + 7} ${y + 0.6} V${y + h - 0.6}`} />
    </G>
  );
}

const PATHS: Record<ServiceIconName, React.ReactNode> = {
  /* concierge bell: dome, base plate, top knob — the module's own mark */
  bell: (
    <G>
      <Circle cx={32} cy={17} r={2.6} />
      <Path d="M32 19.6 V22" />
      <Path d="M13 44 C13 31 21 22 32 22 C43 22 51 31 51 44" />
      <Path d="M9 48 H55" />
      <Path d="M13 44 H51" />
    </G>
  ),
  /* toilet in profile: cistern, rim overhang, bowl falling into a pedestal */
  toilet: (
    <G>
      <Path d="M12 8 H26 V24 H12 Z" />
      <Path d="M16 11 H22" />
      <Path d="M12 24 H41 C44 24 44 28 41 28 H22" />
      <Path d="M22 28 C22 38 25 44 27 47 L26 55 H40 L38 46 C41 42 42 35 42 28" />
      <Path d={sparkle(52, 13, 5)} />
    </G>
  ),
  /**
   * Canister vacuum: body on castors, hose curling up to a wand and an angled
   * floor tool. The hose is what carries the icon — an upright body alone read
   * as a floor polisher, and an arched body on two round wheels read as a car.
   */
  vacuum: (
    <G>
      <Path d="M14 36 H39 C44.5 36 49 40.5 49 46 V48 C49 50.8 46.8 53 44 53 H19 C16.2 53 14 50.8 14 48 Z" />
      <Path d="M14 44 H49" />
      <Path d="M39 36 C42 25 36 17 27 19" />
      <Path d="M27 19 L18.5 13.5" />
      <Path d="M21 8 L13 19" />
      <Circle cx={21} cy={48} r={3} />
      <Circle cx={41} cy={48} r={3} />
      <Path d={sparkle(54, 26, 4.5)} />
      <Path d={sparkle(57, 16, 2.6)} />
    </G>
  ),
  /* three folded towels, stacked */
  towels: (
    <G>
      {towel(19, 14, 49)}
      {towel(29, 12, 51)}
      {towel(39, 14, 49)}
    </G>
  ),
  /* fresh linen folded onto a made bed */
  linen: (
    <G>
      {BED_FRAME}
      <Path d="M20 22 H32 C34 22 35 23.2 35 25 C35 26.8 34 28 32 28 H20 C18 28 17 26.8 17 25 C17 23.2 18 22 20 22 Z" />
      <Path d="M20 28 H34 C36 28 37 29.2 37 31 C37 32.4 36 33 34.5 33 H19 C17.6 33 17 32 17 30.6 C17 29.2 18 28 20 28 Z" />
      <Path d={sparkle(46, 18, 5)} />
      <Path d={sparkle(54, 25, 2.6)} />
    </G>
  ),
  /* a made-up bed: plumped pillow at the head */
  bed: (
    <G>
      {BED_FRAME}
      <Path d="M20 27 H31 C33 27 34 28.5 34 30.5 V33 H20 C18 33 17 31.5 17 30 C17 28.2 18 27 20 27 Z" />
      <Path d={sparkle(46, 20, 5)} />
    </G>
  ),
  /* a pump dispenser beside a shorter bottle, both labelled */
  toiletries: (
    <G>
      <Path d="M20 10 H26 V15" />
      <Path d="M26 12 H30 C31 12 31 14 30 14" />
      <Path d="M17 15 H29 C31 15 32 17 32 19 V50 C32 52 31 53 29 53 H17 C15 53 14 52 14 50 V19 C14 17 15 15 17 15 Z" />
      <Path d="M14 26 H32" />
      <Path d="M14 36 H32" />
      <Path d="M42 20 H50 V26" />
      <Path d="M40 26 H52 C54 26 55 28 55 30 V50 C55 52 54 53 52 53 H40 C38 53 37 52 37 50 V30 C37 28 38 26 40 26 Z" />
      <Path d="M37 34 H55" />
      <Path d="M37 42 H55" />
    </G>
  ),
  /* waste bin: lid, handle, ribbed body */
  trash: (
    <G>
      <Path d="M12 18 H52 C53.1 18 54 18.9 54 20 C54 21.1 53.1 22 52 22 H12 C10.9 22 10 21.1 10 20 C10 18.9 10.9 18 12 18 Z" />
      <Path d="M26 14 H38 V18" />
      <Path d="M15 22 L18 52 C18.2 54 20 55 22 55 H42 C44 55 45.8 54 46 52 L49 22" />
      <Path d="M25 28 V48" />
      <Path d="M32 28 V48" />
      <Path d="M39 28 V48" />
    </G>
  ),
  /* capped bottle with a round label — water and in-room amenities */
  bottle: (
    <G>
      <Path d="M28 8 H36 V14 H28 Z" />
      <Path d="M28 14 C28 18 24 19 24 24 V50 C24 53 26 55 29 55 H35 C38 55 40 53 40 50 V24 C40 19 36 18 36 14" />
      <Circle cx={32} cy={35} r={7} />
    </G>
  ),
  pillow: (
    <G>
      <Path d="M11 24 C11 20.5 14 18 19 18 H45 C50 18 53 20.5 53 24 V38 C53 41.5 50 44 45 44 H19 C14 44 11 41.5 11 38 Z" />
      <Path d="M17 22.5 C22 20 31 19.6 37 21" />
      <Path d="M13 30 C16 31 16 33 13 34" />
    </G>
  ),
  /* trigger spray — freshener, sanitiser, pest control */
  spray: (
    <G>
      <Path d="M22 24 H40 C43 24 45 26 45 29 V52 C45 55 43 56 40 56 H22 C19 56 17 55 17 52 V29 C17 26 19 24 22 24 Z" />
      <Path d="M26 18 H36 V24" />
      <Path d="M26 11 H36 C38 11 39 12 39 14 V18 H26 Z" />
      <Path d="M26 15 H18" />
      <Path d="M13 9 L9 6" />
      <Path d="M12 14 H7" />
      <Path d="M13 20 L9 23" />
      <Path d="M22 34 H40" />
    </G>
  ),
};

/**
 * Catalog text → sign. Ordered: the first match wins, so the specific rules
 * ("dust bin" is a bin, not dusting) sit above the general ones.
 *
 * `drawn` names render through `ServiceGlyph`; the rest name an Ionicons glyph,
 * which is the honest answer for the services no drawn sign exists for (a taxi,
 * a doctor, a wake-up call). A service with no match at all gets the bell.
 */
const BY_NAME: {re: RegExp; drawn?: ServiceIconName; ionicon?: string}[] = [
  {re: /wash\s*room|bath\s*room|toilet|\bwc\b|commode/i, drawn: 'toilet'},
  {re: /trash|garbage|waste|rubbish|dust\s*bin|\bbin\b/i, drawn: 'trash'},
  {re: /towel|napkin|bath\s*mat|bathrobe/i, drawn: 'towels'},
  {re: /linen|bed\s*sheet|\bsheet|duvet|blanket|quilt|bed\s*spread|pillow\s*case/i, drawn: 'linen'},
  {re: /pillow|cushion/i, drawn: 'pillow'},
  {re: /toiletr|shampoo|\bsoap|lotion|dental|shaving|conditioner|comb\b/i, drawn: 'toiletries'},
  {re: /deep\s*clean|vacuum|carpet|dusting|mop|sweep/i, drawn: 'vacuum'},
  {
    re: /make\s*my\s*room|\bmmr\b|turn\s*down|tidy|house\s*keep|room\s*clean|clean\s*the\s*room/i,
    drawn: 'bed',
  },
  {re: /freshener|fragrance|spray|deodor|sanitis|sanitiz|disinfect|pest|mosquito/i, drawn: 'spray'},
  {re: /amenit|water|bottle|mini\s*bar|refill/i, drawn: 'bottle'},
  // No drawn sign — Ionicons says it plainly rather than guessing an object.
  {re: /iron|press|steam|laundry|clothe|garment|hanger/i, ionicon: 'shirt-outline'},
  {re: /wake|alarm|morning\s*call/i, ionicon: 'alarm-outline'},
  {re: /doctor|medic|first\s*aid|nurse|ambulance|pharmac/i, ionicon: 'medkit-outline'},
  {re: /taxi|\bcab\b|\bcar\b|airport|transfer|shuttle|pick\s*up|drop/i, ionicon: 'car-outline'},
  {re: /news\s*paper|magazine/i, ionicon: 'newspaper-outline'},
  {re: /wi.?fi|internet|network|tv\b|remote/i, ionicon: 'wifi-outline'},
  {re: /\btea\b|coffee|kettle|milk/i, ionicon: 'cafe-outline'},
  {re: /repair|maintenance|electric|plumb|\bfix|bulb|light|\bac\b|air\s*condition/i, ionicon: 'construct-outline'},
  {re: /luggage|\bbag|porter|baggage/i, ionicon: 'briefcase-outline'},
  {re: /shoe|polish|shine/i, ionicon: 'footsteps-outline'},
  {re: /do\s*not\s*disturb|\bdnd\b|privacy/i, ionicon: 'moon-outline'},
  {re: /extra\s*bed|mattress|\bcot\b|crib/i, ionicon: 'bed-outline'},
  {re: /charger|adapter|adaptor|plug|socket/i, ionicon: 'battery-charging-outline'},
  {re: /umbrella|rain/i, ionicon: 'umbrella-outline'},
  {re: /sew|needle|thread|stitch/i, ionicon: 'cut-outline'},
  {re: /flower|bouquet|decor/i, ionicon: 'flower-outline'},
  {re: /cake|birthday|celebrat|anniversar|gift/i, ionicon: 'gift-outline'},
];

export function serviceIconFor(
  name?: string,
  description?: string,
): {drawn?: ServiceIconName; ionicon?: string} {
  const value = `${name ?? ''} ${description ?? ''}`;
  const match = BY_NAME.find(entry => entry.re.test(value));
  return match ? {drawn: match.drawn, ionicon: match.ionicon} : {drawn: 'bell'};
}

/** One drawn sign. Stroke scales with the box so 26px and 70px read the same. */
export function ServiceGlyph({
  name,
  size = 30,
  color,
  strokeWidth,
}: {
  name: ServiceIconName;
  size?: number;
  color: string;
  strokeWidth?: number;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <G
        fill="none"
        stroke={color}
        // Small marks need a heavier relative stroke or the strokes grey out at
        // ten feet; large ones need a lighter one or the sign fills in.
        strokeWidth={strokeWidth ?? (size <= 30 ? 2.8 : 2.2)}
        strokeLinecap="round"
        strokeLinejoin="round">
        {PATHS[name]}
      </G>
    </Svg>
  );
}

/**
 * The catalog's icon slot: resolves the service's text to a sign and renders
 * whichever kind it turned out to be, so callers never branch on drawn vs font.
 */
export function ServiceIcon({
  name,
  description,
  size = 30,
  color,
}: {
  name?: string;
  description?: string;
  size?: number;
  color: string;
}) {
  const mark = serviceIconFor(name, description);
  return mark.drawn ? (
    <ServiceGlyph name={mark.drawn} size={size} color={color} />
  ) : (
    // Ionicons' own glyphs sit inside a tighter box than the drawn 64-grid, so
    // they are stepped down to keep every icon optically the same weight.
    <Icon name={mark.ionicon ?? 'notifications-outline'} size={Math.round(size * 0.82)} color={color} />
  );
}
