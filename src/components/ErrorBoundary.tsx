import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

/**
 * Paints render-time crashes onto the screen.
 *
 * WHY THIS EXISTS: on webOS the app is loaded from `file://`, so the bundle
 * counts as a different origin than the document. The browser therefore refuses
 * to hand any detail to `window.onerror` — the boot handler in `web/index.html`
 * only ever receives the literal string "Script error." with an empty filename
 * and line 0, which says nothing about what actually broke.
 *
 * A React error boundary is not subject to that: it receives the real `Error`
 * object because it catches inside the same script. So anything thrown during
 * render, in a lifecycle method, or in a constructor lands here with a usable
 * message, stack, and component stack — and gets drawn on the TV, which has no
 * reachable console.
 *
 * NOTE the deliberate lack of dependencies: no theme, no navigation, no context.
 * A boundary that needs a provider is useless when the crash is IN a provider.
 * Everything below is a plain primitive with inline styles.
 */

interface Props {
  children: React.ReactNode;
}

interface State {
  error: Error | null;
  componentStack: string | null;
}

const COLORS = {
  background: '#0d0d0d',
  danger: '#ef4444',
  text: '#f5f5f5',
  muted: '#a3a3a3',
  border: '#404040',
  accent: '#facc15',
};

export class ErrorBoundary extends React.Component<Props, State> {
  override state: State = { error: null, componentStack: null };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  override componentDidCatch(error: Error, info: React.ErrorInfo): void {
    this.setState({ componentStack: info.componentStack ?? null });
    // Still worth logging: `ares-inspect` can read this even though the
    // on-screen text is the only thing visible on the TV itself.
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  private reset = (): void => {
    this.setState({ error: null, componentStack: null });
  };

  override render(): React.ReactNode {
    const { error, componentStack } = this.state;
    if (!error) {
      return this.props.children;
    }

    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background }}>
        <ScrollView contentContainerStyle={{ padding: 24 }}>
          <Text style={{ color: COLORS.danger, fontSize: 20, fontWeight: 'bold' }}>
            {error.name || 'Error'}
          </Text>
          <Text style={{ color: COLORS.text, fontSize: 15, marginTop: 8 }}>
            {error.message || String(error)}
          </Text>

          {error.stack ? (
            <>
              <Text style={{ color: COLORS.muted, fontSize: 12, marginTop: 20 }}>Stack</Text>
              <Text
                style={{
                  color: COLORS.muted,
                  fontFamily: 'monospace',
                  fontSize: 11,
                  marginTop: 4,
                }}
              >
                {error.stack}
              </Text>
            </>
          ) : null}

          {componentStack ? (
            <>
              <Text style={{ color: COLORS.muted, fontSize: 12, marginTop: 20 }}>
                Component stack
              </Text>
              <Text
                style={{
                  color: COLORS.muted,
                  fontFamily: 'monospace',
                  fontSize: 11,
                  marginTop: 4,
                }}
              >
                {componentStack}
              </Text>
            </>
          ) : null}

          <Pressable
            onPress={this.reset}
            focusable
            accessibilityRole="button"
            accessibilityLabel="Try again"
            style={{
              alignSelf: 'flex-start',
              marginTop: 28,
              paddingHorizontal: 20,
              paddingVertical: 12,
              borderRadius: 12,
              borderWidth: 2,
              borderColor: COLORS.accent,
            }}
          >
            <Text style={{ color: COLORS.accent, fontWeight: 'bold' }}>Try again</Text>
          </Pressable>
        </ScrollView>
      </View>
    );
  }
}
