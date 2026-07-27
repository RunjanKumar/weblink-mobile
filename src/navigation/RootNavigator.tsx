import React, {useMemo} from 'react';
import {
  DefaultTheme,
  NavigationContainer,
  type Theme as NavigationTheme,
} from '@react-navigation/native';
import {useAuth} from '../store/AuthContext';
import {useTheme} from '../theme';
import {AuthNavigator} from './AuthNavigator';
import {AppNavigator} from './AppNavigator';
import {SplashScreen} from '../screens/SplashScreen';

/**
 * Top-level switch. While the session is being restored we show the Splash
 * OUTSIDE the NavigationContainer (so no navigator warnings), then mount either
 * the authenticated app or the auth flow. Because this is driven by auth
 * `status`, a 401 anywhere resets the user straight back to Login.
 */
export function RootNavigator() {
  const {status} = useAuth();
  const {theme} = useTheme();

  const navigationTheme = useMemo<NavigationTheme>(
    () => ({
      ...DefaultTheme,
      dark: theme.scheme === 'dark',
      colors: {
        ...DefaultTheme.colors,
        background: theme.colors.background,
        card: theme.colors.surface,
        text: theme.colors.text,
        border: theme.colors.border,
        primary: theme.colors.primary,
        notification: theme.colors.danger,
      },
    }),
    [theme],
  );

  if (status === 'loading') {
    return <SplashScreen />;
  }

  return (
    <NavigationContainer theme={navigationTheme}>
      {status === 'authenticated' ? <AppNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}
