import React from 'react';
import { StatusBar } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from './src/components';
import { ThemeProvider } from './src/theme';
import { AuthProvider } from './src/store/AuthContext';
import { SocketProvider } from './src/store/SocketContext';
import { ServiceRequestProvider } from './src/store/ServiceRequestContext';
import { FoodOrderProvider } from './src/store/FoodOrderContext';
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
 */
export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ErrorBoundary>
        <SafeAreaProvider>
          <QueryClientProvider client={queryClient}>
            <ThemeProvider>
              <AuthProvider>
                <SocketProvider>
                  <ServiceRequestProvider>
                    <FoodOrderProvider>
                      <StatusBar barStyle="light-content" backgroundColor="#0d0d0d" />
                      <RootNavigator />
                    </FoodOrderProvider>
                  </ServiceRequestProvider>
                </SocketProvider>
              </AuthProvider>
            </ThemeProvider>
          </QueryClientProvider>
        </SafeAreaProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}
