import React from 'react';
import {Pressable, View} from 'react-native';
import {useTVFocus} from '../../hooks/useTVFocus';
import {IS_TV} from '../../utils/responsive';
import {useTheme} from '../../theme';

export interface ToggleProps {
  value: boolean;
  onValueChange: (next: boolean) => void;
  disabled?: boolean;
  accessibilityLabel?: string;
  /** Larger hit + knob for TV / primary toggles. */
  size?: 'sm' | 'md';
}

/** Custom switch — focusable for D-pad with an amber focus ring. */
export function Toggle({
  value,
  onValueChange,
  disabled = false,
  accessibilityLabel,
  size = 'md',
}: ToggleProps) {
  const {theme} = useTheme();
  const {focused, onFocus, onBlur} = useTVFocus();

  const tvBump = IS_TV ? 8 : 0;
  const trackW = (size === 'sm' ? 44 : 52) + tvBump;
  const trackH = (size === 'sm' ? 26 : 30) + (IS_TV ? 6 : 0);
  const knob = trackH - 6;

  return (
    <Pressable
      onPress={() => onValueChange(!value)}
      onFocus={onFocus}
      onBlur={onBlur}
      focusable={!disabled}
      disabled={disabled}
      accessibilityRole="switch"
      accessibilityState={{checked: value, disabled}}
      accessibilityLabel={accessibilityLabel}
      style={{
        width: trackW,
        height: trackH,
        borderRadius: trackH / 2,
        justifyContent: 'center',
        paddingHorizontal: 3,
        backgroundColor: value ? theme.colors.primary : theme.colors.muted,
        borderWidth: focused && IS_TV ? 3 : 2,
        borderColor: focused ? theme.colors.focusRing : 'transparent',
        opacity: disabled ? 0.5 : 1,
      }}>
      <View
        style={{
          width: knob,
          height: knob,
          borderRadius: knob / 2,
          backgroundColor: '#ffffff',
          alignSelf: value ? 'flex-end' : 'flex-start',
        }}
      />
    </Pressable>
  );
}
