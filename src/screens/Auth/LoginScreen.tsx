import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Controller} from 'react-hook-form';
import Icon from 'react-native-vector-icons/Ionicons';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Button, Input} from '../../components';
import {useLoginViewModel} from '../../viewmodels/LoginViewModel';
import {useResponsive} from '../../hooks/useResponsive';
import {useTVFocus} from '../../hooks/useTVFocus';
import {useTheme} from '../../theme';
import type {AuthStackParamList} from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

/** Focusable "Forgot password?" link with a TV focus underline. */
function ForgotLink({onPress}: {onPress: () => void}) {
  const {theme} = useTheme();
  const {focused, onFocus, onBlur} = useTVFocus();
  return (
    <Pressable
      onPress={onPress}
      onFocus={onFocus}
      onBlur={onBlur}
      focusable
      hitSlop={8}
      accessibilityRole="button"
      className="self-end rounded-md px-1 py-2"
      style={{borderBottomWidth: focused ? 2 : 0, borderColor: theme.colors.focusRing}}>
      <Text className="text-sm font-medium text-primary">Forgot password?</Text>
    </Pressable>
  );
}

export function LoginScreen({navigation}: Props) {
  const {theme} = useTheme();
  const {control, errors, isSubmitting, formError, onSubmit} = useLoginViewModel();
  const {select} = useResponsive();
  const maxWidth = select({phone: 460, tablet: 520, tv: 560});

  return (
    <SafeAreaView style={{flex: 1, backgroundColor: theme.colors.background}} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: 'center',
            paddingHorizontal: 24,
            paddingVertical: 40,
          }}
          keyboardShouldPersistTaps="handled">
          <View className="w-full self-center" style={{maxWidth}}>
            {/* Brand / heading */}
            <View className="mb-8 items-center">
              <View className="mb-4 h-16 w-16 items-center justify-center rounded-2xl bg-surface-elevated">
                <Icon name="business-outline" size={30} color={theme.colors.primary} />
              </View>
              <Text className="text-2xl font-bold text-content">Welcome back</Text>
              <Text className="mt-2 text-center text-sm text-content-tertiary">
                Sign in to access your stay and in-room services.
              </Text>
            </View>

            {formError ? (
              <View
                className="mb-4 flex-row items-center rounded-xl p-3"
                style={{
                  // Tint derived from the theme's danger so it tracks the scheme.
                  backgroundColor: `${theme.colors.danger}1f`,
                  borderWidth: 1,
                  borderColor: `${theme.colors.danger}66`,
                }}>
                <Icon name="alert-circle" size={18} color={theme.colors.danger} />
                <Text className="ml-2 flex-1 text-sm text-danger">{formError}</Text>
              </View>
            ) : null}

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
                  returnKeyType="next"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.email?.message}
                  leftIcon={<Icon name="mail-outline" size={20} color={theme.colors.muted} />}
                  containerClassName="mb-4"
                />
              )}
            />

            <Controller
              control={control}
              name="password"
              render={({field: {onChange, onBlur, value}}) => (
                <Input
                  label="Password"
                  placeholder="Enter your password"
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="done"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  onSubmitEditing={onSubmit}
                  error={errors.password?.message}
                  leftIcon={
                    <Icon name="lock-closed-outline" size={20} color={theme.colors.muted} />
                  }
                  containerClassName="mb-2"
                />
              )}
            />

            <View className="mb-6">
              <ForgotLink onPress={() => navigation.navigate('ForgotPassword', {})} />
            </View>

            <Button
              label="Login"
              onPress={onSubmit}
              loading={isSubmitting}
              hasTVPreferredFocus
              fullWidth
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
