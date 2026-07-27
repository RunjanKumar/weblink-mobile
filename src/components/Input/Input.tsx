import React, {forwardRef, useState} from 'react';
import {
  Pressable,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {IS_TV} from '../../utils/responsive';
import {useTheme} from '../../theme';

export interface InputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  containerClassName?: string;
}

/**
 * Text field with label, error text, focus ring and (when `secureTextEntry` is
 * set) a show/hide password toggle. Ref-forwarded so React Hook Form can focus
 * the next field.
 */
export const Input = forwardRef<TextInput, InputProps>(function Input(
  {label, error, leftIcon, secureTextEntry, containerClassName = '', onFocus, onBlur, ...rest},
  ref,
) {
  const {theme} = useTheme();
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState<boolean>(Boolean(secureTextEntry));

  const borderColor = error
    ? theme.colors.danger
    : focused
      ? theme.colors.focusRing
      : theme.colors.border;

  return (
    <View className={`w-full ${containerClassName}`}>
      {label ? (
        <Text className="mb-2 text-sm font-medium text-content-secondary">{label}</Text>
      ) : null}

      <View
        className="flex-row items-center rounded-xl bg-surface-elevated px-4"
        style={{borderWidth: focused && IS_TV ? 2.5 : 1.5, borderColor, minHeight: IS_TV ? 60 : 52}}>
        {leftIcon ? <View className="mr-2">{leftIcon}</View> : null}

        <TextInput
          ref={ref}
          className="flex-1 text-base text-content"
          style={{paddingVertical: 10}}
          placeholderTextColor={theme.colors.muted}
          secureTextEntry={hidden}
          onFocus={e => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={e => {
            setFocused(false);
            onBlur?.(e);
          }}
          {...rest}
        />

        {secureTextEntry ? (
          <Pressable
            onPress={() => setHidden(prev => !prev)}
            hitSlop={12}
            focusable
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Show password' : 'Hide password'}>
            <Icon
              name={hidden ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={theme.colors.muted}
            />
          </Pressable>
        ) : null}
      </View>

      {error ? <Text className="mt-1.5 text-sm text-danger">{error}</Text> : null}
    </View>
  );
});
