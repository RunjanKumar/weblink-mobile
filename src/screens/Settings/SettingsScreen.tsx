import React from 'react';
import {ScrollView, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Button, Card, Header} from '../../components';
import {useTheme} from '../../theme';
import {config} from '../../constants/config';
import type {HomeStackParamList} from '../../navigation/types';

type Props = NativeStackScreenProps<HomeStackParamList, 'Settings'>;

export function SettingsScreen({navigation}: Props) {
  const {theme, scheme, toggleScheme} = useTheme();

  return (
    <SafeAreaView style={{flex: 1, backgroundColor: theme.colors.background}} edges={['top']}>
      <Header title="Settings" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{paddingHorizontal: 20, paddingBottom: 32}}>
        <Card>
          <View className="flex-row items-center">
            <Icon
              name={scheme === 'dark' ? 'moon-outline' : 'sunny-outline'}
              size={22}
              color={theme.colors.primary}
            />
            <View className="ml-3 flex-1">
              <Text className="text-base font-semibold text-content">Appearance</Text>
              <Text className="text-sm text-content-tertiary">
                {scheme === 'dark' ? 'Dark mode' : 'Light mode'}
              </Text>
            </View>
          </View>
          <View className="mt-4">
            <Button
              label={scheme === 'dark' ? 'Switch to light' : 'Switch to dark'}
              variant="secondary"
              onPress={toggleScheme}
              fullWidth
            />
          </View>
        </Card>

        <View className="mt-6 items-center">
          <Text className="text-xs text-content-tertiary">
            Weblink · {config.appEnv} · v0.1.0
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
