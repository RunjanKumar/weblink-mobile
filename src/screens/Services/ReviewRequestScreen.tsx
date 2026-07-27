import React from 'react';
import {Alert, Pressable, ScrollView, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Button, Card, EmptyState, Header, Loader} from '../../components';
import {useReviewRequestViewModel} from '../../viewmodels';
import {useTheme} from '../../theme';
import {getApiErrorMessage} from '../../utils/errorHandler';
import type {HomeStackParamList} from '../../navigation/types';

type Props = NativeStackScreenProps<HomeStackParamList, 'ServiceReview'>;

export function ReviewRequestScreen({navigation}: Props) {
  const {theme} = useTheme();
  const vm = useReviewRequestViewModel();

  const onSend = () => {
    vm.submit()
      .then(() => {
        Alert.alert('Request sent', 'Your service request has been submitted.', [
          {text: 'OK', onPress: () => navigation.navigate('ServiceBooked')},
        ]);
      })
      .catch(error => {
        Alert.alert('Error', getApiErrorMessage(error, 'Failed to submit request.'));
      });
  };

  if (vm.isLoading) {
    return (
      <SafeAreaView style={{flex: 1, backgroundColor: theme.colors.background}} edges={['top']}>
        <Header title="Review request" onBack={() => navigation.goBack()} />
        <Loader label="Loading…" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{flex: 1, backgroundColor: theme.colors.background}} edges={['top']}>
      <Header title="Review request" onBack={() => navigation.goBack()} />

      {vm.grouped.length === 0 ? (
        <EmptyState
          icon="cart-outline"
          title="No services selected"
          message="Go back and add the services you'd like to request."
          action={<Button label="Browse services" variant="secondary" onPress={() => navigation.goBack()} fullWidth />}
        />
      ) : (
        <>
          <ScrollView contentContainerStyle={{paddingHorizontal: 20, paddingBottom: 24}}>
            {vm.grouped.map(cat => (
              <View key={cat._id} className="mb-4">
                <Text className="mb-2 text-sm font-bold text-content-secondary">{cat.name}</Text>
                <Card>
                  {cat.subcategories.map((sub, idx) => {
                    const detail = vm.getDetail(sub._id);
                    return (
                      <View
                        key={sub._id}
                        className={idx > 0 ? 'border-t border-border pt-3 mt-3' : ''}>
                        <View className="flex-row items-center justify-between">
                          <Text className="flex-1 pr-2 text-sm font-medium text-content">
                            {sub.name}
                          </Text>
                          <Pressable
                            onPress={() => vm.remove(sub._id)}
                            focusable
                            hitSlop={8}
                            accessibilityRole="button"
                            accessibilityLabel={`Remove ${sub.name ?? 'service'}`}>
                            <Icon name="trash-outline" size={18} color={theme.colors.danger} />
                          </Pressable>
                        </View>
                        {detail ? (
                          <Text className="mt-1 text-xs text-content-tertiary">{detail}</Text>
                        ) : null}
                        <Pressable
                          onPress={() =>
                            navigation.navigate('ServiceAddDetails', {
                              subCategoryId: sub._id,
                              subCategoryName: sub.name,
                            })
                          }
                          focusable
                          accessibilityRole="button"
                          className="mt-2 self-start">
                          <Text className="text-xs font-semibold text-primary">
                            {detail ? 'Edit details' : 'Add details'}
                          </Text>
                        </Pressable>
                      </View>
                    );
                  })}
                </Card>
              </View>
            ))}
          </ScrollView>

          <View className="border-t border-border px-5 pb-6 pt-3">
            <Button label="Send request" onPress={onSend} loading={vm.isSubmitting} fullWidth />
          </View>
        </>
      )}
    </SafeAreaView>
  );
}
