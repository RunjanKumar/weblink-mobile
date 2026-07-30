import React from 'react';
import {RefreshControl, ScrollView, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Button, EmptyState, ErrorState, Header, Loader, RefreshButton} from '../../components';
import {useBookedFacilityViewModel} from '../../viewmodels';
import {useTheme, useStatusTones} from '../../theme';
import {IS_TV} from '../../utils/responsive';
import {FACILITY_STATUS_TONES, FACILITY_STATUS_LABELS} from '../../constants/status';
// Shared with the TV frames — see the note on the function for why the time is
// read out of the raw string instead of through `Date`.
import {formatBookingDateTime} from '../../utils/format';
import type {FacilityReservation} from '../../models/facility.model';
import type {HomeStackParamList} from '../../navigation/types';

type Props = NativeStackScreenProps<HomeStackParamList, 'FacilityBookings'>;

/** Reference `EventInfoRow.jsx`: icon + text row with a bottom hairline. */
function EventInfoRow({
  icon,
  children,
  color,
  last,
}: {
  icon: string;
  children: React.ReactNode;
  color?: string;
  last?: boolean;
}) {
  const {theme} = useTheme();
  return (
    <View
      className="flex-row items-center"
      style={{
        gap: 12,
        paddingVertical: 10,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: theme.colors.border,
      }}>
      <Icon name={icon} size={18} color={theme.colors.primary} />
      <Text
        style={{
          flex: 1,
          color: color ?? theme.colors.textSecondary,
          fontSize: IS_TV ? 16 : 14,
          fontWeight: color ? '600' : '400',
        }}>
        {children}
      </Text>
    </View>
  );
}

/** Reference `BookingCard.jsx`: five stacked info rows, no header/badge. */
function BookingCard({item}: {item: FacilityReservation}) {
  const {theme} = useTheme();
  const tones = useStatusTones();
  const statusColor =
    tones[(item.status != null ? FACILITY_STATUS_TONES[item.status] : undefined) ?? 'muted'];
  const statusLabel =
    item.status != null ? FACILITY_STATUS_LABELS[item.status] ?? 'Unknown' : 'Unknown';
  const guests = item.numberOfGuests ?? 0;

  return (
    <View
      style={{
        borderRadius: 16,
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.surface,
        paddingHorizontal: 16,
        paddingVertical: 4,
        marginBottom: 14,
      }}>
      <EventInfoRow icon="calendar-outline">{formatBookingDateTime(item.bookingDate)}</EventInfoRow>
      <EventInfoRow icon="people-outline">
        {guests} {guests === 1 ? 'guest' : 'guests'}
      </EventInfoRow>
      <EventInfoRow icon="location-outline">{item.facilityName ?? '—'}</EventInfoRow>
      <EventInfoRow icon="business-outline">{item.facilityTypeName ?? '—'}</EventInfoRow>
      <EventInfoRow icon="information-circle-outline" color={statusColor} last>
        {statusLabel}
      </EventInfoRow>
    </View>
  );
}

/**
 * Reference `UpcomingEvents.jsx`: title "Upcoming events", ONE flat list
 * (cancelled excluded), and a persistent "New Booking" CTA at the bottom.
 */
export function FacilityBookingsScreen({navigation}: Props) {
  const {theme} = useTheme();
  const vm = useBookedFacilityViewModel();

  return (
    <SafeAreaView style={{flex: 1, backgroundColor: theme.colors.background}} edges={['top', 'bottom']}>
      <Header
        title="Upcoming events"
        onBack={() => navigation.goBack()}
        right={
          <RefreshButton
            onPress={vm.refetch}
            busy={vm.isRefetching}
            accessibilityLabel="Refresh events"
          />
        }
      />

      {vm.isLoading ? (
        <Loader label="Loading bookings…" />
      ) : vm.error ? (
        <ErrorState message={vm.error} onRetry={vm.refetch} />
      ) : (
        <>
          {vm.isEmpty ? (
            <EmptyState
              icon="calendar-outline"
              title="No upcoming events"
              message="Your facility reservations will appear here."
            />
          ) : (
            <ScrollView
              contentContainerStyle={{paddingHorizontal: 20, paddingBottom: 16, paddingTop: 8}}
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
              {vm.reservations.map(item => (
                <BookingCard key={item._id} item={item} />
              ))}
            </ScrollView>
          )}

          {/* Persistent CTA (reference) — rendered regardless of list state */}
          <View
            style={{
              paddingHorizontal: 20,
              paddingVertical: 14,
              borderTopWidth: 1,
              borderTopColor: theme.colors.border,
              backgroundColor: theme.colors.surfaceElevated,
            }}>
            <Button
              label="New Booking"
              onPress={() => navigation.navigate('Facilities')}
              fullWidth
            />
          </View>
        </>
      )}
    </SafeAreaView>
  );
}
