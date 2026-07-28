/**
 * Tailwind / NativeWind configuration.
 *
 * The color palette mirrors the "dark luxury" look of the existing web app
 * (near-black surfaces + amber accent) and is kept in sync with
 * `src/theme/colors.ts`. Prefer referencing these tokens (e.g. `bg-background`,
 * `text-primary`) over raw hex values so a future light theme is a config swap.
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
        background: '#0d0d0d',
        surface: '#111111',
        'surface-elevated': '#1a1a1a',
        border: '#2a2a2a',
        primary: {
          DEFAULT: '#facc15',
          foreground: '#0d0d0d',
          muted: '#a3820b',
        },
        muted: '#6b7280',
        content: {
          DEFAULT: '#ffffff',
          secondary: '#d1d5db',
          tertiary: '#9ca3af',
        },
        danger: '#ef4444',
        success: '#22c55e',
        warning: '#f59e0b',
        info: '#3b82f6',
      },
      borderRadius: {
        xl: '16px',
        '2xl': '20px',
      },
    },
  },
  plugins: [],
};
