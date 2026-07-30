import React, {useMemo, useState} from 'react';
import {ActivityIndicator, ScrollView, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {toast} from '../../components';
import {
  AssistanceCard,
  CenterState,
  DS,
  FONT,
  GLASS_BLUR,
  GlassPanel,
  MetaRow,
  TvBackButton,
  TvBackdrop,
  TvFooter,
  TvPressable,
  TvTopBar,
} from '../../components/TvGlass';
import {PEOPLE_OPTIONS, useFacilityScheduleViewModel} from '../../viewmodels';
import {formatDays, formatRupees} from '../../utils';
import {getApiErrorMessage} from '../../utils/errorHandler';
import {FacilityGlyph} from './components/FacilityIcons';
import {
  Chip,
  FacilityPhoto,
  FieldLabel,
  dateChipLabel,
  dateKey,
  facilitySlots,
  facilityWindow,
  openDates,
} from './components/TvFacilityParts';
import type {FacilityRow} from '../../viewmodels/FacilityScheduleViewModel';
import type {HomeStackParamList} from '../../navigation/types';

/**
 * Registered for all three facility routes on TV — the phone's detail and
 * reserve pages both resolve here (see HomeStackNavigator).
 */
type Props = NativeStackScreenProps<
  HomeStackParamList,
  'FacilitySchedule' | 'FacilityDetail' | 'FacilityReserve'
>;

/**
 * Check Availability (TV) — the frame behind the client's "VIEW SCHEDULE — check
 * timings and book your slot".
 *
 * Every facility's hours on the left, the selected one's booking draft on the
 * right: a date strip of the days it is actually open, hourly slots inside its
 * own window, and the guest counts its capacity allows. All three are chips
 * because a remote has no keyboard and the phone's date-time dialog is unusable
 * from a sofa.
 *
 * WHAT "AVAILABILITY" HONESTLY MEANS HERE: nothing in the API exposes which
 * slots are already taken — `POST /v1/hotelFacility/book` returns a PENDING
 * reservation the front desk then approves. So the slots are the times a guest
 * can ASK for, and the pane says so rather than implying a confirmed booking.
 *
 * Sizes follow the TvGlass unit rule: Figma px ÷ 1.5 (global `zoom: 1.5`).
 */

/** The booking pane needs more width than the other frames' side columns. */
const PANE_WIDTH = 380;

/* ── One facility in the schedule ── */
function ScheduleRow({
  row,
  selected,
  onPress,
}: {
  row: FacilityRow;
  selected: boolean;
  onPress: () => void;
}) {
  const {facility, category} = row;
  const available = facility.isAvailable !== false;
  const window = facilityWindow(facility);
  const days = formatDays(facility.days);

  return (
    <TvPressable
      onPress={onPress}
      label={`${facility.name ?? 'Facility'}${window ? `, ${window}` : ''}${available ? '' : ', closed'}`}
      restBorderColor={selected ? 'rgba(212,180,131,0.55)' : DS.borderSoft}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: DS.radius,
        backgroundColor: selected ? 'rgba(212,180,131,0.12)' : 'rgba(255,255,255,0.055)',
        padding: 10,
        marginBottom: 10,
        opacity: available ? 1 : 0.6,
        ...(GLASS_BLUR ?? {}),
      }}>
      <FacilityPhoto
        src={facility.image}
        name={facility.name}
        category={category.name}
        glyphSize={26}
        style={{width: 70, height: 50}}
      />

      <View style={{flex: 1, marginLeft: 12, paddingRight: 10}}>
        <Text numberOfLines={1} style={{color: DS.text, fontSize: 13, fontWeight: '500', fontFamily: FONT}}>
          {facility.name ?? 'Facility'}
        </Text>
        <Text numberOfLines={1} style={{color: DS.muted, fontSize: 10, marginTop: 3, fontFamily: FONT}}>
          {category.name ?? ''}
        </Text>
      </View>

      <View style={{width: 168}}>
        <View style={{flexDirection: 'row', alignItems: 'center'}}>
          <Icon name="time-outline" size={12} color={DS.champagne} />
          <Text
            numberOfLines={1}
            style={{flex: 1, color: DS.text2, fontSize: 10.5, marginLeft: 6, fontFamily: FONT}}>
            {window ?? 'Hours on request'}
          </Text>
        </View>
        <View style={{flexDirection: 'row', alignItems: 'center', marginTop: 4}}>
          <Icon name="calendar-outline" size={12} color={DS.champagne} />
          <Text
            numberOfLines={1}
            style={{flex: 1, color: DS.muted, fontSize: 10, marginLeft: 6, fontFamily: FONT}}>
            {days || 'Open all days'}
          </Text>
        </View>
      </View>

      <View
        style={{
          width: 84,
          alignItems: 'flex-end',
          paddingRight: 4,
        }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            borderRadius: 999,
            borderWidth: 1,
            borderColor: available ? 'rgba(143,217,168,0.5)' : 'rgba(242,139,130,0.5)',
            backgroundColor: available ? 'rgba(143,217,168,0.18)' : 'rgba(242,139,130,0.16)',
            paddingHorizontal: 8,
            paddingVertical: 3,
          }}>
          <Text
            style={{
              color: available ? '#8FD9A8' : '#F28B82',
              fontSize: 9,
              fontWeight: '700',
              letterSpacing: 0.4,
              fontFamily: FONT,
            }}>
            {available ? 'OPEN' : 'CLOSED'}
          </Text>
        </View>
      </View>

      <Icon name="chevron-forward" size={17} color={selected ? DS.gold : DS.muted} />
    </TvPressable>
  );
}

export function TvFacilityScheduleScreen({navigation, route}: Props) {
  const vm = useFacilityScheduleViewModel();
  const [selectedId, setSelectedId] = useState<string | undefined>(route.params?.facility?._id);
  /** The draft lives here, not in the ViewModel: switching facility clears it. */
  const [day, setDay] = useState<string | null>(null);
  const [slot, setSlot] = useState<string | null>(null);
  const [guests, setGuests] = useState<number | null>(null);

  // Derived, not stored: a list that has not loaded yet, or a facility the hotel
  // has since removed, both fall back to the first row rather than an empty pane.
  const selectedRow = vm.rows.find(r => r.facility._id === selectedId) ?? vm.rows[0];
  const facility = selectedRow?.facility;
  const available = facility?.isAvailable !== false;

  const dates = useMemo(() => openDates(facility), [facility]);
  const slots = useMemo(() => facilitySlots(facility), [facility]);
  const guestOptions = useMemo(
    () =>
      facility?.capacity && facility.capacity > 0
        ? PEOPLE_OPTIONS.filter(n => n <= (facility.capacity as number))
        : PEOPLE_OPTIONS,
    [facility],
  );

  const select = (id: string) => {
    setSelectedId(id);
    setDay(null);
    setSlot(null);
    setGuests(null);
  };

  const onRequest = () => {
    if (!facility) {
      return;
    }
    if (!day || !slot) {
      toast.error('Please choose a date and a time.');
      return;
    }
    if (!guests) {
      toast.error('Please choose how many guests.');
      return;
    }
    const [hours, minutes] = slot.split(':');
    // Built from the chosen day in LOCAL time — the payload carries the naive
    // wall-clock the guest picked (see `toLocalDateTimeString`).
    const when = new Date(`${day}T00:00:00`);
    when.setHours(Number(hours), Number(minutes), 0, 0);

    vm.reserve(facility, when, guests)
      .then(() => {
        toast.success('Your reservation request has been sent to the front desk.');
        navigation.navigate('FacilityBookings');
      })
      .catch(error =>
        toast.error(getApiErrorMessage(error, 'Could not send your reservation request.')),
      );
  };

  return (
    <SafeAreaView style={{flex: 1, backgroundColor: DS.pageBg}} edges={['top']}>
      <TvBackdrop />

      <View style={{flex: 1, paddingHorizontal: DS.margin, paddingTop: DS.margin, paddingBottom: 14}}>
        <TvTopBar />

        <View style={{flex: 1, flexDirection: 'row', marginTop: 16}}>
          {/* ── Left: every facility and when it is open ── */}
          <GlassPanel style={{flex: 1, marginRight: DS.gap, padding: 16}}>
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
              <TvBackButton onPress={() => navigation.goBack()} size={40} />
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  marginLeft: 14,
                  borderWidth: 1,
                  borderColor: 'rgba(212,180,131,0.55)',
                  backgroundColor: 'rgba(212,180,131,0.14)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <Icon name="calendar-outline" size={22} color={DS.gold} />
              </View>
              <View style={{marginLeft: 14, flex: 1}}>
                <Text
                  style={{
                    color: DS.text,
                    fontSize: 19,
                    fontWeight: '500',
                    letterSpacing: 1.2,
                    fontFamily: FONT,
                  }}>
                  CHECK AVAILABILITY
                </Text>
                <Text style={{color: DS.text2, fontSize: 11, marginTop: 2, fontFamily: FONT}}>
                  Timings and days for every facility
                </Text>
              </View>
              <TvPressable
                onPress={() => navigation.navigate('FacilityBookings')}
                label="Request history"
                restBorderColor={DS.border}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  height: 36,
                  borderRadius: 10,
                  paddingHorizontal: 14,
                  backgroundColor: 'rgba(255,255,255,0.08)',
                }}>
                <Icon name="time-outline" size={15} color={DS.text} />
                <Text
                  style={{
                    color: DS.text,
                    fontSize: 11,
                    fontWeight: '600',
                    letterSpacing: 0.6,
                    marginLeft: 8,
                    fontFamily: FONT,
                  }}>
                  REQUEST HISTORY
                </Text>
              </TvPressable>
            </View>

            {vm.isLoading ? (
              <View style={{flex: 1, alignItems: 'center', justifyContent: 'center'}}>
                <ActivityIndicator size="large" color={DS.gold} />
                <Text style={{color: DS.text2, fontSize: 13, marginTop: 12, fontFamily: FONT}}>
                  Loading the schedule…
                </Text>
              </View>
            ) : vm.error ? (
              <CenterState icon="cloud-offline-outline" title="Could not load the schedule" message={vm.error}>
                <TvPressable
                  onPress={() => vm.refetch()}
                  label="Try again"
                  restBorderColor="#E5CFA5"
                  style={{
                    height: 38,
                    justifyContent: 'center',
                    borderRadius: 11,
                    paddingHorizontal: 22,
                    backgroundColor: DS.gold,
                    marginTop: 16,
                  }}>
                  <Text
                    style={{
                      color: DS.text,
                      fontSize: 12,
                      fontWeight: '700',
                      letterSpacing: 1,
                      fontFamily: FONT,
                    }}>
                    TRY AGAIN
                  </Text>
                </TvPressable>
              </CenterState>
            ) : vm.rows.length === 0 ? (
              <CenterState
                icon="business-outline"
                title="No facilities listed yet"
                message="Please ask the front desk what the hotel has open."
              />
            ) : (
              <ScrollView style={{flex: 1, marginTop: 14}} showsVerticalScrollIndicator={false}>
                {vm.rows.map(row => (
                  <ScheduleRow
                    key={row.facility._id}
                    row={row}
                    selected={selectedRow?.facility._id === row.facility._id}
                    onPress={() => select(row.facility._id)}
                  />
                ))}
              </ScrollView>
            )}
          </GlassPanel>

          {/* ── Right: the booking draft ── */}
          <View style={{width: PANE_WIDTH}}>
            {facility ? (
              <GlassPanel style={{flex: 1, padding: 14}}>
                {/* Header */}
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingBottom: 12,
                    borderBottomWidth: 1,
                    borderBottomColor: DS.divider,
                  }}>
                  <FacilityPhoto
                    src={facility.image}
                    name={facility.name}
                    category={selectedRow?.category.name}
                    glyphSize={24}
                    style={{width: 58, height: 44}}
                  />
                  <View style={{flex: 1, marginLeft: 11}}>
                    <Text
                      numberOfLines={1}
                      style={{color: DS.text, fontSize: 14, fontWeight: '600', fontFamily: FONT}}>
                      {facility.name ?? 'Facility'}
                    </Text>
                    <Text numberOfLines={1} style={{color: DS.muted, fontSize: 10, marginTop: 3, fontFamily: FONT}}>
                      {selectedRow?.category.name ?? ''}
                    </Text>
                  </View>
                </View>

                <ScrollView style={{flex: 1}} showsVerticalScrollIndicator={false}>
                  <MetaRow
                    icon="time-outline"
                    label="Hours"
                    value={facilityWindow(facility) ?? 'On request'}
                  />
                  <MetaRow
                    icon="calendar-outline"
                    label="Open"
                    value={formatDays(facility.days) || 'All days'}
                  />
                  {facility.location || facility.area ? (
                    <MetaRow
                      icon="location-outline"
                      label="Where"
                      value={[facility.location, facility.area].filter(Boolean).join(' · ')}
                    />
                  ) : null}
                  {facility.capacity != null && facility.capacity > 0 ? (
                    <MetaRow icon="people-outline" label="Capacity" value={`${facility.capacity} guests`} />
                  ) : null}
                  {facility.pricing != null && facility.pricing > 0 ? (
                    <MetaRow
                      icon="pricetag-outline"
                      label="Pricing"
                      value={formatRupees(facility.pricing)}
                      valueColor={DS.champagne}
                    />
                  ) : null}

                  {!available ? (
                    <View
                      style={{
                        flexDirection: 'row',
                        marginTop: 10,
                        padding: 10,
                        borderRadius: DS.radiusSm,
                        borderWidth: 1,
                        borderColor: 'rgba(242,139,130,0.4)',
                        backgroundColor: 'rgba(242,139,130,0.12)',
                      }}>
                      <Icon name="close-circle-outline" size={14} color={DS.danger} />
                      <Text
                        style={{
                          flex: 1,
                          color: DS.text2,
                          fontSize: 10,
                          lineHeight: 15,
                          marginLeft: 8,
                          fontFamily: FONT,
                        }}>
                        {facility.name ?? 'This facility'} is closed for reservations right now. The
                        front desk can tell you when it reopens.
                      </Text>
                    </View>
                  ) : (
                    <>
                      <FieldLabel>SELECT A DATE</FieldLabel>
                      <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 7}}>
                        {dates.map(date => {
                          const key = dateKey(date);
                          const label = dateChipLabel(date);
                          return (
                            <Chip
                              key={key}
                              label={label.top}
                              sublabel={label.bottom}
                              selected={day === key}
                              onPress={() => setDay(key)}
                              accessibilityLabel={`${label.top} ${label.bottom}`}
                              minWidth={76}
                            />
                          );
                        })}
                      </View>

                      <FieldLabel>SELECT A TIME</FieldLabel>
                      <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 7}}>
                        {slots.map(value => {
                          const hour = Number(value.slice(0, 2));
                          const label = `${hour % 12 === 0 ? 12 : hour % 12}:${value.slice(3)} ${hour >= 12 ? 'PM' : 'AM'}`;
                          return (
                            <Chip
                              key={value}
                              label={label}
                              selected={slot === value}
                              onPress={() => setSlot(value)}
                              accessibilityLabel={label}
                              minWidth={70}
                            />
                          );
                        })}
                      </View>

                      <FieldLabel>GUESTS</FieldLabel>
                      <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 7}}>
                        {guestOptions.map(count => (
                          <Chip
                            key={count}
                            label={String(count)}
                            selected={guests === count}
                            onPress={() => setGuests(count)}
                            accessibilityLabel={`${count} ${count === 1 ? 'guest' : 'guests'}`}
                            minWidth={44}
                          />
                        ))}
                      </View>
                    </>
                  )}
                </ScrollView>

                {/* The honest part: this asks, it does not confirm. */}
                <View style={{flexDirection: 'row', alignItems: 'center', marginTop: 10}}>
                  <Icon name="information-circle-outline" size={14} color={DS.champagne} />
                  <Text
                    style={{flex: 1, color: DS.muted, fontSize: 9.5, lineHeight: 14, marginLeft: 8, fontFamily: FONT}}>
                    The front desk confirms your slot. Track it under Request History.
                  </Text>
                </View>

                <TvPressable
                  onPress={available && !vm.isSubmitting ? onRequest : () => {}}
                  label={available ? 'Request this reservation' : 'This facility is closed'}
                  restBorderColor="#E5CFA5"
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: 48,
                    marginTop: 10,
                    borderRadius: 11,
                    backgroundColor: DS.gold,
                    opacity: available && !vm.isSubmitting ? 1 : 0.45,
                  }}>
                  {vm.isSubmitting ? (
                    <ActivityIndicator size="small" color={DS.text} />
                  ) : (
                    <>
                      <Text
                        style={{
                          color: DS.text,
                          fontSize: 13,
                          fontWeight: '700',
                          letterSpacing: 1,
                          fontFamily: FONT,
                        }}>
                        {available ? 'REQUEST RESERVATION' : 'CURRENTLY CLOSED'}
                      </Text>
                      {available ? (
                        <Icon name="arrow-forward" size={16} color={DS.text} style={{marginLeft: 10}} />
                      ) : null}
                    </>
                  )}
                </TvPressable>
              </GlassPanel>
            ) : (
              <GlassPanel style={{flex: 1, padding: 14}}>
                <CenterState
                  icon="calendar-outline"
                  title="Nothing to book yet"
                  message="Once the hotel lists a facility, its slots appear here.">
                  <View style={{marginTop: 16}}>
                    <FacilityGlyph name="lotus" size={40} color={DS.muted} />
                  </View>
                </CenterState>
              </GlassPanel>
            )}

            <AssistanceCard />
          </View>
        </View>

        <TvFooter marginTop={12} />
      </View>
    </SafeAreaView>
  );
}
