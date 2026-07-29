import React, {useCallback, useEffect, useRef, useState} from 'react';
import {Modal, Platform, Pressable, Text, View} from 'react-native';
import {Button} from '../Button';
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
 *    instead of popping the screen.
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
              backgroundColor: theme.colors.overlay,
              alignItems: 'center',
              justifyContent: 'center',
              padding: 24,
            },
          ]}>
          <Pressable
            nativeID={DIALOG_ROOT_ID}
            onPress={() => {}}
            focusable={false}
            style={{
              width: '100%',
              maxWidth: IS_TV ? 560 : 400,
              backgroundColor: theme.colors.surface,
              borderRadius: 20,
              borderWidth: 1,
              borderColor: theme.colors.border,
              padding: 24,
            }}>
            <Text
              style={{
                color: theme.colors.text,
                fontSize: IS_TV ? 24 : 18,
                fontWeight: '700',
              }}>
              {active?.request.title}
            </Text>
            {active?.request.message ? (
              <Text
                style={{
                  marginTop: 8,
                  color: theme.colors.textSecondary,
                  fontSize: IS_TV ? 17 : 14,
                  lineHeight: IS_TV ? 26 : 20,
                }}>
                {active.request.message}
              </Text>
            ) : null}
            <View style={{marginTop: 20, gap: 10}}>
              {active?.request.actions.map((action, index) => (
                <Button
                  key={action.value}
                  label={action.label}
                  variant={action.variant ?? 'secondary'}
                  hasTVPreferredFocus={index === active.request.actions.length - 1}
                  onPress={() => finish(action.value)}
                  fullWidth
                />
              ))}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
