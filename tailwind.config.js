/**
 * Tailwind / NativeWind configuration.
 *
 * Every color token is a CSS VARIABLE, not a literal. The variables are set per
 * scheme by ThemeProvider (via NativeWind's `vars()`), with the values coming
 * from `src/theme/colors.ts` — the single source of truth for both the
 * className tokens here and the `theme.colors.*` JS object. That is what makes
 * `bg-surface` / `text-content` actually flip between dark and light; hex
 * literals here were exactly why the first light-theme attempt showed black
 * cards on a white background.
 *
 * The fallback in each `var()` is the dark value, so anything rendered outside
 * the ThemeProvider wrapper still gets the original look.
 *
 * @type {import('tailwindcss').Config}
 */
module.exports = {
  content: ['./App.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  // 'class', not the Tailwind default 'media': the app picks its own scheme via
  // ThemeProvider. On the web build NativeWind's runtime throws outright
  // ("Cannot manually set color scheme, as dark mode is type 'media'") when the
  // scheme is driven in code under the media strategy. No `dark:` variants are
  // used today, so this only changes who is allowed to set the scheme.
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: 'var(--color-background, #0d0d0d)',
        surface: 'var(--color-surface, #111111)',
        'surface-elevated': 'var(--color-surface-elevated, #1a1a1a)',
        border: 'var(--color-border, #2a2a2a)',
        primary: {
          DEFAULT: 'var(--color-primary, #facc15)',
          foreground: 'var(--color-primary-foreground, #0d0d0d)',
          muted: 'var(--color-primary-muted, #a3820b)',
        },
        muted: 'var(--color-muted, #6b7280)',
        content: {
          DEFAULT: 'var(--color-content, #ffffff)',
          secondary: 'var(--color-content-secondary, #d1d5db)',
          tertiary: 'var(--color-content-tertiary, #9ca3af)',
        },
        danger: 'var(--color-danger, #ef4444)',
        success: 'var(--color-success, #22c55e)',
        warning: 'var(--color-warning, #f59e0b)',
        info: 'var(--color-info, #3b82f6)',
      },
      borderRadius: {
        xl: '16px',
        '2xl': '20px',
      },
    },
  },
  plugins: [],
};
