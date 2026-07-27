import React from 'react';
import {Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Button, Header} from '../../components';
import {useTheme} from '../../theme';
import type {HomeStackParamList} from '../../navigation/types';

type Props = NativeStackScreenProps<HomeStackParamList, 'Reception'>;

/** Static reception landing — continues into the live chat with reception. */
export function ReceptionScreen({navigation}: Props) {
  const {theme} = useTheme();
  return (
    <SafeAreaView style={{flex: 1, backgroundColor: theme.colors.background}} edges={['top', 'bottom']}>
      <Header title="Reception" onBack={() => navigation.goBack()} />
      <View className="flex-1 items-center justify-center px-8">
        <View className="mb-6 h-24 w-24 items-center justify-center rounded-full bg-surface-elevated">
          <Icon name="headset-outline" size={44} color={theme.colors.primary} />
        </View>
        <Text className="text-center text-2xl font-bold text-content">
          Contact the Hotel Receptionist
        </Text>
        <Text className="mt-3 text-center text-sm leading-5 text-content-tertiary">
          Have a question or a request? Chat directly with our reception team and we'll be happy to
          help you during your stay.
        </Text>
        <View className="mt-8 w-full max-w-[360px]">
          <Button
            label="Continue to chat"
            onPress={() => navigation.navigate('Chat')}
            fullWidth
            leftIcon={<Icon name="chatbubbles-outline" size={18} color={theme.colors.primaryForeground} />}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}
