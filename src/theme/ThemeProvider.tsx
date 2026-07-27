import React, {createContext, useCallback, useContext, useMemo, useState} from 'react';
import {darkTheme, lightTheme, type ColorScheme, type Theme} from './theme';

interface ThemeContextValue {
  theme: Theme;
  scheme: ColorScheme;
  setScheme: (scheme: ColorScheme) => void;
  toggleScheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

// The app ships dark-first (its signature look). Light mode is fully defined and
// switchable; wiring it to the OS scheme is a future enhancement.
const DEFAULT_SCHEME: ColorScheme = 'dark';

export function ThemeProvider({children}: {children: React.ReactNode}) {
  const [scheme, setSchemeState] = useState<ColorScheme>(DEFAULT_SCHEME);

  const setScheme = useCallback((next: ColorScheme) => setSchemeState(next), []);
  const toggleScheme = useCallback(
    () => setSchemeState(prev => (prev === 'dark' ? 'light' : 'dark')),
    [],
  );

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme: scheme === 'dark' ? darkTheme : lightTheme,
      scheme,
      setScheme,
      toggleScheme,
    }),
    [scheme, setScheme, toggleScheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within a <ThemeProvider>');
  }
  return ctx;
}
