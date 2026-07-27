import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Controller} from 'react-hook-form';
import Icon from 'react-native-vector-icons/Ionicons';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Button, Header, Input} from '../../components';
import {useForgotPasswordViewModel} from '../../viewmodels/ForgotPasswordViewModel';
import {useResponsive} from '../../hooks/useResponsive';
import {useTheme} from '../../theme';
import type {AuthStackParamList} from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'ForgotPassword'>;

function Banner({
  tone,
  message,
}: {
  tone: 'info' | 'error';
  message: string;
}) {
  const {theme} = useTheme();
  const isError = tone === 'error';
  return (
    <View
      className="mb-4 flex-row items-center rounded-xl p-3"
      style={{
        backgroundColor: isError ? 'rgba(239,68,68,0.12)' : 'rgba(34,197,94,0.12)',
        borderWidth: 1,
        borderColor: isError ? 'rgba(239,68,68,0.4)' : 'rgba(34,197,94,0.4)',
      }}>
      <Icon
        name={isError ? 'alert-circle' : 'checkmark-circle'}
        size={18}
        color={isError ? theme.colors.danger : theme.colors.success}
      />
      <Text
        className="ml-2 flex-1 text-sm"
        style={{color: isError ? theme.colors.danger : theme.colors.success}}>
        {message}
      </Text>
    </View>
  );
}

export function ForgotPasswordScreen({navigation, route}: Props) {
  const {control, errors, isSubmitting, infoMessage, errorMessage, onSubmit} =
    useForgotPasswordViewModel(route.params?.email);
  const {theme} = useTheme();
  const {select} = useResponsive();
  const maxWidth = select({phone: 460, tablet: 520, tv: 560});

  return (
    <SafeAreaView style={{flex: 1, backgroundColor: theme.colors.background}} edges={['top', 'bottom']}>
      <Header title="Reset password" onBack={() => navigation.goBack()} />
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: 'center',
            paddingHorizontal: 24,
            paddingVertical: 24,
          }}
          keyboardShouldPersistTaps="handled">
          <View className="w-full self-center" style={{maxWidth}}>
            <Text className="mb-6 text-sm text-content-tertiary">
              Enter the email associated with your booking and we’ll send you a link to reset
              your password.
            </Text>

            {infoMessage ? <Banner tone="info" message={infoMessage} /> : null}
            {errorMessage ? <Banner tone="error" message={errorMessage} /> : null}

            <Controller
              control={control}
              name="email"
              render={({field: {onChange, onBlur, value}}) => (
                <Input
                  label="Email"
                  placeholder="you@example.com"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                  keyboardType="email-address"
                  inputMode="email"
                  returnKeyType="send"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  onSubmitEditing={onSubmit}
                  error={errors.email?.message}
                  leftIcon={<Icon name="mail-outline" size={20} color={theme.colors.muted} />}
                  containerClassName="mb-6"
                />
              )}
            />

            <Button
              label="Send reset link"
              onPress={onSubmit}
              loading={isSubmitting}
              fullWidth
            />

            <View className="mt-3">
              <Button
                label="Back to login"
                variant="ghost"
                onPress={() => navigation.goBack()}
                fullWidth
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
