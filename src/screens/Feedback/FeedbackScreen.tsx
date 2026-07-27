import React from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Button, Header, StarRating} from '../../components';
import {useFeedbackViewModel} from '../../viewmodels';
import {useTheme} from '../../theme';
import type {HomeStackParamList} from '../../navigation/types';

type Props = NativeStackScreenProps<HomeStackParamList, 'Feedback'>;

export function FeedbackScreen({navigation}: Props) {
  const {theme} = useTheme();
  const {star, setStar, notes, setNotes, submit, isSubmitting, error} = useFeedbackViewModel();

  const onSubmit = () =>
    submit(() => {
      Alert.alert('Thank you!', 'Your feedback has been submitted.', [
        {text: 'OK', onPress: () => navigation.goBack()},
      ]);
    });

  return (
    <SafeAreaView style={{flex: 1, backgroundColor: theme.colors.background}} edges={['top', 'bottom']}>
      <Header title="Rate your stay" onBack={() => navigation.goBack()} />
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{padding: 20}} keyboardShouldPersistTaps="handled">
          <Text className="text-base font-semibold text-content">How was your experience?</Text>
          <Text className="mt-1 text-sm text-content-tertiary">
            Tap a star to rate your stay with us.
          </Text>

          <View className="my-6 items-center">
            <StarRating value={star} onChange={setStar} />
          </View>

          {error ? (
            <View
              className="mb-4 flex-row items-center rounded-xl p-3"
              style={{
                backgroundColor: 'rgba(239,68,68,0.12)',
                borderWidth: 1,
                borderColor: 'rgba(239,68,68,0.4)',
              }}>
              <Icon name="alert-circle" size={18} color={theme.colors.danger} />
              <Text className="ml-2 flex-1 text-sm text-danger">{error}</Text>
            </View>
          ) : null}

          <Text className="mb-2 text-sm font-medium text-content-secondary">
            Share your experience
          </Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Tell us more (optional)"
            placeholderTextColor={theme.colors.muted}
            multiline
            textAlignVertical="top"
            className="rounded-xl bg-surface-elevated px-4 py-3 text-base text-content"
            style={{minHeight: 120, borderWidth: 1.5, borderColor: theme.colors.border}}
          />

          <View className="mt-6">
            <Button
              label="Submit feedback"
              onPress={onSubmit}
              loading={isSubmitting}
              disabled={star === 0}
              fullWidth
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
