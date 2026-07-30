import React, {useMemo, useState} from 'react';
import {ActivityIndicator, ScrollView, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
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
import {useBookedFacilityViewModel} from '../../viewmodels';
import {FACILITY_BOOKING_STATUS} from '../../constants/status';
import {formatBookingDateTime} from '../../utils';
import {FacilityIcon} from './components/FacilityIcons';
import {
  FacilityStatusPill,
  facilityTone,
  reservationRef,
} from './components/TvFacilityParts';
import type {FacilityReservation} from '../../models/facility.model';
import type {HomeStackParamList} from '../../navigation/types';

type Props = NativeStackScreenProps<HomeStackParamList, 'FacilityBookings'>;

/**
 * Request History (TV) — every facility reservation the guest has made, with the
 * selected one opened beside it.
 *
 * Deliberately NOT the phone's "Upcoming events": that screen hides cancelled
 * reservations because it answers "what is coming up". A history has to show the
 * cancelled and declined ones too, which is what `vm.all` is for — the phone's
 * filtered list is untouched.
 *
 * Sizes follow the TvGlass unit rule: Figma px ÷ 1.5 (global `zoom: 1.5`).
 */

const FILTERS: {id: number | null; label: string}[] = [
  {id: null, label: 'All'},
  {id: FACILITY_BOOKING_STATUS.PENDING, label: 'Pending'},
  {id: FACILITY_BOOKING_STATUS.APPROVED, label: 'Confirmed'},
  {id: FACILITY_BOOKING_STATUS.DISAPPROVED, label: 'Declined'},
  {id: FACILITY_BOOKING_STATUS.CANCELLED, label: 'Cancelled'},
];

/** What the status means for the guest, in the frame's voice. */
const STATUS_NOTE: Record<number, string> = {
  [FACILITY_BOOKING_STATUS.PENDING]: 'The front desk has your request and will confirm the slot shortly.',
  [FACILITY_BOOKING_STATUS.APPROVED]: 'Confirmed — the facility is expecting you at this time.',
  [FACILITY_BOOKING_STATUS.DISAPPROVED]:
    'The hotel could not take this slot. Try another time, or ask the front desk.',
  [FACILITY_BOOKING_STATUS.CANCELLED]: 'This reservation was cancelled.',
};

const ROW_ICON = 44;

/* ── One reservation in the list ── */
function ReservationRow({
  item,
  selected,
  onPress,
}: {
  item: FacilityReservation;
  selected: boolean;
  onPress: () => void;
}) {
  const tone = facilityTone(item.status);
  const guests = item.numberOfGuests ?? 0;
  const finished =
    item.status === FACILITY_BOOKING_STATUS.CANCELLED ||
    item.status === FACILITY_BOOKING_STATUS.DISAPPROVED;

  return (
    <TvPressable
      onPress={onPress}
      label={`${item.facilityTypeName ?? 'Reservation'}, ${tone.label}`}
      restBorderColor={selected ? 'rgba(212,180,131,0.55)' : DS.borderSoft}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: DS.radius,
        backgroundColor: selected ? 'rgba(212,180,131,0.12)' : 'rgba(255,255,255,0.055)',
        paddingVertical: 10,
        paddingHorizontal: 14,
        marginBottom: 10,
        opacity: finished && !selected ? 0.72 : 1,
        ...(GLASS_BLUR ?? {}),
      }}>
      <View
        style={{
          width: ROW_ICON,
          height: ROW_ICON,
          borderRadius: ROW_ICON / 2,
          borderWidth: 1,
          borderColor: selected ? 'rgba(212,180,131,0.55)' : DS.borderSoft,
          backgroundColor: selected ? 'rgba(212,180,131,0.16)' : 'rgba(255,255,255,0.06)',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <FacilityIcon
          name={item.facilityTypeName}
          secondary={item.facilityName}
          size={26}
          color={selected ? DS.gold : DS.champagne}
        />
      </View>

      <View style={{flex: 1, marginLeft: 14, paddingRight: 10}}>
        <Text numberOfLines={1} style={{color: DS.text, fontSize: 13, fontWeight: '500', fontFamily: FONT}}>
          {item.facilityTypeName ?? 'Reservation'}
        </Text>
        <Text numberOfLines={1} style={{color: DS.text2, fontSize: 10, marginTop: 3, fontFamily: FONT}}>
          {item.facilityName ?? ''}
        </Text>
      </View>

      <View style={{width: 116, alignItems: 'flex-start'}}>
        <FacilityStatusPill status={item.status} compact />
        <View style={{flexDirection: 'row', alignItems: 'center', marginTop: 5}}>
          <Icon name="people-outline" size={11} color={DS.muted} />
          <Text style={{color: DS.muted, fontSize: 10, marginLeft: 5, fontFamily: FONT}}>
            {guests} {guests === 1 ? 'guest' : 'guests'}
          </Text>
        </View>
      </View>

      <View style={{width: 1, alignSelf: 'stretch', backgroundColor: DS.divider, marginHorizontal: 12}} />

      <View style={{width: 168}}>
        <Text style={{color: DS.muted, fontSize: 9, letterSpacing: 0.4, fontFamily: FONT}}>
          Booked for
        </Text>
        <Text
          numberOfLines={1}
          style={{color: DS.text2, fontSize: 10.5, marginTop: 2, fontFamily: FONT}}>
          {formatBookingDateTime(item.bookingDate)}
        </Text>
      </View>

      <Icon name="chevron-forward" size={18} color={selected ? DS.gold : DS.muted} style={{marginLeft: 8}} />
    </TvPressable>
  );
}

/* ── Right column: the selected reservation ── */
function DetailPane({item}: {item: FacilityReservation}) {
  const tone = facilityTone(item.status);
  const guests = item.numberOfGuests ?? 0;

  return (
    <GlassPanel style={{flex: 1, padding: 14}}>
      <Text
        style={{
          color: DS.text,
          fontSize: 13,
          fontWeight: '700',
          letterSpacing: 1,
          fontFamily: FONT,
        }}>
        RESERVATION DETAILS
      </Text>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          marginTop: 12,
          paddingBottom: 12,
          borderBottomWidth: 1,
          borderBottomColor: DS.divider,
        }}>
        <View
          style={{
            width: 46,
            height: 46,
            borderRadius: 23,
            borderWidth: 1,
            borderColor: 'rgba(212,180,131,0.55)',
            backgroundColor: 'rgba(212,180,131,0.14)',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <FacilityIcon
            name={item.facilityTypeName}
            secondary={item.facilityName}
            size={28}
            color={DS.gold}
          />
        </View>
        <View style={{flex: 1, marginLeft: 11}}>
          <Text numberOfLines={1} style={{color: DS.text, fontSize: 13, fontWeight: '600', fontFamily: FONT}}>
            {item.facilityTypeName ?? 'Reservation'}
          </Text>
          <Text numberOfLines={1} style={{color: DS.muted, fontSize: 10, marginTop: 3, fontFamily: FONT}}>
            {item.facilityName ?? ''}
          </Text>
        </View>
      </View>

      <ScrollView style={{flex: 1}} showsVerticalScrollIndicator={false}>
        <MetaRow icon="pricetag-outline" label="Reference" value={reservationRef(item._id)} />
        <MetaRow
          icon="calendar-outline"
          label="Booked for"
          value={formatBookingDateTime(item.bookingDate)}
        />
        <MetaRow icon="people-outline" label="Guests" value={`${guests} ${guests === 1 ? 'guest' : 'guests'}`} />
        <MetaRow icon={tone.icon} label="Status">
          <FacilityStatusPill status={item.status} compact />
        </MetaRow>
        <MetaRow icon="business-outline" label="Section" value={item.facilityName} />

        <View
          style={{
            flexDirection: 'row',
            marginTop: 10,
            padding: 10,
            borderRadius: DS.radiusSm,
            borderWidth: 1,
            borderColor: `${tone.color}44`,
            backgroundColor: `${tone.color}14`,
          }}>
          <Icon name={tone.icon} size={14} color={tone.color} />
          <Text
            style={{flex: 1, color: DS.text2, fontSize: 10, lineHeight: 15, marginLeft: 8, fontFamily: FONT}}>
            {(item.status != null ? STATUS_NOTE[item.status] : undefined) ??
              'This reservation is with the front desk.'}
          </Text>
        </View>

        {/* No cancel button: `POST /v1/hotelFacility/book` is the only write the
            API offers a guest — cancelling is the desk's to do, and a button that
            silently did nothing would be worse than none. */}
        <View style={{flexDirection: 'row', alignItems: 'center', marginTop: 12}}>
          <Icon name="call-outline" size={13} color={DS.champagne} />
          <Text
            style={{flex: 1, color: DS.muted, fontSize: 9.5, lineHeight: 14, marginLeft: 8, fontFamily: FONT}}>
            To change or cancel this reservation, chat with the front desk.
          </Text>
        </View>
      </ScrollView>
    </GlassPanel>
  );
}

export function TvFacilityBookingsScreen({navigation}: Props) {
  const vm = useBookedFacilityViewModel();
  const [filter, setFilter] = useState<number | null>(null);
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);

  const visible = useMemo(
    () => (filter == null ? vm.all : vm.all.filter(item => item.status === filter)),
    [vm.all, filter],
  );

  // Derived: a tab that filters the open reservation away falls back to the
  // first one rather than emptying the panel.
  const selected = visible.find(item => item._id === selectedId) ?? visible[0];

  return (
    <SafeAreaView style={{flex: 1, backgroundColor: DS.pageBg}} edges={['top']}>
      <TvBackdrop />

      <View style={{flex: 1, paddingHorizontal: DS.margin, paddingTop: DS.margin, paddingBottom: 14}}>
        <TvTopBar />

        <View style={{flex: 1, flexDirection: 'row', marginTop: 16}}>
          {/* ── Left: tabs + the reservations ── */}
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
                <Icon name="time-outline" size={22} color={DS.gold} />
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
                  REQUEST HISTORY
                </Text>
                <Text style={{color: DS.text2, fontSize: 11, marginTop: 2, fontFamily: FONT}}>
                  Every facility reservation you have made
                </Text>
              </View>
              <TvPressable
                onPress={() => vm.refetch()}
                label="Refresh your reservations"
                restBorderColor={DS.border}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  height: 36,
                  borderRadius: 10,
                  paddingHorizontal: 14,
                  backgroundColor: 'rgba(255,255,255,0.08)',
                }}>
                {vm.isRefetching ? (
                  <ActivityIndicator size="small" color={DS.gold} />
                ) : (
                  <Icon name="refresh" size={15} color={DS.text} />
                )}
                <Text
                  style={{
                    color: DS.text,
                    fontSize: 11,
                    fontWeight: '600',
                    letterSpacing: 0.6,
                    marginLeft: 8,
                    fontFamily: FONT,
                  }}>
                  REFRESH
                </Text>
              </TvPressable>
            </View>

            {vm.isLoading ? (
              <View style={{flex: 1, alignItems: 'center', justifyContent: 'center'}}>
                <ActivityIndicator size="large" color={DS.gold} />
                <Text style={{color: DS.text2, fontSize: 13, marginTop: 12, fontFamily: FONT}}>
                  Loading your reservations…
                </Text>
              </View>
            ) : vm.error ? (
              <CenterState icon="cloud-offline-outline" title="Could not load your reservations" message={vm.error}>
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
            ) : vm.hasNone ? (
              <CenterState
                icon="calendar-outline"
                title="No reservations yet"
                message="Book a slot and it will appear here with its progress.">
                <TvPressable
                  onPress={() => navigation.navigate('FacilitySchedule')}
                  label="Check availability"
                  restBorderColor="#E5CFA5"
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    height: 42,
                    justifyContent: 'center',
                    borderRadius: 11,
                    paddingHorizontal: 22,
                    backgroundColor: DS.gold,
                    marginTop: 18,
                  }}>
                  <Text
                    style={{
                      color: DS.text,
                      fontSize: 12,
                      fontWeight: '700',
                      letterSpacing: 1,
                      fontFamily: FONT,
                    }}>
                    CHECK AVAILABILITY
                  </Text>
                  <Icon name="arrow-forward" size={15} color={DS.text} style={{marginLeft: 8}} />
                </TvPressable>
              </CenterState>
            ) : (
              <>
                {/* ── Status tabs ── */}
                <View style={{flexDirection: 'row', marginTop: 16, marginBottom: 14, gap: 8}}>
                  {FILTERS.map(tab => {
                    const count = tab.id == null ? vm.counts.all : (vm.counts.byStatus[tab.id] ?? 0);
                    const active = tab.id === filter;
                    return (
                      <TvPressable
                        key={tab.label}
                        onPress={() => setFilter(tab.id)}
                        label={`${tab.label}, ${count} reservation${count === 1 ? '' : 's'}`}
                        restBorderColor={active ? '#E5CFA5' : DS.borderSoft}
                        style={{
                          height: 38,
                          justifyContent: 'center',
                          paddingHorizontal: 16,
                          borderRadius: 10,
                          backgroundColor: active ? DS.gold : 'rgba(255,255,255,0.08)',
                        }}>
                        <Text
                          style={{
                            color: active ? DS.text : DS.text2,
                            fontSize: 11.5,
                            fontWeight: active ? '700' : '500',
                            letterSpacing: 0.4,
                            fontFamily: FONT,
                          }}>
                          {tab.label} ({count})
                        </Text>
                      </TvPressable>
                    );
                  })}
                </View>

                {visible.length === 0 ? (
                  <CenterState
                    icon="funnel-outline"
                    title={`Nothing ${(FILTERS.find(f => f.id === filter)?.label ?? '').toLowerCase()}`}
                    message="Pick another tab to see your other reservations."
                  />
                ) : (
                  <ScrollView style={{flex: 1}} showsVerticalScrollIndicator={false}>
                    {visible.map(item => (
                      <ReservationRow
                        key={item._id}
                        item={item}
                        selected={selected?._id === item._id}
                        onPress={() => setSelectedId(item._id)}
                      />
                    ))}
                  </ScrollView>
                )}
              </>
            )}
          </GlassPanel>

          {/* ── Right: the selected reservation, then a way to book another ── */}
          <View style={{width: 336}}>
            {selected ? (
              <DetailPane item={selected} />
            ) : (
              <GlassPanel style={{flex: 1, padding: 14}}>
                <Text
                  style={{
                    color: DS.text,
                    fontSize: 13,
                    fontWeight: '700',
                    letterSpacing: 1,
                    fontFamily: FONT,
                  }}>
                  RESERVATION DETAILS
                </Text>
                <CenterState
                  icon="reader-outline"
                  title="Nothing selected"
                  message="Pick a reservation on the left to see everything about it."
                />
              </GlassPanel>
            )}

            <TvPressable
              onPress={() => navigation.navigate('FacilitySchedule')}
              label="Book another facility"
              restBorderColor="#E5CFA5"
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                height: 46,
                marginTop: DS.gap,
                borderRadius: 11,
                backgroundColor: DS.gold,
              }}>
              <Text
                style={{
                  color: DS.text,
                  fontSize: 12,
                  fontWeight: '700',
                  letterSpacing: 1,
                  fontFamily: FONT,
                }}>
                NEW RESERVATION
              </Text>
              <Icon name="add" size={16} color={DS.text} style={{marginLeft: 8}} />
            </TvPressable>

            <AssistanceCard />
          </View>
        </View>

        <TvFooter marginTop={12} />
      </View>
    </SafeAreaView>
  );
}
