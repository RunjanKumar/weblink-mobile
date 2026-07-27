import React from 'react';
import {Pressable, Text, View} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {useTVFocus} from '../../hooks/useTVFocus';
import {useTheme} from '../../theme';

export interface HeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  right?: React.ReactNode;
}

function BackButton({onPress}: {onPress: () => void}) {
  const {theme} = useTheme();
  const {focused, onFocus, onBlur} = useTVFocus();
  return (
    <Pressable
      onPress={onPress}
      onFocus={onFocus}
      onBlur={onBlur}
      focusable
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel="Go back"
      className="mr-3 h-11 w-11 items-center justify-center rounded-full bg-surface-elevated"
      style={{
        borderWidth: 2,
        borderColor: focused ? theme.colors.focusRing : 'transparent',
      }}>
      <Icon name="chevron-back" size={24} color={theme.colors.text} />
    </Pressable>
  );
}

export function Header({title, subtitle, onBack, right}: HeaderProps) {
  return (
    <View className="flex-row items-center px-5 py-4">
      {onBack ? <BackButton onPress={onBack} /> : null}
      <View className="flex-1">
        <Text className="text-xl font-bold text-content">{title}</Text>
        {subtitle ? (
          <Text className="mt-0.5 text-sm text-content-tertiary">{subtitle}</Text>
        ) : null}
      </View>
      {right}
    </View>
  );
}
