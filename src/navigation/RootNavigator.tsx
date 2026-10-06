import React, {useMemo} from 'react';
import {
  DefaultTheme,
  NavigationContainer,
  type Theme as NavigationTheme,
} from '@react-navigation/native';
import {useAuth} from '../store/AuthContext';
import {useTvPresence} from '../store/TvPresenceContext';
import {useTheme} from '../theme';
import {AuthNavigator} from './AuthNavigator';
import {AppNavigator} from './AppNavigator';
import {navigationRef} from './navigationRef';
import {SplashScreen} from '../screens/SplashScreen';
import {TvGateScreen} from '../screens/Tv/TvGateScreen';

/**
 * Top-level switch. While the session is being restored we show the Splash
 * OUTSIDE the NavigationContainer (so no navigator warnings), then mount either
 * the authenticated app or the auth flow. Because this is driven by auth
 * `status`, a 401 anywhere resets the user straight back to Login.
 *
 * A Samsung in-room TV never shows Login: the room's guest is signed in
 * automatically (TvPresenceContext), and until then it shows TvGateScreen.
 */
export function RootNavigator() {
  const {status} = useAuth();
  const {enabled: isRoomTv} = useTvPresence();
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

  if (isRoomTv && status !== 'authenticated') {
    return <TvGateScreen />;
  }

  return (
    <NavigationContainer ref={navigationRef} theme={navigationTheme}>
      {status === 'authenticated' ? <AppNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}
