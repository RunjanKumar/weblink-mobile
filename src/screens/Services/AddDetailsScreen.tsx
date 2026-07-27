import React, {useState} from 'react';
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
import {Button, Header} from '../../components';
import {useServiceRequest} from '../../store/ServiceRequestContext';
import {useTheme} from '../../theme';
import type {HomeStackParamList} from '../../navigation/types';

type Props = NativeStackScreenProps<HomeStackParamList, 'ServiceAddDetails'>;

export function AddDetailsScreen({navigation, route}: Props) {
  const {theme} = useTheme();
  const {subCategoryId, subCategoryName} = route.params;
  const {getDetail, setDetail} = useServiceRequest();
  const [text, setText] = useState(() => getDetail(subCategoryId));

  const onDone = () => {
    setDetail(subCategoryId, text.trim());
    navigation.goBack();
  };

  return (
    <SafeAreaView style={{flex: 1, backgroundColor: theme.colors.background}} edges={['top', 'bottom']}>
      <Header title="Add details" onBack={() => navigation.goBack()} />
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{padding: 20}} keyboardShouldPersistTaps="handled">
          {subCategoryName ? (
            <View className="mb-4 self-start rounded-full bg-surface-elevated px-3 py-1.5">
              <Text className="text-xs font-semibold text-primary">{subCategoryName}</Text>
            </View>
          ) : null}

          <Text className="mb-2 text-sm font-medium text-content-secondary">Description</Text>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Add any specific instructions (optional)"
            placeholderTextColor={theme.colors.muted}
            multiline
            autoFocus
            textAlignVertical="top"
            className="rounded-xl bg-surface-elevated px-4 py-3 text-base text-content"
            style={{minHeight: 140, borderWidth: 1.5, borderColor: theme.colors.border}}
          />

          <View className="mt-6">
            <Button label="Done" onPress={onDone} fullWidth />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
