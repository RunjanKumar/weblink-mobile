import React, {useState} from 'react';
import {Platform, Pressable, ScrollView, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import DateTimePicker from '@react-native-community/datetimepicker';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Button, toast} from '../../components';
import {useReserveFacilityViewModel} from '../../viewmodels';
import {useTheme} from '../../theme';
import {useTVFocus} from '../../hooks/useTVFocus';
import {IS_TV} from '../../utils/responsive';
import {getApiErrorMessage} from '../../utils/errorHandler';
import {FacilityHero} from './components/FacilityHero';
import type {HomeStackParamList} from '../../navigation/types';

type Props = NativeStackScreenProps<HomeStackParamList, 'FacilityReserve'>;

/** Native Android has no combined datetime dialog — it chains date → time. */
type PickerStep = 'date' | 'time' | 'datetime' | null;

function FieldButton({
  placeholder,
  value,
  icon,
  onPress,
}: {
  placeholder: string;
  value: string | null;
  icon: string;
  onPress: () => void;
}) {
  const {theme} = useTheme();
  const {focused, onFocus, onBlur} = useTVFocus();
  return (
    <Pressable
      onPress={onPress}
      onFocus={onFocus}
      onBlur={onBlur}
      focusable
      accessibilityRole="button"
      accessibilityLabel={value ?? placeholder}
      className="flex-row items-center justify-between"
      style={{
        minHeight: IS_TV ? 60 : 54,
        borderRadius: 14,
        backgroundColor: theme.colors.surface,
        borderWidth: focused ? 2 : 1,
        borderColor: focused ? theme.colors.focusRing : theme.colors.border,
        paddingHorizontal: 16,
      }}>
      <Text
        style={{
          color: value ? theme.colors.text : theme.colors.muted,
          fontSize: IS_TV ? 17 : 15,
        }}>
        {value ?? placeholder}
      </Text>
      <Icon name={icon} size={20} color={theme.colors.primary} />
    </Pressable>
  );
}

function GuestOptionRow({
  count,
  selected,
  onPress,
}: {
  count: number;
  selected: boolean;
  onPress: () => void;
}) {
  const {theme} = useTheme();
  const {focused, onFocus, onBlur} = useTVFocus();
  return (
    <Pressable
      onPress={onPress}
      onFocus={onFocus}
      onBlur={onBlur}
      focusable
      accessibilityRole="button"
      accessibilityState={{selected}}
      style={{
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: focused
          ? `${theme.colors.primary}1f`
          : selected
            ? `${theme.colors.primary}14`
            : 'transparent',
      }}>
      <Text
        style={{
          color: selected ? theme.colors.primary : theme.colors.text,
          fontSize: IS_TV ? 17 : 15,
          fontWeight: selected ? '600' : '400',
        }}>
        {count} {count === 1 ? 'person' : 'people'}
      </Text>
    </Pressable>
  );
}

/**
 * Reserve a facility — reference `ReserveTable.jsx`: hero + overlay back,
 * ONE "Date and time" field (single combined picker; native Android chains
 * date → time because it has no datetime dialog), a "Number of people"
 * dropdown, and a full-width "Reserve a table" CTA. Validation and success
 * feedback are toasts with the reference strings.
 */
export function FacilityReserveScreen({navigation, route}: Props) {
  const {theme} = useTheme();
  const {facility} = route.params;
  const vm = useReserveFacilityViewModel(facility);
  const [pickerStep, setPickerStep] = useState<PickerStep>(null);
  const [guestsOpen, setGuestsOpen] = useState(false);

  const openPicker = () => {
    setGuestsOpen(false);
    setPickerStep(Platform.OS === 'web' ? 'datetime' : 'date');
  };

  const onPickerChange = (event: {type?: string}, selected?: Date) => {
    if (event.type === 'dismissed' || !selected || Number.isNaN(selected.getTime())) {
      setPickerStep(null);
      return;
    }
    if (pickerStep === 'datetime') {
      vm.setBookingDate(selected);
      setPickerStep(null);
      return;
    }
    if (pickerStep === 'date') {
      const base = vm.bookingDate ?? new Date();
      const merged = new Date(selected);
      merged.setHours(base.getHours(), base.getMinutes(), 0, 0);
      vm.setBookingDate(merged);
      setPickerStep('time');
      return;
    }
    // time step
    const base = vm.bookingDate ?? new Date();
    const merged = new Date(base);
    merged.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
    vm.setBookingDate(merged);
    setPickerStep(null);
  };

  const onReserve = () => {
    vm.submit()
      .then(submitted => {
        if (!submitted) {
          return; // validation toast already shown
        }
        toast.success('Your reservation has been successfully submitted!');
        navigation.navigate('FacilityBookings');
      })
      .catch(error => toast.error(getApiErrorMessage(error, 'Failed to submit reservation.')));
  };

  const dateLabel = vm.bookingDate
    ? vm.bookingDate.toLocaleDateString('en-IN', {day: '2-digit', month: 'short', year: 'numeric'}) +
      ' ' +
      vm.bookingDate.toLocaleTimeString('en-IN', {hour: '2-digit', minute: '2-digit'})
    : null;

  return (
    <SafeAreaView style={{flex: 1, backgroundColor: theme.colors.background}} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={{paddingBottom: 24, flexGrow: 1}}>
        <FacilityHero image={facility.image} onBack={() => navigation.goBack()} />

        <View style={{paddingHorizontal: 20, paddingTop: 20, flex: 1}}>
          <Text
            style={{
              color: theme.colors.primary,
              fontSize: IS_TV ? 28 : 22,
              fontWeight: '700',
              marginBottom: 20,
            }}>
            {facility.name}
          </Text>

          {/* Date and time — one field, one picker */}
          <Text style={{color: theme.colors.textSecondary, fontSize: 13, marginBottom: 8}}>
            Date and time
          </Text>
          <FieldButton
            placeholder="Date and time"
            value={dateLabel}
            icon="calendar-outline"
            onPress={openPicker}
          />

          {/* Number of people — dropdown (reference options + labels) */}
          <Text
            style={{
              color: theme.colors.textSecondary,
              fontSize: 13,
              marginTop: 20,
              marginBottom: 8,
            }}>
            Number of people
          </Text>
          <FieldButton
            placeholder="Number of people"
            value={vm.numberOfPeople != null ? `${vm.numberOfPeople} people` : null}
            icon={guestsOpen ? 'chevron-up' : 'chevron-down'}
            onPress={() => {
              setPickerStep(null);
              setGuestsOpen(open => !open);
            }}
          />
          {guestsOpen ? (
            <View
              style={{
                marginTop: 6,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: theme.colors.border,
                backgroundColor: theme.colors.surface,
                maxHeight: 220,
                overflow: 'hidden',
              }}>
              <ScrollView nestedScrollEnabled>
                {vm.peopleOptions.map(count => (
                  <GuestOptionRow
                    key={count}
                    count={count}
                    selected={vm.numberOfPeople === count}
                    onPress={() => {
                      vm.setNumberOfPeople(count);
                      setGuestsOpen(false);
                    }}
                  />
                ))}
              </ScrollView>
            </View>
          ) : null}

          <View style={{flex: 1}} />

          <View style={{marginTop: 28}}>
            <Button
              label={vm.isSubmitting ? 'Reserving…' : 'Reserve a table'}
              onPress={onReserve}
              loading={vm.isSubmitting}
              fullWidth
            />
          </View>
        </View>
      </ScrollView>

      {pickerStep ? (
        <DateTimePicker
          // Remount per step: the native module renders its dialog on mount,
          // and the web shim would otherwise carry a stale draft across modes.
          key={pickerStep}
          value={vm.bookingDate ?? new Date()}
          mode={pickerStep as 'date' | 'time'}
          onChange={onPickerChange}
          minimumDate={pickerStep !== 'time' ? new Date() : undefined}
        />
      ) : null}
    </SafeAreaView>
  );
}
