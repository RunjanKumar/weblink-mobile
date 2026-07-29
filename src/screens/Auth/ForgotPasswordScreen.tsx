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
  // Tints derived from the theme tokens so they track the scheme.
  const tint = isError ? theme.colors.danger : theme.colors.success;
  return (
    <View
      className="mb-4 flex-row items-center rounded-xl p-3"
      style={{
        backgroundColor: `${tint}1f`,
        borderWidth: 1,
        borderColor: `${tint}66`,
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
  const vm = useForgotPasswordViewModel(route.params?.email);
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
            {vm.step === 'request' ? (
              <>
                <Text className="mb-6 text-sm text-content-tertiary">
                  Enter the email associated with your booking and we’ll send you a 6-digit
                  code to reset your password.
                </Text>

                {vm.infoMessage ? <Banner tone="info" message={vm.infoMessage} /> : null}
                {vm.errorMessage ? <Banner tone="error" message={vm.errorMessage} /> : null}

                <Controller
                  control={vm.requestControl}
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
                      onSubmitEditing={vm.onRequestSubmit}
                      error={vm.requestErrors.email?.message}
                      leftIcon={<Icon name="mail-outline" size={20} color={theme.colors.muted} />}
                      containerClassName="mb-6"
                    />
                  )}
                />

                <Button
                  label="Send code"
                  onPress={vm.onRequestSubmit}
                  loading={vm.isRequesting}
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
              </>
            ) : null}

            {vm.step === 'reset' ? (
              <>
                <Text className="mb-6 text-sm text-content-tertiary">
                  We sent a 6-digit code to {vm.email}. Enter it below along with your new
                  password.
                </Text>

                {vm.infoMessage ? <Banner tone="info" message={vm.infoMessage} /> : null}
                {vm.errorMessage ? <Banner tone="error" message={vm.errorMessage} /> : null}

                <Controller
                  control={vm.resetControl}
                  name="otp"
                  render={({field: {onChange, onBlur, value}}) => (
                    <Input
                      label="Reset code"
                      placeholder="6-digit code"
                      keyboardType="number-pad"
                      inputMode="numeric"
                      maxLength={6}
                      autoCorrect={false}
                      autoComplete="one-time-code"
                      returnKeyType="next"
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      error={vm.resetErrors.otp?.message}
                      leftIcon={<Icon name="keypad-outline" size={20} color={theme.colors.muted} />}
                      containerClassName="mb-4"
                    />
                  )}
                />

                <Controller
                  control={vm.resetControl}
                  name="password"
                  render={({field: {onChange, onBlur, value}}) => (
                    <Input
                      label="New password"
                      placeholder="At least 8 characters"
                      secureTextEntry
                      autoCapitalize="none"
                      autoCorrect={false}
                      returnKeyType="next"
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      error={vm.resetErrors.password?.message}
                      leftIcon={
                        <Icon name="lock-closed-outline" size={20} color={theme.colors.muted} />
                      }
                      containerClassName="mb-4"
                    />
                  )}
                />

                <Controller
                  control={vm.resetControl}
                  name="confirmPassword"
                  render={({field: {onChange, onBlur, value}}) => (
                    <Input
                      label="Confirm new password"
                      placeholder="Re-enter your new password"
                      secureTextEntry
                      autoCapitalize="none"
                      autoCorrect={false}
                      returnKeyType="done"
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      onSubmitEditing={vm.onResetSubmit}
                      error={vm.resetErrors.confirmPassword?.message}
                      leftIcon={
                        <Icon name="lock-closed-outline" size={20} color={theme.colors.muted} />
                      }
                      containerClassName="mb-6"
                    />
                  )}
                />

                <Button
                  label="Reset password"
                  onPress={vm.onResetSubmit}
                  loading={vm.isResetting}
                  fullWidth
                />

                <View className="mt-3">
                  <Button
                    label="Resend code"
                    variant="ghost"
                    onPress={vm.onResend}
                    loading={vm.isRequesting}
                    fullWidth
                  />
                </View>
              </>
            ) : null}

            {vm.step === 'done' ? (
              <>
                <View className="mb-8 items-center">
                  <View className="mb-4 h-16 w-16 items-center justify-center rounded-2xl bg-surface-elevated">
                    <Icon name="checkmark-circle-outline" size={30} color={theme.colors.success} />
                  </View>
                  <Text className="text-xl font-bold text-content">Password updated</Text>
                  <Text className="mt-2 text-center text-sm text-content-tertiary">
                    {vm.successMessage} Sign in with your new password.
                  </Text>
                </View>

                <Button
                  label="Back to login"
                  onPress={() => navigation.navigate('Login')}
                  hasTVPreferredFocus
                  fullWidth
                />
              </>
            ) : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
