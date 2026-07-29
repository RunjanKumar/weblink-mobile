import React from 'react';
import {ActivityIndicator, Pressable} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {useTVFocus} from '../../hooks/useTVFocus';
import {useTheme} from '../../theme';
import {IS_TV} from '../../utils/responsive';

export interface RefreshButtonProps {
  onPress: () => void;
  /** Shows a spinner in place of the glyph while a refetch is in flight. */
  busy?: boolean;
  accessibilityLabel?: string;
}

/**
 * Header refresh control.
 *
 * Pull-to-refresh is unreachable with a remote — there is no gesture to make —
 * so every screen that relies on it also needs a focusable button. Sized as a
 * comfortable D-pad target on TV, and carries the standard focus ring so the
 * highlight is visible when the guest arrows onto it.
 */
export function RefreshButton({
  onPress,
  busy = false,
  accessibilityLabel = 'Refresh',
}: RefreshButtonProps) {
  const {theme} = useTheme();
  const {focused, onFocus, onBlur} = useTVFocus();
  const size = IS_TV ? 48 : 40;

  return (
    <Pressable
      onPress={onPress}
      onFocus={onFocus}
      onBlur={onBlur}
      focusable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      className="items-center justify-center"
      style={{
        height: size,
        width: size,
        borderRadius: size / 2,
        borderWidth: 2,
        borderColor: focused ? theme.colors.focusRing : 'transparent',
        backgroundColor: focused ? theme.colors.surfaceElevated : 'transparent',
      }}>
      {busy ? (
        <ActivityIndicator size="small" color={theme.colors.primary} />
      ) : (
        <Icon name="refresh" size={IS_TV ? 24 : 20} color={theme.colors.text} />
      )}
    </Pressable>
  );
}
