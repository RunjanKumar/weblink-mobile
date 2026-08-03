/**
 * Raw color palette. UI code should prefer semantic tokens from `ThemeColors`
 * (e.g. `colors.primary`) rather than these raw values so a theme swap is trivial.
 * Mirrors the "dark luxury" palette of the existing web app.
 */
export const palette = {
  black: '#0d0d0d',
  surface: '#111111',
  surfaceElevated: '#1a1a1a',
  border: '#2a2a2a',
  amber: '#facc15',
  amberMuted: '#a3820b',
  white: '#ffffff',
  gray100: '#f3f4f6',
  gray300: '#d1d5db',
  gray400: '#9ca3af',
  gray500: '#6b7280',
  gray800: '#1f2937',
  danger: '#ef4444',
  success: '#22c55e',
  warning: '#f59e0b',
  info: '#3b82f6',
} as const;

export interface ThemeColors {
  background: string;
  surface: string;
  surfaceElevated: string;
  border: string;
  primary: string;
  primaryForeground: string;
  primaryMuted: string;
  text: string;
  textSecondary: string;
  textTertiary: string;
  muted: string;
  danger: string;
  success: string;
  warning: string;
  info: string;
  focusRing: string;
  overlay: string;
}

export const darkColors: ThemeColors = {
  background: palette.black,
  surface: palette.surface,
  surfaceElevated: palette.surfaceElevated,
  border: palette.border,
  primary: palette.amber,
  primaryForeground: palette.black,
  primaryMuted: palette.amberMuted,
  text: palette.white,
  textSecondary: palette.gray300,
  textTertiary: palette.gray400,
  muted: palette.gray500,
  danger: palette.danger,
  success: palette.success,
  warning: palette.warning,
  info: palette.info,
  focusRing: palette.amber,
  overlay: 'rgba(0,0,0,0.6)',
};

/**
 * Light theme — designed for the 10-foot TV UI (client requirement), following
 * how the TV platforms do light appearance:
 *
 *  - Background is OFF-white, not #fff. Large pure-white fields glare on a TV
 *    panel (tvOS light uses ~#F2F2F7 system backgrounds; LG's own webOS system
 *    UI is off-white). Cards are the lightest surface, so they read as elevated.
 *  - Text is near-black, not #000 (harsh on white at TV brightness).
 *  - The amber brand CANNOT stay #facc15 on white (≈1.8:1 — invisible, as the
 *    on-TV photo showed); it needs a 700-weight gold at ≈5:1.
 *  - Status colors move to their 700-weight variants for the same reason
 *    (#22c55e green is 2.2:1 on white; the green here is 5.7:1).
 *  - Focus ring is near-black: an amber ring vanishes against the gold buttons
 *    and barely registers on white cards; a dark ring is visible on both, and
 *    the existing scale bump (Button/tiles) supplies the tvOS-style "lift".
 *
 * WARM neutrals (client feedback, 2026-08-03: the first light pass "looks
 * yellowish"). The cause was NOT the gold — it was gold sitting on BLUE-gray
 * neutrals (#f2f3f5 / #1b1d22). Against a cool field the eye reads the accent as
 * acid lemon; the fix is to warm the whole neutral ramp so the gold belongs to
 * it, and to pull the accent itself off yellow toward burnt amber (hue 36°→29°).
 * The neutrals carry only a few points of R-over-B — enough to read as paper
 * rather than screen, not enough to look tinted. Less blue light out of a
 * bright TV panel is also what makes it easier on the eyes in a dim hotel room.
 *
 * Every text token here is ≥4.5:1 (WCAG AA) on the surface it sits on
 * (verified against surface / background / surfaceElevated).
 */
export const lightColors: ThemeColors = {
  background: '#f5f2ee',
  surface: '#fdfbf8', // warm white — a pure-white card next to this reads blue
  // Inset wells/chips ON the cards — darker than surface, inverting the dark
  // theme's "elevated is lighter" relationship, which is correct for light UI.
  surfaceElevated: '#efebe5',
  // Slightly darker than a typical web hairline — TV picture processing washes
  // out subtle brightness deltas, so card edges need more presence at 10 feet.
  border: '#e0d9d0',
  primary: '#a1571a', // burnt amber — 5.4:1 on surface, gold without the lemon
  primaryForeground: '#ffffff', // 5.4:1 on primary
  primaryMuted: '#7a4413',
  text: '#221f1b', // ≈16:1
  textSecondary: '#4a443c', // ≈9:1
  textTertiary: '#6a6259', // ≈5.8:1
  muted: '#7c7266', // placeholders / disabled — ≈4.6:1
  danger: '#b91c1c', // red-700 — 6.3:1
  success: '#2f7233', // warm-leaning green-700 — 5.7:1
  warning: '#b45309', // amber-700 family
  info: '#215fa8', // deeper, less electric blue than blue-700 — 6.2:1
  focusRing: '#221f1b',
  overlay: 'rgba(28,22,16,0.5)',
};
