import React from 'react';
import {ScrollView, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Button, Header} from '../../components';
import {useTheme} from '../../theme';
import type {HomeStackParamList} from '../../navigation/types';

type Props = NativeStackScreenProps<HomeStackParamList, 'Reception'>;

/**
 * Reference Reception.jsx: left-aligned headline + welcome copy, centered
 * illustration, bottom "Continue" CTA into the live reception chat.
 */
export function ReceptionScreen({navigation}: Props) {
  const {theme} = useTheme();
  return (
    <SafeAreaView style={{flex: 1, backgroundColor: theme.colors.background}} edges={['top', 'bottom']}>
      <Header title="Reception" />
      <ScrollView contentContainerStyle={{flexGrow: 1, paddingHorizontal: 20, paddingBottom: 24}}>
        <Text className="text-2xl font-bold leading-tight text-content">
          Contact the Hotel{'\n'}Receptionist
        </Text>
        <Text className="mt-3 text-sm leading-6 text-content-tertiary">
          We hope you're enjoying your stay with us! Our team is dedicated to ensuring your comfort
          and satisfaction throughout your time here. If you have any questions, doubts, or require
          assistance with anything at all, please don't hesitate to reach out to us
        </Text>

        <View className="my-6 flex-1 items-center justify-center">
          <View className="h-32 w-32 items-center justify-center rounded-full bg-surface-elevated">
            <Icon name="headset-outline" size={56} color={theme.colors.primary} />
          </View>
        </View>

        <Button
          label="Continue"
          onPress={() =>
            (navigation as unknown as {navigate: (name: string, params?: object) => void}).navigate(
              'Home',
              {screen: 'Chat'},
            )
          }
          fullWidth
          leftIcon={
            <Icon name="arrow-forward" size={18} color={theme.colors.primaryForeground} />
          }
        />
      </ScrollView>
    </SafeAreaView>
  );
}
