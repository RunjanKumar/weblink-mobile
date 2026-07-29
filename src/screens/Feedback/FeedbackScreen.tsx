import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Button, Header, StarRating, toast} from '../../components';
import {useFeedbackViewModel} from '../../viewmodels';
import {useTheme} from '../../theme';
import {IS_WEB_BUILD} from '../../utils';
import type {HomeStackParamList} from '../../navigation/types';

type Props = NativeStackScreenProps<HomeStackParamList, 'Feedback'>;

/**
 * Reference Feedback.jsx: bold headline + subtitle, star row, white
 * message box (white in BOTH schemes — deliberate reference look), Submit.
 *
 * On success the form is reset by the viewmodel and a toast fires. The webOS
 * build then returns to the Dashboard (the client does not want the guest left
 * on a blank form on a TV); the Android build stays on the page as before.
 */
export function FeedbackScreen({navigation}: Props) {
  const {theme} = useTheme();
  const {star, setStar, notes, setNotes, submit, isSubmitting, error} = useFeedbackViewModel();

  // Reference surfaces API failures as toasts, not inline banners.
  React.useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  const onSubmit = () =>
    submit(() => {
      toast.success('Thank you for your feedback!');
      if (IS_WEB_BUILD) {
        // Feedback is always pushed from the Dashboard, so this pops back to it.
        navigation.navigate('Dashboard');
      }
    });

  return (
    <SafeAreaView style={{flex: 1, backgroundColor: theme.colors.background}} edges={['top', 'bottom']}>
      <Header title="Feedback" onBack={() => navigation.goBack()} />
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={{padding: 20, flexGrow: 1}}
          keyboardShouldPersistTaps="handled">
          <Text className="text-2xl font-bold leading-tight text-content">
            Rate Your Stay – We Value Your Opinion!
          </Text>
          <Text className="mt-2 text-sm text-content-tertiary">
            Share your thoughts to help us improve your experience.
          </Text>

          <Text className="mb-3 mt-8 text-base font-semibold text-content">Rate your stay</Text>
          <View className="items-start">
            <StarRating value={star} onChange={setStar} />
          </View>

          <Text className="mb-3 mt-8 text-base font-semibold text-content">
            Share Your Experience
          </Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Write your message"
            placeholderTextColor="#9ca3af"
            multiline
            textAlignVertical="top"
            className="rounded-2xl px-4 py-4 text-sm"
            // Reference: white box with dark text in both schemes; hairline
            // border keeps it visible against the light background.
            style={{
              height: 180,
              backgroundColor: '#ffffff',
              color: '#0d0d0d',
              borderWidth: 1,
              borderColor: theme.colors.border,
            }}
          />

          <View className="flex-1" />

          <View className="mt-6">
            <Button label="Submit" onPress={onSubmit} loading={isSubmitting} fullWidth />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
