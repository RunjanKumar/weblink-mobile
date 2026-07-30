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
  /**
   * When false the switch is display-only: not focusable, not pressable, and it
   * swallows no taps. Use it when the surrounding tile is the control — on a TV
   * a whole row is far easier to hit with a D-pad than a 44px switch, and two
   * focus stops per row (tile AND switch) just doubles the presses.
   */
  interactive?: boolean;
  /** Track overrides for surfaces with their own palette (TV glass dashboard). */
  trackOnColor?: string;
  trackOffColor?: string;
}

/** Custom switch — focusable for D-pad with an amber focus ring. */
export function Toggle({
  value,
  onValueChange,
  disabled = false,
  accessibilityLabel,
  size = 'md',
  interactive = true,
  trackOnColor,
  trackOffColor,
}: ToggleProps) {
  const {theme} = useTheme();
  const {focused, onFocus, onBlur} = useTVFocus();

  const tvBump = IS_TV ? 8 : 0;
  const trackW = (size === 'sm' ? 44 : 52) + tvBump;
  const trackH = (size === 'sm' ? 26 : 30) + (IS_TV ? 6 : 0);
  const knob = trackH - 6;

  const track = {
    width: trackW,
    height: trackH,
    borderRadius: trackH / 2,
    justifyContent: 'center' as const,
    paddingHorizontal: 3,
    backgroundColor: value
      ? (trackOnColor ?? theme.colors.primary)
      : (trackOffColor ?? theme.colors.muted),
    borderWidth: focused && IS_TV ? 3 : 2,
    borderColor: focused ? theme.colors.focusRing : 'transparent',
    opacity: disabled ? 0.5 : 1,
  };

  const knobView = (
    <View
      style={{
        width: knob,
        height: knob,
        borderRadius: knob / 2,
        backgroundColor: '#ffffff',
        // Hairline keeps the white knob defined on the light theme's paler
        // tracks; invisible against the dark theme's saturated tracks.
        borderWidth: 0.5,
        borderColor: 'rgba(0,0,0,0.15)',
        alignSelf: value ? 'flex-end' : 'flex-start',
      }}
    />
  );

  // Display-only: a plain View, so it cannot take focus or steal the press
  // from the tile that owns it.
  if (!interactive) {
    return (
      <View style={track} pointerEvents="none">
        {knobView}
      </View>
    );
  }

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
      style={track}>
      {knobView}
    </Pressable>
  );
}
