import React from 'react';
import {RefreshControl, ScrollView, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Button, Card, EmptyState, ErrorState, Header, Loader} from '../../components';
import {useBookedFacilityViewModel} from '../../viewmodels';
import {useTheme} from '../../theme';
import {FACILITY_STATUS_COLORS, FACILITY_STATUS_LABELS} from '../../constants/status';
import {formatDateTime} from '../../utils/format';
import type {FacilityReservation} from '../../models/facility.model';
import type {HomeStackParamList} from '../../navigation/types';

type Props = NativeStackScreenProps<HomeStackParamList, 'FacilityBookings'>;

function StatusBadge({status}: {status?: number}) {
  const color = status != null ? FACILITY_STATUS_COLORS[status] ?? '#6b7280' : '#6b7280';
  const label = status != null ? FACILITY_STATUS_LABELS[status] ?? 'Unknown' : 'Unknown';
  return (
    <View
      className="self-start rounded-full px-2.5 py-1"
      style={{backgroundColor: `${color}22`, borderWidth: 1, borderColor: `${color}66`}}>
      <Text style={{color, fontSize: 11, fontWeight: '600'}}>{label}</Text>
    </View>
  );
}

function BookingCard({item}: {item: FacilityReservation}) {
  const {theme} = useTheme();
  return (
    <Card className="mb-3">
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-2">
          <Text className="text-sm font-bold text-content">{item.facilityName ?? 'Facility'}</Text>
          {item.facilityTypeName ? (
            <Text className="text-xs text-content-tertiary">{item.facilityTypeName}</Text>
          ) : null}
        </View>
        <StatusBadge status={item.status} />
      </View>
      <View className="mt-3 flex-row items-center">
        <Icon name="calendar-outline" size={14} color={theme.colors.muted} />
        <Text className="ml-2 text-xs text-content-secondary">{formatDateTime(item.bookingDate)}</Text>
      </View>
      {item.numberOfGuests != null ? (
        <View className="mt-1 flex-row items-center">
          <Icon name="people-outline" size={14} color={theme.colors.muted} />
          <Text className="ml-2 text-xs text-content-secondary">
            {item.numberOfGuests} guest{item.numberOfGuests === 1 ? '' : 's'}
          </Text>
        </View>
      ) : null}
    </Card>
  );
}

export function FacilityBookingsScreen({navigation}: Props) {
  const {theme} = useTheme();
  const vm = useBookedFacilityViewModel();

  return (
    <SafeAreaView style={{flex: 1, backgroundColor: theme.colors.background}} edges={['top']}>
      <Header title="My bookings" onBack={() => navigation.goBack()} />

      {vm.isLoading ? (
        <Loader label="Loading bookings…" />
      ) : vm.error ? (
        <ErrorState message={vm.error} onRetry={vm.refetch} />
      ) : vm.isEmpty ? (
        <EmptyState
          icon="calendar-outline"
          title="No bookings yet"
          message="Reserve a facility and it will show up here."
          action={
            <Button
              label="Browse facilities"
              variant="secondary"
              onPress={() => navigation.navigate('Facilities')}
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
                <BookingCard key={item._id} item={item} />
              ))}
            </View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
