import React, {useState} from 'react';
import {Alert, Pressable, ScrollView, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import DateTimePicker from '@react-native-community/datetimepicker';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Button, Card, Header} from '../../components';
import {useReserveFacilityViewModel} from '../../viewmodels';
import {useTVFocus} from '../../hooks/useTVFocus';
import {useTheme} from '../../theme';
import {formatDateTime} from '../../utils/format';
import {getApiErrorMessage} from '../../utils/errorHandler';
import type {HomeStackParamList} from '../../navigation/types';

type Props = NativeStackScreenProps<HomeStackParamList, 'FacilityReserve'>;

function PeopleChip({value, active, onPress}: {value: number; active: boolean; onPress: () => void}) {
  const {theme} = useTheme();
  const {focused, onFocus, onBlur} = useTVFocus();
  return (
    <Pressable
      onPress={onPress}
      onFocus={onFocus}
      onBlur={onBlur}
      focusable
      accessibilityRole="button"
      accessibilityLabel={`${value} guests`}
      style={{
        width: 48,
        height: 48,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        margin: 4,
        backgroundColor: active ? theme.colors.primary : theme.colors.surfaceElevated,
        borderWidth: 2,
        borderColor: focused ? theme.colors.focusRing : 'transparent',
      }}>
      <Text
        style={{
          color: active ? theme.colors.primaryForeground : theme.colors.textSecondary,
          fontWeight: '700',
        }}>
        {value}
      </Text>
    </Pressable>
  );
}

export function FacilityReserveScreen({navigation, route}: Props) {
  const {theme} = useTheme();
  const {facility} = route.params;
  const vm = useReserveFacilityViewModel(facility);
  const [pickerMode, setPickerMode] = useState<'date' | 'time' | null>(null);

  const onPickerChange = (event: {type?: string}, selected?: Date) => {
    if (event.type === 'dismissed' || !selected) {
      setPickerMode(null);
      return;
    }
    const base = vm.bookingDate ?? new Date();
    if (pickerMode === 'date') {
      const merged = new Date(selected);
      merged.setHours(base.getHours(), base.getMinutes(), 0, 0);
      vm.setBookingDate(merged);
      setPickerMode('time');
    } else {
      const merged = new Date(base);
      merged.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
      vm.setBookingDate(merged);
      setPickerMode(null);
    }
  };

  const onReserve = () => {
    vm.submit()
      .then(() => {
        Alert.alert('Reserved', 'Your reservation has been submitted.', [
          {text: 'OK', onPress: () => navigation.navigate('FacilityBookings')},
        ]);
      })
      .catch(error =>
        Alert.alert('Error', getApiErrorMessage(error, 'Failed to submit reservation.')),
      );
  };

  return (
    <SafeAreaView style={{flex: 1, backgroundColor: theme.colors.background}} edges={['top']}>
      <Header title="Reserve" subtitle={facility.name} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{paddingHorizontal: 20, paddingBottom: 24}}>
        {/* Date & time */}
        <Text className="mb-2 text-sm font-medium text-content-secondary">Date & time</Text>
        <Pressable onPress={() => setPickerMode('date')} focusable accessibilityRole="button">
          <Card className="flex-row items-center justify-between">
            <Text className={vm.bookingDate ? 'text-sm text-content' : 'text-sm text-content-tertiary'}>
              {vm.bookingDate ? formatDateTime(vm.bookingDate.toISOString()) : 'Select date and time'}
            </Text>
            <Icon name="calendar-outline" size={20} color={theme.colors.primary} />
          </Card>
        </Pressable>

        {/* Guests */}
        <Text className="mb-2 mt-6 text-sm font-medium text-content-secondary">Number of guests</Text>
        <View className="flex-row flex-wrap">
          {vm.peopleOptions.map(n => (
            <PeopleChip
              key={n}
              value={n}
              active={vm.numberOfPeople === n}
              onPress={() => vm.setNumberOfPeople(n)}
            />
          ))}
        </View>

        <View className="mt-8">
          <Button label="Reserve a table" onPress={onReserve} loading={vm.isSubmitting} fullWidth />
        </View>
      </ScrollView>

      {pickerMode ? (
        <DateTimePicker
          value={vm.bookingDate ?? new Date()}
          mode={pickerMode}
          onChange={onPickerChange}
          minimumDate={pickerMode === 'date' ? new Date() : undefined}
        />
      ) : null}
    </SafeAreaView>
  );
}
