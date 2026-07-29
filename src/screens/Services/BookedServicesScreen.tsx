import React from 'react';
import {RefreshControl, ScrollView, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Button, Card, ErrorState, Header, Loader, RefreshButton} from '../../components';
import {IS_TV} from '../../utils/responsive';
import {useBookedServicesViewModel} from '../../viewmodels';
import {useTheme, useStatusTones, type StatusTone} from '../../theme';
import {BOOKING_STATUS, BOOKING_STATUS_TONES, BOOKING_STATUS_LABELS} from '../../constants/status';
import {formatDateTime} from '../../utils/format';
import type {BookedService} from '../../models/service.model';
import type {HomeStackParamList} from '../../navigation/types';

type Props = NativeStackScreenProps<HomeStackParamList, 'ServiceBooked'>;

/** Reference heading tints: Pending=yellow, In Progress=blue, Completed=green, Cancelled=red. */
const GROUP_TONES: Record<string, StatusTone> = {
  pending: 'warning',
  inProgress: 'info',
  completed: 'success',
  cancelled: 'danger',
};

function StatusBadge({status}: {status?: number}) {
  const tones = useStatusTones();
  const color = tones[(status != null ? BOOKING_STATUS_TONES[status] : undefined) ?? 'muted'];
  const label = status != null ? BOOKING_STATUS_LABELS[status] ?? 'Unknown' : 'Unknown';
  return (
    <View
      className="rounded-md px-3 py-1"
      style={{backgroundColor: `${color}22`, borderWidth: 1, borderColor: `${color}66`}}>
      <Text style={{color, fontSize: 11, fontWeight: '600'}}>{label}</Text>
    </View>
  );
}

/**
 * Reference BookedServiceCard: name + timestamp on top, description,
 * italic "Details :" line, status badge bottom-right; finished cards dim.
 */
function BookedCard({item}: {item: BookedService}) {
  const finished =
    item.status === BOOKING_STATUS.COMPLETED || item.status === BOOKING_STATUS.CANCEL;
  return (
    <Card className="mb-3" style={{opacity: finished ? 0.5 : 1}}>
      <View className="flex-row items-start justify-between">
        <Text className="flex-1 pr-2 text-sm font-semibold text-content">
          {item.name ?? 'Service'}
        </Text>
        {item.requestedAt ? (
          <Text className="text-xs text-content-tertiary">{formatDateTime(item.requestedAt)}</Text>
        ) : null}
      </View>
      {item.description ? (
        <Text className="mt-1 text-xs text-content-tertiary">{item.description}</Text>
      ) : null}
      {item.details ? (
        <Text className="mt-1.5 text-xs italic text-primary">Details : {item.details}</Text>
      ) : null}
      <View className="mt-3 flex-row justify-end">
        <StatusBadge status={item.status} />
      </View>
    </Card>
  );
}

export function BookedServicesScreen({navigation}: Props) {
  const {theme} = useTheme();
  const tones = useStatusTones();
  const vm = useBookedServicesViewModel();

  return (
    <SafeAreaView style={{flex: 1, backgroundColor: theme.colors.background}} edges={['top']}>
      <Header
        title="Service Request"
        onBack={() => navigation.goBack()}
        right={
          <RefreshButton
            onPress={vm.refetch}
            busy={vm.isRefetching}
            accessibilityLabel="Refresh service requests"
          />
        }
      />

      {vm.isLoading ? (
        <Loader label="Loading requests…" />
      ) : vm.error ? (
        <ErrorState message={vm.error} onRetry={vm.refetch} />
      ) : (
        <>
          {vm.isEmpty ? (
            <View className="flex-1 items-center justify-center">
              <Text className="text-sm text-content-tertiary">No service requests</Text>
            </View>
          ) : (
            <ScrollView
              contentContainerStyle={{paddingHorizontal: 20, paddingBottom: 16}}
              // No pull gesture exists on a remote — TV refreshes from the
              // header button instead.
              refreshControl={
                IS_TV ? undefined : (
                  <RefreshControl
                    refreshing={vm.isRefetching}
                    onRefresh={vm.refetch}
                    tintColor={theme.colors.primary}
                    colors={[theme.colors.primary]}
                  />
                )
              }>
              {vm.groups.map(group => (
                <View key={group.key} className="mb-4">
                  <Text
                    className="mb-3 text-sm font-semibold"
                    style={{color: tones[GROUP_TONES[group.key] ?? 'muted']}}>
                    {group.title}
                  </Text>
                  {group.items.map(item => (
                    <BookedCard key={item._id} item={item} />
                  ))}
                </View>
              ))}
            </ScrollView>
          )}

          {/* Reference: persistent bottom CTA back to the catalog. */}
          <View className="border-t border-border px-5 pb-6 pt-3">
            <Button
              label="Add New Request"
              onPress={() => navigation.navigate('Services')}
              fullWidth
            />
          </View>
        </>
      )}
    </SafeAreaView>
  );
}
