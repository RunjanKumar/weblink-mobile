import React from 'react';
import Svg, {Path, Polygon, Polyline} from 'react-native-svg';
import {useTheme} from '../../theme';

/**
 * The web app's icon set, ported 1:1.
 *
 * Path data is copied verbatim from the live web dashboard
 * (`web-link/src/UI/dashboard/dashboard.jsx` — the inline `ActionIcon` and
 * `NavIcon` helpers; the `component/*` variants are NOT imported there and are
 * therefore not the reference). Ionicons was close but never identical, which
 * is why the two apps looked like different products side by side.
 *
 * All icons share the web's stroke treatment: 24x24 viewBox, stroke-width 2,
 * round caps and joins, no fill — except `home` and `facilities`, which the web
 * fills with the active colour when selected (`filled`).
 *
 * Keep new icons in the same visual family (Feather/Lucide, 24x24, stroke 2) so
 * the set stays coherent; `laundry`, `booking`, `profile` and `settings` have no
 * web counterpart and were drawn to match.
 */
export type WebIconName =
  | 'bell'
  | 'bulb'
  | 'snow'
  | 'food'
  | 'home'
  | 'reception'
  | 'facilities'
  | 'services'
  | 'laundry'
  | 'booking'
  | 'profile'
  | 'settings'
  | 'arrow';

export interface WebIconProps {
  name: WebIconName;
  /** Stroke colour. Icons that support it also use this as the fill. */
  color: string;
  size?: number;
  /** `home` / `facilities` only — the web fills these when the tab is active. */
  filled?: boolean;
}

/**
 * Web `ActionIcon` colours per scheme. The dark set is the web app's, verbatim.
 * Those values are 1.8–2.5:1 against white — invisible on the light theme (seen
 * on the TV) — so light uses the same hues at their 700 weights (≥4.5:1 on the
 * white cards).
 */
const ACCENTS_BY_SCHEME = {
  dark: {
    bell: '#facc15',
    bulb: '#4ade80',
    snow: '#60a5fa',
    food: '#fb923c',
    facilities: '#a78bfa',
    laundry: '#22d3ee',
  },
  light: {
    bell: '#a16207',
    bulb: '#15803d',
    snow: '#1d4ed8',
    food: '#c2410c',
    facilities: '#6d28d9',
    laundry: '#0e7490',
  },
} as const;

/** @deprecated dark-only values — use `useWebIconAccents()` so light theme works. */
export const WEB_ICON_ACCENTS = ACCENTS_BY_SCHEME.dark;

/** Quick-action accent colours for the ACTIVE scheme. */
export function useWebIconAccents() {
  const {scheme} = useTheme();
  return ACCENTS_BY_SCHEME[scheme];
}

export function WebIcon({name, color, size = 24, filled = false}: WebIconProps) {
  const stroke = {
    stroke: color,
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: 'none' as const,
  };
  const fill = filled ? color : 'none';

  const body = () => {
    switch (name) {
      case 'bell':
      case 'services':
        return (
          <>
            <Path {...stroke} d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <Path {...stroke} d="M13.73 21a2 2 0 0 1-3.46 0" />
          </>
        );
      case 'bulb':
        return (
          <>
            <Path {...stroke} d="M9 18h6" />
            <Path {...stroke} d="M10 22h4" />
            <Path
              {...stroke}
              d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"
            />
          </>
        );
      case 'snow':
        return (
          <>
            <Path {...stroke} d="M12 2v20" />
            <Path {...stroke} d="m8 4 4-2 4 2" />
            <Path {...stroke} d="m8 20 4 2 4-2" />
            <Path {...stroke} d="M2 12h20" />
            <Path {...stroke} d="m4 8-2 4 2 4" />
            <Path {...stroke} d="m20 8 2 4-2 4" />
          </>
        );
      case 'food':
        return (
          <>
            <Path {...stroke} d="M17 8c0-5-5-5-5-5s-5 0-5 5" />
            <Path {...stroke} d="M3 14h18" />
            <Path {...stroke} d="M3 14c0 3.5 2.5 6.5 6 7.5V23h6v-1.5c3.5-1 6-4 6-7.5" />
          </>
        );
      case 'home':
        return (
          <>
            <Path {...stroke} fill={fill} d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <Polyline {...stroke} points="9 22 9 12 15 12 15 22" />
          </>
        );
      case 'reception':
        return (
          <Path
            {...stroke}
            d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.11 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"
          />
        );
      case 'facilities':
        return (
          <Polygon
            {...stroke}
            fill={fill}
            points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
          />
        );
      case 'laundry':
        return (
          <>
            <Path
              {...stroke}
              d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z"
            />
          </>
        );
      case 'booking':
        return (
          <>
            <Path {...stroke} d="M3 6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <Path {...stroke} d="M16 2v4" />
            <Path {...stroke} d="M8 2v4" />
            <Path {...stroke} d="M3 10h18" />
          </>
        );
      case 'profile':
        return (
          <>
            <Path {...stroke} d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <Path {...stroke} d="M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />
          </>
        );
      case 'settings':
        return (
          <>
            <Path
              {...stroke}
              d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"
            />
            <Path {...stroke} d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
          </>
        );
      case 'arrow':
        // The web's card arrow is a 12x12 glyph; scaled here into the 24 grid.
        return <Path {...stroke} d="M7 17 17 7M17 7H9M17 7v8" />;
      default:
        return null;
    }
  };

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {body()}
    </Svg>
  );
}
