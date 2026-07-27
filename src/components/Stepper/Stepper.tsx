import React from 'react';
import {Pressable, Text, View} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {useTVFocus} from '../../hooks/useTVFocus';
import {IS_TV} from '../../utils/responsive';
import {useTheme} from '../../theme';

export interface StepperProps {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  step?: number;
  format?: (value: number) => string;
  disabled?: boolean;
  accessibilityLabel?: string;
}

function StepButton({
  icon,
  onPress,
  disabled,
  label,
}: {
  icon: string;
  onPress: () => void;
  disabled: boolean;
  label: string;
}) {
  const {theme} = useTheme();
  const {focused, onFocus, onBlur} = useTVFocus();
  return (
    <Pressable
      onPress={onPress}
      onFocus={onFocus}
      onBlur={onBlur}
      focusable={!disabled}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      style={{
        width: IS_TV ? 52 : 44,
        height: IS_TV ? 52 : 44,
        borderRadius: IS_TV ? 26 : 22,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.colors.surfaceElevated,
        borderWidth: focused && IS_TV ? 3 : 2,
        borderColor: focused ? theme.colors.focusRing : 'transparent',
        opacity: disabled ? 0.4 : 1,
      }}>
      <Icon name={icon} size={IS_TV ? 26 : 22} color={theme.colors.primary} />
    </Pressable>
  );
}

/**
 * D-pad-friendly numeric control used for fan speed and AC temperature (replaces
 * the web's drag slider, which is awkward on a TV remote).
 */
export function Stepper({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  format = v => String(v),
  disabled = false,
  accessibilityLabel,
}: StepperProps) {
  const {theme} = useTheme();
  const decrement = () => onChange(Math.max(min, value - step));
  const increment = () => onChange(Math.min(max, value + step));

  return (
    <View className="flex-row items-center justify-between" accessibilityLabel={accessibilityLabel}>
      <StepButton icon="remove" onPress={decrement} disabled={disabled || value <= min} label="Decrease" />
      <Text style={{color: theme.colors.primary}} className="text-lg font-bold">
        {format(value)}
      </Text>
      <StepButton icon="add" onPress={increment} disabled={disabled || value >= max} label="Increase" />
    </View>
  );
}
