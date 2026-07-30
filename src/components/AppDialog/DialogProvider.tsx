import React, {useCallback, useEffect, useRef, useState} from 'react';
import {Modal, Platform, Pressable, Text, View} from 'react-native';
import {Button} from '../Button';
import {
  DS,
  FONT,
  GLASS_BLUR,
  GlassButton,
  GlassSheen,
  GoldButton,
} from '../TvGlass';
import {useTheme, useThemeVars} from '../../theme';
import {IS_TV} from '../../utils/responsive';
import {registerModal} from '../../services/modalRegistry';
import {setDialogListener, type DialogRequest} from './dialog';

export const DIALOG_ROOT_ID = 'app-dialog-root';

interface ActiveDialog {
  request: DialogRequest;
  resolve: (value: string) => void;
}

/**
 * Renders dialogs requested through the `dialog` bridge. Mount ONCE in App.tsx
 * (inside ThemeProvider). Uses RN `Modal` (supported by react-native-web).
 *
 * TV specifics:
 *  - content root carries `nativeID={DIALOG_ROOT_ID}` → webosRemote scopes
 *    D-pad spatial nav to the dialog while it is open;
 *  - on web, focus is moved into the dialog on open (otherwise OK would
 *    re-trigger whatever was focused behind it);
 *  - registered in the modal registry so the TV Back key closes the dialog
 *    instead of popping the screen;
 *  - wears the `TvGlass` design system rather than the app theme. The dashboard
 *    ⋮ menu IS this dialog, so a theme-surface card (a near-white slab on the
 *    light theme) landed on top of the champagne glass looking like a different
 *    application had opened.
 */
export function DialogProvider({children}: {children: React.ReactNode}) {
  const {theme} = useTheme();
  // Modal renders in a portal outside ThemeProvider's vars scope — re-apply.
  const themeVars = useThemeVars();
  const [active, setActive] = useState<ActiveDialog | null>(null);
  const [visible, setVisible] = useState(false);
  const activeRef = useRef<ActiveDialog | null>(null);
  const clearTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setDialogListener((request, resolve) => {
      // One dialog at a time; a new request dismisses the previous one.
      activeRef.current?.resolve(activeRef.current.request.dismissValue ?? 'cancel');
      if (clearTimer.current) {
        clearTimeout(clearTimer.current);
        clearTimer.current = null;
      }
      const next = {request, resolve};
      activeRef.current = next;
      setActive(next);
      setVisible(true);
    });
    return () => setDialogListener(null);
  }, []);

  const finish = useCallback((value: string) => {
    const current = activeRef.current;
    if (!current) {
      return;
    }
    activeRef.current = null;
    // Keep `active` (the content) mounted through the Modal's fade-out —
    // nulling it immediately flashes an empty card during the exit animation.
    setVisible(false);
    clearTimer.current = setTimeout(() => setActive(null), 280);
    current.resolve(value);
  }, []);

  const dismiss = useCallback(() => {
    finish(activeRef.current?.request.dismissValue ?? 'cancel');
  }, [finish]);

  // Back key / registry integration while open.
  useEffect(() => {
    if (!visible) {
      return;
    }
    return registerModal({rootId: DIALOG_ROOT_ID, close: dismiss});
  }, [visible, dismiss]);

  // Web: seed focus on the PRIMARY action (the LAST one — matching Android
  // TV's hasTVPreferredFocus) so both platforms start on the same button.
  useEffect(() => {
    if (!visible || Platform.OS !== 'web' || typeof document === 'undefined') {
      return;
    }
    const timer = setTimeout(() => {
      const root = document.getElementById(DIALOG_ROOT_ID);
      const focusables = root?.querySelectorAll<HTMLElement>(
        '[tabindex]:not([tabindex="-1"]), button',
      );
      focusables?.[focusables.length - 1]?.focus();
    }, 50);
    return () => clearTimeout(timer);
  }, [visible]);

  return (
    <>
      {children}
      <Modal visible={visible} transparent animationType="fade" onRequestClose={dismiss}>
        <Pressable
          onPress={dismiss}
          // Backdrop is NOT focusable: the D-pad must not be able to land on
          // it and accidentally dismiss.
          focusable={false}
          style={[
            themeVars,
            {
              flex: 1,
              // The glass needs a darker field than the theme's overlay, or the
              // translucent card has nothing to read against.
              backgroundColor: IS_TV ? 'rgba(10,7,3,0.72)' : theme.colors.overlay,
              alignItems: 'center',
              justifyContent: 'center',
              padding: 24,
            },
          ]}>
          <Pressable
            nativeID={DIALOG_ROOT_ID}
            onPress={() => {}}
            focusable={false}
            style={
              IS_TV
                ? {
                    width: '100%',
                    maxWidth: 460,
                    // Nearly opaque: `backdrop-filter` is off on TV for
                    // performance, so there is no blur to stop the dashboard's
                    // bright tile text reading straight through the card.
                    backgroundColor: 'rgba(30,23,13,0.96)',
                    borderRadius: DS.radius,
                    borderWidth: 1,
                    borderColor: DS.border,
                    padding: 20,
                    overflow: 'hidden',
                    ...(GLASS_BLUR ?? {}),
                  }
                : {
                    width: '100%',
                    maxWidth: 400,
                    backgroundColor: theme.colors.surface,
                    borderRadius: 20,
                    borderWidth: 1,
                    borderColor: theme.colors.border,
                    padding: 24,
                  }
            }>
            {IS_TV ? <GlassSheen /> : null}
            <Text
              style={{
                color: IS_TV ? DS.text : theme.colors.text,
                fontSize: IS_TV ? 20 : 18,
                fontWeight: '700',
                letterSpacing: IS_TV ? 0.4 : 0,
                fontFamily: IS_TV ? FONT : undefined,
              }}>
              {active?.request.title}
            </Text>
            {active?.request.message ? (
              <Text
                style={{
                  marginTop: 8,
                  color: IS_TV ? DS.text2 : theme.colors.textSecondary,
                  fontSize: IS_TV ? 13 : 14,
                  lineHeight: IS_TV ? 20 : 20,
                  fontFamily: IS_TV ? FONT : undefined,
                }}>
                {active.request.message}
              </Text>
            ) : null}
            <View style={{marginTop: IS_TV ? 16 : 20, gap: IS_TV ? 8 : 10}}>
              {active?.request.actions.map((action, index) => {
                const preferred = index === active.request.actions.length - 1;
                if (!IS_TV) {
                  return (
                    <Button
                      key={action.value}
                      label={action.label}
                      variant={action.variant ?? 'secondary'}
                      hasTVPreferredFocus={preferred}
                      onPress={() => finish(action.value)}
                      fullWidth
                    />
                  );
                }
                // Gold carries the primary action, a danger TINT the destructive
                // one — a red slab would read as an error banner on this palette.
                return action.variant === 'primary' ? (
                  <GoldButton
                    key={action.value}
                    label={action.label}
                    icon={null}
                    hasTVPreferredFocus={preferred}
                    onPress={() => finish(action.value)}
                  />
                ) : (
                  <GlassButton
                    key={action.value}
                    label={action.label}
                    tone={action.variant === 'danger' ? DS.danger : undefined}
                    hasTVPreferredFocus={preferred}
                    onPress={() => finish(action.value)}
                    height={44}
                  />
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
