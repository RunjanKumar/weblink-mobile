import React from 'react';
import {ScrollView, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import {Card, EmptyState, Header} from '../../components';
import {useBookingViewModel} from '../../viewmodels/BookingViewModel';
import {useTheme} from '../../theme';

function formatDate(value?: string): string {
  if (!value) {
    return '—';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }
  return date.toLocaleDateString(undefined, {day: 'numeric', month: 'short', year: 'numeric'});
}

function Row({icon, label, value}: {icon: string; label: string; value: string}) {
  const {theme} = useTheme();
  return (
    <View className="flex-row items-center py-3">
      <Icon name={icon} size={20} color={theme.colors.primary} />
      <Text className="ml-3 flex-1 text-sm text-content-tertiary">{label}</Text>
      <Text className="text-sm font-semibold text-content">{value}</Text>
    </View>
  );
}

export function BookingScreen() {
  const {theme} = useTheme();
  const {booking, hotel, room} = useBookingViewModel();

  return (
    <SafeAreaView style={{flex: 1, backgroundColor: theme.colors.background}} edges={['top']}>
      <Header title="Your booking" subtitle={hotel?.name} />
      {booking ? (
        <ScrollView contentContainerStyle={{paddingHorizontal: 20, paddingBottom: 32}}>
          <Card>
            <Row
              icon="bed-outline"
              label="Room"
              value={room?.roomNumber != null ? String(room.roomNumber) : '—'}
            />
            <View className="h-px bg-border" />
            <Row icon="log-in-outline" label="Check-in" value={formatDate(booking.checkInDate)} />
            <View className="h-px bg-border" />
            <Row
              icon="log-out-outline"
              label="Check-out"
              value={formatDate(booking.checkOutDate)}
            />
          </Card>
        </ScrollView>
      ) : (
        <EmptyState
          icon="calendar-outline"
          title="No active stay"
          message="Your current booking details will appear here once you’re checked in."
        />
      )}
    </SafeAreaView>
  );
}
