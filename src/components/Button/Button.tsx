import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  Text,
  View,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import {useTVFocus} from '../../hooks/useTVFocus';
import {IS_TV} from '../../utils/responsive';
import {useTheme} from '../../theme';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

export interface ButtonProps
  extends Omit<PressableProps, 'style' | 'children' | 'disabled'> {
  label: string;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  /** Request initial D-pad focus on TV (only ONE element per screen should set this). */
  hasTVPreferredFocus?: boolean;
  style?: StyleProp<ViewStyle>;
}

const SIZE_CLASS: Record<Size, string> = {
  sm: 'min-h-[44px] px-4',
  md: 'min-h-[52px] px-6',
  lg: 'min-h-[58px] px-7',
};

const VARIANT_CLASS: Record<Variant, string> = {
  primary: 'bg-primary',
  secondary: 'bg-surface-elevated',
  ghost: 'bg-transparent',
  danger: 'bg-danger',
};

const TEXT_CLASS: Record<Variant, string> = {
  primary: 'text-primary-foreground',
  secondary: 'text-content',
  ghost: 'text-primary',
  danger: 'text-white',
};

/**
 * Primary action button. Large touch targets (>=44dp) for TV/touch, a visible
 * amber focus ring + slight scale on D-pad focus, and a loading state.
 */
export function Button({
  label,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  leftIcon,
  hasTVPreferredFocus = false,
  onFocus,
  onBlur,
  style,
  ...rest
}: ButtonProps) {
  const {theme, scheme} = useTheme();
  const {focused, onFocus: handleFocus, onBlur: handleBlur} = useTVFocus({onFocus, onBlur});
  const isDisabled = disabled || loading;
  // A white ripple is invisible on the light theme's light button fills.
  const ripple = scheme === 'dark' ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.10)';

  const indicatorColor =
    variant === 'primary' ? theme.colors.primaryForeground : theme.colors.primary;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{disabled: isDisabled, busy: loading}}
      disabled={isDisabled}
      focusable={!isDisabled}
      hasTVPreferredFocus={hasTVPreferredFocus}
      onFocus={handleFocus}
      onBlur={handleBlur}
      android_ripple={{color: ripple}}
      className={[
        'flex-row items-center justify-center rounded-xl',
        SIZE_CLASS[size],
        VARIANT_CLASS[variant],
        fullWidth ? 'w-full' : 'self-stretch',
        isDisabled ? 'opacity-50' : '',
      ].join(' ')}
      style={[
        {
          borderWidth: focused && IS_TV ? 3 : 2,
          borderColor: focused ? theme.colors.focusRing : 'transparent',
          transform: [{scale: focused ? (IS_TV ? 1.06 : 1.03) : 1}],
        },
        IS_TV ? {minHeight: 56} : null,
        style,
      ]}
      {...rest}>
      {loading ? (
        <ActivityIndicator color={indicatorColor} />
      ) : (
        <>
          {leftIcon ? <View className="mr-2">{leftIcon}</View> : null}
          <Text className={`${IS_TV ? 'text-lg' : 'text-base'} font-semibold ${TEXT_CLASS[variant]}`}>
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}
