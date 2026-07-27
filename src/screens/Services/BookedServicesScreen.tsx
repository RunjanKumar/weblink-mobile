import React from 'react';
import {RefreshControl, ScrollView, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Button, Card, EmptyState, ErrorState, Header, Loader} from '../../components';
import {useBookedServicesViewModel} from '../../viewmodels';
import {useTheme} from '../../theme';
import {BOOKING_STATUS_COLORS, BOOKING_STATUS_LABELS} from '../../constants/status';
import {formatDateTime} from '../../utils/format';
import type {BookedService} from '../../models/service.model';
import type {HomeStackParamList} from '../../navigation/types';

type Props = NativeStackScreenProps<HomeStackParamList, 'ServiceBooked'>;

function StatusBadge({status}: {status?: number}) {
  const color = status != null ? BOOKING_STATUS_COLORS[status] ?? '#6b7280' : '#6b7280';
  const label = status != null ? BOOKING_STATUS_LABELS[status] ?? 'Unknown' : 'Unknown';
  return (
    <View
      className="self-start rounded-full px-2.5 py-1"
      style={{backgroundColor: `${color}22`, borderWidth: 1, borderColor: `${color}66`}}>
      <Text style={{color, fontSize: 11, fontWeight: '600'}}>{label}</Text>
    </View>
  );
}

function BookedCard({item}: {item: BookedService}) {
  return (
    <Card className="mb-3">
      <View className="flex-row items-start justify-between">
        <Text className="flex-1 pr-2 text-sm font-bold text-content">{item.name ?? 'Service'}</Text>
        <StatusBadge status={item.status} />
      </View>
      {item.details || item.description ? (
        <Text className="mt-1 text-xs text-content-tertiary">{item.details || item.description}</Text>
      ) : null}
      {item.requestedAt ? (
        <Text className="mt-2 text-[11px] text-content-tertiary">
          {formatDateTime(item.requestedAt)}
        </Text>
      ) : null}
    </Card>
  );
}

export function BookedServicesScreen({navigation}: Props) {
  const {theme} = useTheme();
  const vm = useBookedServicesViewModel();

  return (
    <SafeAreaView style={{flex: 1, backgroundColor: theme.colors.background}} edges={['top']}>
      <Header title="Request history" onBack={() => navigation.goBack()} />

      {vm.isLoading ? (
        <Loader label="Loading requests…" />
      ) : vm.error ? (
        <ErrorState message={vm.error} onRetry={vm.refetch} />
      ) : vm.isEmpty ? (
        <EmptyState
          icon="document-text-outline"
          title="No service requests"
          message="Requests you make will appear here."
          action={
            <Button
              label="New request"
              variant="secondary"
              onPress={() => navigation.navigate('Services')}
              fullWidth
            />
          }
        />
      ) : (
        <ScrollView
          contentContainerStyle={{paddingHorizontal: 20, paddingBottom: 24}}
          refreshControl={
            <RefreshControl
              refreshing={vm.isRefetching}
              onRefresh={vm.refetch}
              tintColor={theme.colors.primary}
              colors={[theme.colors.primary]}
            />
          }>
          {vm.groups.map(group => (
            <View key={group.key} className="mb-4">
              <Text className="mb-2 text-sm font-bold text-content-secondary">{group.title}</Text>
              {group.items.map(item => (
                <BookedCard key={item._id} item={item} />
              ))}
            </View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
