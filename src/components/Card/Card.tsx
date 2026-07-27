import React from 'react';
import {View, type ViewProps} from 'react-native';

export interface CardProps extends ViewProps {
  className?: string;
}

export function Card({className = '', children, ...rest}: CardProps) {
  return (
    <View className={`rounded-2xl border border-border bg-surface p-4 ${className}`} {...rest}>
      {children}
    </View>
  );
}
