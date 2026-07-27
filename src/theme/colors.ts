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

// Light theme is "future ready" per the spec — not the default, but fully defined
// so switching is a one-line change once light-mode UI is validated.
export const lightColors: ThemeColors = {
  background: '#f7f7f8',
  surface: '#ffffff',
  surfaceElevated: '#ffffff',
  border: '#e5e7eb',
  primary: '#b8860b',
  primaryForeground: '#ffffff',
  primaryMuted: '#d4a017',
  text: '#0d0d0d',
  textSecondary: '#374151',
  textTertiary: '#6b7280',
  muted: '#9ca3af',
  danger: '#dc2626',
  success: '#16a34a',
  warning: '#d97706',
  info: '#2563eb',
  focusRing: '#b8860b',
  overlay: 'rgba(0,0,0,0.4)',
};
