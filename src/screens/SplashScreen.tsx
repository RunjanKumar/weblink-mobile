import React from 'react';
import {Text, View} from 'react-native';
import {Loader} from '../components';

/** Shown while the persisted session is being restored on app start. */
export function SplashScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-background">
      <Text className="mb-8 text-3xl font-bold text-primary">Weblink</Text>
      <Loader fullscreen={false} label="Loading your stay…" />
    </View>
  );
}
