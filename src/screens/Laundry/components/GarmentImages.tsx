import React, {useState} from 'react';
import {Image, View, type StyleProp, type ViewStyle} from 'react-native';
import {toSource} from '../../../components/TvGlass';
import {GarmentIcon, garmentIconFor, type GarmentName} from './GarmentIcons';

/**
 * The laundry rate list's garment artwork — an IMAGE per garment, as the
 * client's Figma draws it (a garment on a wooden hanger), not line art.
 *
 * WHERE THE IMAGES COME FROM: they are rendered in-house (see the README in
 * `src/assets/tv/laundry/`) rather than photographed or taken off the web —
 * a set drawn to one palette, one light direction and one hanger reads as a set
 * in a five-across grid, which a dozen stock photos at different angles and
 * white balances never do, and nothing here carries someone else's licence.
 * They are a placeholder for real photography, and the backend is expected to
 * serve per-hotel images later: when the rate list gains an image field, prefer
 * it here and keep this map as the default.
 *
 * Keyed by the SAME `GarmentName` the drawn `GarmentIcons` set resolves to, so
 * one name lookup serves both and a tile can never show one garment's picture
 * under another's label.
 *
 * TWO FALLBACKS, in order:
 *  1. name we cannot place  → `hanger.png` (an empty hanger). The rate list is
 *     free text from each hotel's admin panel, so unplaceable names are normal.
 *  2. the image fails to load → the DRAWN silhouette, so a broken asset still
 *     leaves a garment-shaped mark rather than a hole in the grid.
 *
 * Static imports rather than `require()` because that is how the rest of the app
 * loads assets, and because Metro (numeric ids) and webpack (URL strings) both
 * resolve them at build time — `toSource` papers over that difference.
 */

import shirtImg from '../../../assets/tv/laundry/shirt.png';
import tshirtImg from '../../../assets/tv/laundry/tshirt.png';
import poloImg from '../../../assets/tv/laundry/polo.png';
import trouserImg from '../../../assets/tv/laundry/trouser.png';
import jeansImg from '../../../assets/tv/laundry/jeans.png';
import shortsImg from '../../../assets/tv/laundry/shorts.png';
import dressImg from '../../../assets/tv/laundry/dress.png';
import blazerImg from '../../../assets/tv/laundry/blazer.png';
import sweaterImg from '../../../assets/tv/laundry/sweater.png';
import kurtaImg from '../../../assets/tv/laundry/kurta.png';
import sareeImg from '../../../assets/tv/laundry/saree.png';
import towelImg from '../../../assets/tv/laundry/towel.png';
import linenImg from '../../../assets/tv/laundry/linen.png';
import socksImg from '../../../assets/tv/laundry/socks.png';
import hangerImg from '../../../assets/tv/laundry/hanger.png';

const PHOTOS: Record<GarmentName, unknown> = {
  shirt: shirtImg,
  tshirt: tshirtImg,
  polo: poloImg,
  trouser: trouserImg,
  jeans: jeansImg,
  shorts: shortsImg,
  dress: dressImg,
  blazer: blazerImg,
  sweater: sweaterImg,
  kurta: kurtaImg,
  saree: sareeImg,
  towel: towelImg,
  linen: linenImg,
  socks: socksImg,
  hanger: hangerImg,
};

/**
 * The name-mismatch fallback: an empty wooden hanger.
 *
 * `garmentIconFor` already lands on `'hanger'` for anything it cannot place, so
 * this is what a hotel pricing "Miscellaneous" or "Special Item" shows — an
 * honest "a garment, we don't know which" rather than a wrong one.
 */
const FALLBACK = hangerImg;

/**
 * A garment's artwork in a FIXED box, so a row of photos and a row of drawn
 * signs occupy exactly the same space — mixing the two in one grid is the normal
 * case, and a tile that changes height when the photo is missing reads as broken
 * layout rather than as a missing asset.
 */
export function GarmentPhoto({
  name,
  size,
  glyphColor,
  /** Fill the parent's width (the rate-list tile) instead of a square box. */
  stretch = false,
  /** The drawn sign sits inside the photo's box, not flush to its edges. */
  glyphScale = 0.82,
  style,
}: {
  name?: string;
  size: number;
  glyphColor: string;
  stretch?: boolean;
  glyphScale?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const [failed, setFailed] = useState(false);
  const garment = garmentIconFor(name);
  const photo = PHOTOS[garment] ?? FALLBACK;

  return (
    <View
      style={[
        {
          height: size,
          alignItems: 'center',
          justifyContent: 'center',
          ...(stretch ? {alignSelf: 'stretch'} : {width: size}),
        },
        style,
      ]}>
      {photo != null && !failed ? (
        <Image
          source={toSource(photo)}
          // `contain`: the photos are portrait (a garment on a hanger) and the
          // tile is landscape. `cover` would crop the hanger off the top, which
          // is the one part of the Figma's shot that says "laundry".
          resizeMode="contain"
          onError={() => setFailed(true)}
          style={{width: '100%', height: '100%'}}
        />
      ) : (
        <GarmentIcon
          name={garment}
          size={Math.round(size * glyphScale)}
          color={glyphColor}
        />
      )}
    </View>
  );
}
