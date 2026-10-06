import React from 'react';
import { StatusBar } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from './src/components';
import { DialogProvider } from './src/components/AppDialog';
import { ToastHost } from './src/components/Toast';
import { ThemeProvider, useTheme } from './src/theme';
import { AuthProvider } from './src/store/AuthContext';
import { TvPresenceProvider } from './src/store/TvPresenceContext';
import { SocketProvider } from './src/store/SocketContext';
import { ServiceRequestProvider } from './src/store/ServiceRequestContext';
import { FoodOrderProvider } from './src/store/FoodOrderContext';
import { LaundryBasketProvider } from './src/store/LaundryBasketContext';
import { RootNavigator } from './src/navigation/RootNavigator';
import { queryClient } from './src/services/queryClient';

/**
 * Provider composition (outermost -> innermost):
 *   GestureHandlerRootView  – required by React Navigation gestures
 *   ErrorBoundary           – paints render crashes on screen; on webOS a throw
 *                             otherwise reaches window.onerror as a detail-less
 *                             "Script error." (file:// counts as cross-origin)
 *   SafeAreaProvider        – notch / TV-safe insets
 *   QueryClientProvider     – React Query cache
 *   ThemeProvider           – design tokens (dark by default)
 *   AuthProvider            – session state; drives RootNavigator's auth switch
 *   TvPresenceProvider      – Samsung in-room TV only: pairing + automatic
 *                             guest sign-in (a no-op on every other build)
 */
/** Status bar that follows the active scheme (dark icons on the light theme). */
function ThemedStatusBar() {
  const { theme, scheme } = useTheme();
  return (
    <StatusBar
      barStyle={scheme === 'dark' ? 'light-content' : 'dark-content'}
      backgroundColor={theme.colors.background}
    />
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ErrorBoundary>
        <SafeAreaProvider>
          <QueryClientProvider client={queryClient}>
            <ThemeProvider>
              <AuthProvider>
                <TvPresenceProvider>
                  <SocketProvider>
                    <ServiceRequestProvider>
                      <FoodOrderProvider>
                        <LaundryBasketProvider>
                          <DialogProvider>
                            <ThemedStatusBar />
                            <RootNavigator />
                            <ToastHost />
                          </DialogProvider>
                        </LaundryBasketProvider>
                      </FoodOrderProvider>
                    </ServiceRequestProvider>
                  </SocketProvider>
                </TvPresenceProvider>
              </AuthProvider>
            </ThemeProvider>
          </QueryClientProvider>
        </SafeAreaProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}
