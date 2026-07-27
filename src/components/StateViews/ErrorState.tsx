import React from 'react';
import {Text, View} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {useTheme} from '../../theme';
import {Button} from '../Button';

export interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
}

export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
  retryLabel = 'Try again',
}: ErrorStateProps) {
  const {theme} = useTheme();
  return (
    <View className="flex-1 items-center justify-center px-8">
      <Icon name="alert-circle-outline" size={52} color={theme.colors.danger} />
      <Text className="mt-4 text-center text-lg font-semibold text-content">{title}</Text>
      {message ? (
        <Text className="mt-2 text-center text-sm text-content-tertiary">{message}</Text>
      ) : null}
      {onRetry ? (
        <View className="mt-6 w-52">
          <Button
            label={retryLabel}
            variant="secondary"
            onPress={onRetry}
            hasTVPreferredFocus
            leftIcon={<Icon name="refresh" size={18} color={theme.colors.primary} />}
          />
        </View>
      ) : null}
    </View>
  );
}
