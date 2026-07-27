import React from 'react';
import {Text, View} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {useTheme} from '../../theme';

export interface EmptyStateProps {
  icon?: string;
  title?: string;
  message?: string;
  action?: React.ReactNode;
}

export function EmptyState({
  icon = 'file-tray-outline',
  title = 'Nothing here yet',
  message,
  action,
}: EmptyStateProps) {
  const {theme} = useTheme();
  return (
    <View className="flex-1 items-center justify-center px-8">
      <Icon name={icon} size={52} color={theme.colors.muted} />
      <Text className="mt-4 text-center text-lg font-semibold text-content">{title}</Text>
      {message ? (
        <Text className="mt-2 text-center text-sm text-content-tertiary">{message}</Text>
      ) : null}
      {action ? <View className="mt-6 w-52">{action}</View> : null}
    </View>
  );
}
