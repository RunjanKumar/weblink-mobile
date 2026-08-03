import {useTheme} from './ThemeProvider';
import type {ColorScheme} from './theme';

/**
 * Status-pill colors, per scheme.
 *
 * The pills tint their background with the same hue (`${color}22` etc.), so the
 * one color must work as TEXT on that tint over the scheme's surface. The dark
 * set is the original 400/500-weight brights; those are 2–3:1 against white, so
 * light uses the same hues at their 700 weights (all ≥4.5:1 on white).
 */
export type StatusTone =
  | 'warning'
  | 'info'
  | 'sky'
  | 'purple'
  | 'success'
  | 'danger'
  | 'muted';

export const STATUS_TONE_COLORS: Record<ColorScheme, Record<StatusTone, string>> = {
  dark: {
    warning: '#f59e0b',
    info: '#3b82f6',
    sky: '#0ea5e9',
    purple: '#a855f7',
    success: '#22c55e',
    danger: '#ef4444',
    muted: '#6b7280',
  },
  // Warmed to match the light palette (see colors.ts) — the cool 700s made the
  // gold UI around them read yellow. Hues that must stay recognisably cool
  // (sky, purple) only lose their electric edge; all stay ≥4.5:1 on the cards.
  light: {
    warning: '#b45309',
    info: '#215fa8',
    sky: '#0e6d78',
    purple: '#6d3fbd',
    success: '#2f7233',
    danger: '#c0342a',
    muted: '#6a6259',
  },
};

/** Tone table for the ACTIVE scheme. */
export function useStatusTones(): Record<StatusTone, string> {
  const {scheme} = useTheme();
  return STATUS_TONE_COLORS[scheme];
}
