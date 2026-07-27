import React from 'react';
import {Pressable, View} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {useTVFocus} from '../../hooks/useTVFocus';
import {useTheme} from '../../theme';

export interface StarRatingProps {
  value: number;
  onChange: (value: number) => void;
  size?: number;
  readonly?: boolean;
}

function Star({
  index,
  filled,
  size,
  onPress,
  readonly,
}: {
  index: number;
  filled: boolean;
  size: number;
  onPress: () => void;
  readonly: boolean;
}) {
  const {theme} = useTheme();
  const {focused, onFocus, onBlur} = useTVFocus();
  return (
    <Pressable
      onPress={onPress}
      onFocus={onFocus}
      onBlur={onBlur}
      focusable={!readonly}
      disabled={readonly}
      accessibilityRole="button"
      accessibilityLabel={`${index} star${index > 1 ? 's' : ''}`}
      hitSlop={6}
      style={{
        borderRadius: 8,
        padding: 3,
        borderWidth: 2,
        borderColor: focused ? theme.colors.focusRing : 'transparent',
      }}>
      <Icon
        name={filled ? 'star' : 'star-outline'}
        size={size}
        color={filled ? theme.colors.primary : theme.colors.muted}
      />
    </Pressable>
  );
}

export function StarRating({value, onChange, size = 36, readonly = false}: StarRatingProps) {
  return (
    <View className="flex-row" style={{gap: 8}} accessibilityRole="adjustable">
      {[1, 2, 3, 4, 5].map(i => (
        <Star
          key={i}
          index={i}
          filled={i <= value}
          size={size}
          readonly={readonly}
          onPress={() => onChange(i)}
        />
      ))}
    </View>
  );
}
