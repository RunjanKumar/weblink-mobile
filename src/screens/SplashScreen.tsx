import React from 'react';
import {Text, View} from 'react-native';
import {Loader} from '../components';
import {IS_ANDROID_TV_APP} from '../utils/responsive';

/**
 * Shown while the persisted session is being restored on app start.
 *
 * Not on Android TV: there the app's own black + logo splash stays up until the
 * first real screen has painted (web/index.html), and this light page would
 * flash white in between.
 */
export function SplashScreen() {
  if (IS_ANDROID_TV_APP) {
    return <View style={{flex: 1}} />;
  }
  return (
    <View className="flex-1 items-center justify-center bg-background">
      <Text className="mb-8 text-3xl font-bold text-primary">Weblink</Text>
      <Loader fullscreen={false} label="Loading your stay…" />
    </View>
  );
}
