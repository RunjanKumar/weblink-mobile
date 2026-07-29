import React, {createContext, useCallback, useContext, useEffect, useMemo, useState} from 'react';
import {Platform, View} from 'react-native';
import {vars} from 'nativewind';
import {darkTheme, lightTheme, type ColorScheme, type Theme} from './theme';
import type {ThemeColors} from './colors';
import {storage} from '../services/storage.service';

interface ThemeContextValue {
  theme: Theme;
  scheme: ColorScheme;
  setScheme: (scheme: ColorScheme) => void;
  toggleScheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

// Client requirement (2026-07-28): the app ships LIGHT by default on the hotel
// TVs. Dark remains available from Settings and the choice is persisted.
const DEFAULT_SCHEME: ColorScheme = 'light';
const SCHEME_STORAGE_KEY = 'ui.colorScheme';

/**
 * Map the JS theme object onto the CSS variables the Tailwind tokens read
 * (see tailwind.config.js). This is the bridge that makes `bg-surface` /
 * `text-content` classNames follow the active scheme — on native via
 * NativeWind's runtime, on web as real CSS custom properties.
 */
function themeVars(c: ThemeColors) {
  return vars({
    '--color-background': c.background,
    '--color-surface': c.surface,
    '--color-surface-elevated': c.surfaceElevated,
    '--color-border': c.border,
    '--color-primary': c.primary,
    '--color-primary-foreground': c.primaryForeground,
    '--color-primary-muted': c.primaryMuted,
    '--color-muted': c.muted,
    '--color-content': c.text,
    '--color-content-secondary': c.textSecondary,
    '--color-content-tertiary': c.textTertiary,
    '--color-danger': c.danger,
    '--color-success': c.success,
    '--color-warning': c.warning,
    '--color-info': c.info,
  });
}

function loadInitialScheme(): ColorScheme {
  const saved = storage.getString(SCHEME_STORAGE_KEY);
  return saved === 'dark' || saved === 'light' ? saved : DEFAULT_SCHEME;
}

export function ThemeProvider({children}: {children: React.ReactNode}) {
  const [scheme, setSchemeState] = useState<ColorScheme>(loadInitialScheme);

  const setScheme = useCallback((next: ColorScheme) => {
    setSchemeState(next);
    storage.setString(SCHEME_STORAGE_KEY, next);
  }, []);
  const toggleScheme = useCallback(() => {
    setSchemeState(prev => {
      const next = prev === 'dark' ? 'light' : 'dark';
      storage.setString(SCHEME_STORAGE_KEY, next);
      return next;
    });
  }, []);

  const theme = scheme === 'dark' ? darkTheme : lightTheme;

  // Web/webOS: the <body> behind the React root (web/index.html) has a static
  // boot background; keep it matching the scheme so overscroll/edges never
  // flash the wrong color.
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.body.style.backgroundColor = theme.colors.background;
    }
  }, [theme]);

  const value = useMemo<ThemeContextValue>(
    () => ({theme, scheme, setScheme, toggleScheme}),
    [theme, scheme, setScheme, toggleScheme],
  );

  const style = useMemo(() => [{flex: 1}, themeVars(theme.colors)], [theme]);

  return (
    <ThemeContext.Provider value={value}>
      <View style={style}>{children}</View>
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within a <ThemeProvider>');
  }
  return ctx;
}

/**
 * Theme CSS-variable style for content rendered in a PORTAL (RN `Modal`).
 * Portals mount outside ThemeProvider's wrapper View, so className tokens
 * inside them would fall back to the dark defaults — apply this to the
 * modal's root (e.g. the backdrop) to re-establish the active scheme.
 */
export function useThemeVars() {
  const {theme} = useTheme();
  return useMemo(() => themeVars(theme.colors), [theme]);
}
