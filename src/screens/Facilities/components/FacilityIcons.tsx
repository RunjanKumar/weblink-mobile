import React from 'react';
import Icon from 'react-native-vector-icons/Ionicons';
import Svg, {Circle, G, Path} from 'react-native-svg';

/**
 * Signs for the facilities frame — one per category, in the same 64-box
 * open-stroke language as `TvGlass/RoomIcons` and the laundry/services sets.
 *
 * Five are DRAWN because no icon font ships them and the client's frame names
 * them outright: the lotus the header wears, the seated figure on HEALTH &
 * WELLNESS, the massage table on SPA, plus a swimmer and a steam bath for the
 * facilities underneath. Everything else resolves to an Ionicons glyph, which is
 * the honest answer for a tennis court or a valet desk.
 *
 * Matching is by NAME (category first, then the facility's own) because the
 * catalog is free text from the hotel's admin panel.
 */

export type FacilityIconName = 'lotus' | 'meditation' | 'massage' | 'swimmer' | 'steam';

const PATHS: Record<FacilityIconName, React.ReactNode> = {
  /* lotus — five petals meeting at one point, the module's own mark */
  lotus: (
    <G>
      <Path d="M32 14 C27 22 27 32 32 40 C37 32 37 22 32 14 Z" />
      <Path d="M32 40 C24 38 18 30 17 21 C24 23 30 31 32 40 Z" />
      <Path d="M32 40 C40 38 46 30 47 21 C40 23 34 31 32 40 Z" />
      <Path d="M32 40 C23 43 12 40 7 33 C15 29 27 32 32 40 Z" />
      <Path d="M32 40 C41 43 52 40 57 33 C49 29 37 32 32 40 Z" />
    </G>
  ),
  /* seated figure, crossed legs — yoga and wellness */
  meditation: (
    <G>
      <Circle cx={32} cy={12} r={5.5} />
      <Path d="M32 20 C25 20 21 26 21 33 C21 36 22 38 24 40" />
      <Path d="M32 20 C39 20 43 26 43 33 C43 36 42 38 40 40" />
      <Path d="M11 49 C11 43 20 39 32 39 C44 39 53 43 53 49 Z" />
    </G>
  ),
  /* a guest face-down on the table with two hands working the back */
  massage: (
    <G>
      <Circle cx={16} cy={30} r={5} />
      <Path d="M22 35 C29 30 43 30 52 35 C54 36 54 40 52 40 H24 C21 40 20 37 22 35 Z" />
      <Path d="M8 44 H56" />
      <Path d="M13 44 V51" />
      <Path d="M51 44 V51" />
      <Path d="M31 22 C27 23 26 27 29 29" />
      <Path d="M40 20 C36 21 35 25 38 27" />
    </G>
  ),
  /* head, outstretched arm, two water lines */
  swimmer: (
    <G>
      <Circle cx={21} cy={21} r={4.5} />
      <Path d="M27 19 C33 14 42 14 48 19" />
      <Path d="M13 34 C19 30 27 30 33 33 C39 36 47 36 53 32" />
      <Path d="M8 45 C14 42 18 46 24 46 C30 46 34 42 40 43 C46 44 50 47 56 45" />
    </G>
  ),
  /* hot stones under rising vapour — steam room and sauna */
  steam: (
    <G>
      <Path d="M12 40 H52 C52 47 45 52 32 52 C19 52 12 47 12 40 Z" />
      <Circle cx={24} cy={37} r={3.4} />
      <Circle cx={33} cy={35} r={4} />
      <Circle cx={42} cy={37} r={3.4} />
      <Path d="M24 27 C28 23 20 19 24 15" />
      <Path d="M33 25 C37 21 29 17 33 13" />
      <Path d="M42 27 C46 23 38 19 42 15" />
    </G>
  ),
};

/** Ordered: the first match wins, so "facial" reads as a salon, not a spa room. */
const BY_NAME: {re: RegExp; drawn?: FacilityIconName; ionicon?: string}[] = [
  {re: /yoga|meditat|wellness|mindful|\bzen\b|pilates/i, drawn: 'meditation'},
  {re: /steam|sauna|hammam|jacuzzi|hot\s*tub|plunge/i, drawn: 'steam'},
  {re: /swim|pool|aqua/i, drawn: 'swimmer'},
  {re: /salon|beauty|\bhair|facial|manicure|pedicure|nail|groom|barber/i, ionicon: 'cut-outline'},
  {re: /spa\b|massage|therap|treatment|reflexolog|ayurved/i, drawn: 'massage'},
  {re: /gym|fitness|workout|exercise|training|weight|cardio/i, ionicon: 'barbell-outline'},
  {re: /restaurant|dining|cafe|coffee|breakfast|buffet|kitchen|food|bakery/i, ionicon: 'restaurant-outline'},
  {re: /\bbar\b|lounge|\bpub\b|wine|cocktail|brew/i, ionicon: 'wine-outline'},
  {re: /banquet|\bhall\b|event|wedding|conference|meeting|board\s*room/i, ionicon: 'people-outline'},
  {re: /business|office|co.?work|secretar/i, ionicon: 'briefcase-outline'},
  {re: /kid|child|play|nursery|creche/i, ionicon: 'happy-outline'},
  {re: /game|recreation|billiard|snooker|bowling|arcade|\bpool\s*table/i, ionicon: 'game-controller-outline'},
  {re: /tennis|squash|court|badminton|cricket|football|sport/i, ionicon: 'tennisball-outline'},
  {re: /garden|terrace|lawn|outdoor|rooftop|poolside/i, ionicon: 'leaf-outline'},
  {re: /library|reading|\bbook/i, ionicon: 'book-outline'},
  {re: /shop|store|boutique|souvenir|\bgift/i, ionicon: 'bag-handle-outline'},
  {re: /parking|valet|garage/i, ionicon: 'car-outline'},
  {re: /walk|jog|track|trail|cycl/i, ionicon: 'walk-outline'},
  {re: /laundry|dry\s*clean/i, ionicon: 'shirt-outline'},
  {re: /doctor|clinic|medic|pharmac/i, ionicon: 'medkit-outline'},
];

export function facilityIconFor(
  name?: string,
  secondary?: string,
): {drawn?: FacilityIconName; ionicon?: string} {
  const value = `${name ?? ''} ${secondary ?? ''}`;
  const match = BY_NAME.find(entry => entry.re.test(value));
  // Unmatched falls back to the phone screen's own facility placeholder rather
  // than a lotus — a helipad is not a wellness room.
  return match ? {drawn: match.drawn, ionicon: match.ionicon} : {ionicon: 'business-outline'};
}

export function FacilityGlyph({
  name,
  size = 30,
  color,
  strokeWidth,
}: {
  name: FacilityIconName;
  size?: number;
  color: string;
  strokeWidth?: number;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <G
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth ?? (size <= 30 ? 2.8 : 2.2)}
        strokeLinecap="round"
        strokeLinejoin="round">
        {PATHS[name]}
      </G>
    </Svg>
  );
}

/** Resolves a facility's text to a sign and renders whichever kind it is. */
export function FacilityIcon({
  name,
  secondary,
  size = 30,
  color,
}: {
  name?: string;
  /** The facility's own name when `name` is its category, or vice versa. */
  secondary?: string;
  size?: number;
  color: string;
}) {
  const mark = facilityIconFor(name, secondary);
  return mark.drawn ? (
    <FacilityGlyph name={mark.drawn} size={size} color={color} />
  ) : (
    // Ionicons draw inside a tighter box than the 64-grid, so they are stepped
    // down to keep every icon optically the same weight.
    <Icon name={mark.ionicon ?? 'business-outline'} size={Math.round(size * 0.82)} color={color} />
  );
}
