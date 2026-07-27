import React from 'react';
import {ActivityIndicator, Text, View} from 'react-native';
import {useTheme} from '../../theme';

export interface LoaderProps {
  label?: string;
  fullscreen?: boolean;
  size?: 'small' | 'large';
}

export function Loader({label, fullscreen = true, size = 'large'}: LoaderProps) {
  const {theme} = useTheme();
  return (
    <View
      className={
        fullscreen
          ? 'flex-1 items-center justify-center bg-background'
          : 'items-center justify-center py-6'
      }>
      <ActivityIndicator size={size} color={theme.colors.primary} />
      {label ? <Text className="mt-3 text-sm text-content-tertiary">{label}</Text> : null}
    </View>
  );
}
