import React, {useMemo, useState} from 'react';
import {ActivityIndicator, Image, ScrollView, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {
  CenterState,
  DS,
  FONT,
  FootNote,
  GLASS_BLUR,
  GlassPanel,
  TvBackButton,
  TvBackdrop,
  TvFooter,
  TvPressable,
  TvTopBar,
  toSource,
} from '../../components/TvGlass';
import {useFacilitiesViewModel} from '../../viewmodels';
import {FacilityGlyph} from './components/FacilityIcons';
import {CategoryCell, FacilityCard, FacilityPhoto} from './components/TvFacilityParts';
import type {FacilityCategory, FacilityType} from '../../models/facility.model';
import type {HomeStackParamList} from '../../navigation/types';

import wellnessImg from '../../assets/tv/facilities.jpg';

type Props = NativeStackScreenProps<HomeStackParamList, 'Facilities'>;

/**
 * Facilities (TV) — the client's Figma frame, built 1:1.
 *
 * One row per category: the category's cell on the left, then its facilities as
 * photo cards that share the row's width — which is why the frame's single YOGA
 * card runs full width while the four spa rooms sit a quarter each. That falls
 * out of `flex: 1` per card, so it stays true for however many the hotel lists.
 *
 * Data is `useFacilitiesViewModel`, the same categories → `types[]` the phone
 * screen paginates through tabs; the ten-foot frame shows every category at once
 * because it has the room and a guest across the room should not have to hunt.
 *
 * Sizes follow the TvGlass unit rule: Figma px ÷ 1.5 (global `zoom: 1.5`).
 */

/**
 * Card height, and with it how many category rows fit. Three rows — the client's
 * frame — fill the panel exactly at 108 (108 + the row's own 18 of padding and
 * borders = 128 per row, 406 for three). Growing it pushes the third category
 * under the fold, which is the one thing this layout cannot afford: a guest
 * across the room has to see everything the hotel offers at once.
 */
const CARD_HEIGHT = 108;
/** Vertical rhythm between category rows. */
const ROW_GAP = 11;

/** Which pane the right column is showing. */
type RightPane = 'wellness' | 'locations';

/* ── Right column: the three action rows ── */
function ActionRow({
  icon,
  title,
  subtitle,
  active = false,
  onPress,
}: {
  icon: string;
  title: string;
  subtitle: string;
  active?: boolean;
  onPress: () => void;
}) {
  return (
    <TvPressable
      onPress={onPress}
      label={`${title}. ${subtitle}`}
      restBorderColor={active ? 'rgba(212,180,131,0.55)' : DS.borderSoft}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: DS.gap,
        paddingHorizontal: 12,
        paddingVertical: 11,
        borderRadius: DS.radius,
        backgroundColor: active ? 'rgba(212,180,131,0.14)' : DS.glass,
        ...(GLASS_BLUR ?? {}),
      }}>
      <View
        style={{
          width: 38,
          height: 38,
          borderRadius: 19,
          borderWidth: 1,
          borderColor: 'rgba(212,180,131,0.45)',
          backgroundColor: 'rgba(212,180,131,0.14)',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <Icon name={icon} size={18} color={DS.gold} />
      </View>
      <View style={{flex: 1, marginLeft: 12, paddingRight: 6}}>
        <Text
          numberOfLines={1}
          style={{
            color: DS.text,
            fontSize: 11.5,
            fontWeight: '600',
            letterSpacing: 0.6,
            fontFamily: FONT,
          }}>
          {title}
        </Text>
        <Text numberOfLines={1} style={{color: DS.muted, fontSize: 9.5, marginTop: 2, fontFamily: FONT}}>
          {subtitle}
        </Text>
      </View>
      <Icon name="chevron-forward" size={16} color={DS.champagne} />
    </TvPressable>
  );
}

/** The Figma's gold flourish under the panel title. */
function Flourish() {
  return (
    <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 8}}>
      <View style={{width: 46, height: 1, backgroundColor: 'rgba(212,180,131,0.5)'}} />
      <View
        style={{
          width: 6,
          height: 6,
          marginHorizontal: 7,
          backgroundColor: DS.gold,
          transform: [{rotate: '45deg'}],
        }}
      />
      <View style={{width: 46, height: 1, backgroundColor: 'rgba(212,180,131,0.5)'}} />
    </View>
  );
}

/* ── Right column: DISCOVER WELLNESS ── */
function WellnessPane({categories}: {categories: FacilityCategory[]}) {
  /**
   * The panel's own mood photograph. The hotel's spa or wellness picture if it
   * has one — that is what the copy beside it is about — otherwise its first
   * category's, and the bundled plate when the API shipped no imagery at all.
   */
  const photo = useMemo(() => {
    const wellness = categories.find(c => /spa|wellness|yoga|massage/i.test(c.name ?? ''));
    return (wellness ?? categories[0])?.imageUrl;
  }, [categories]);

  return (
    <GlassPanel style={{flex: 1, padding: 14}}>
      <Text
        style={{
          color: DS.gold,
          fontSize: 13,
          fontWeight: '600',
          letterSpacing: 1.4,
          textAlign: 'center',
          fontFamily: FONT,
        }}>
        DISCOVER WELLNESS
      </Text>
      <Flourish />
      <Text
        style={{
          color: DS.text2,
          fontSize: 11.5,
          lineHeight: 19,
          textAlign: 'center',
          marginTop: 12,
          fontFamily: FONT,
        }}>
        World-class facilities designed to rejuvenate your body, mind and soul.
      </Text>

      {photo ? (
        <FacilityPhoto src={photo} radius={DS.radius} style={{flex: 1, marginTop: 14, minHeight: 90}} />
      ) : (
        // The bundled plate, so the panel is never a hole in the glass when the
        // hotel has uploaded no imagery of its own.
        <View
          style={{
            flex: 1,
            marginTop: 14,
            minHeight: 90,
            borderRadius: DS.radius,
            overflow: 'hidden',
            backgroundColor: 'rgba(255,255,255,0.10)',
          }}>
          <Image
            source={toSource(wellnessImg)}
            resizeMode="cover"
            style={{width: '100%', height: '100%', opacity: 0.92}}
          />
        </View>
      )}
    </GlassPanel>
  );
}

/* ── Right column: where everything is ── */
function LocationsPane({
  categories,
  onClose,
}: {
  categories: FacilityCategory[];
  onClose: () => void;
}) {
  /** Only facilities that actually carry a location — the rest would be dashes. */
  const located = useMemo(
    () =>
      categories.flatMap(category =>
        (category.types ?? [])
          .filter(f => f.location || f.area || f.locationlink)
          .map(f => ({facility: f, categoryName: category.name})),
      ),
    [categories],
  );

  return (
    <GlassPanel style={{flex: 1, padding: 14}}>
      <View style={{flexDirection: 'row', alignItems: 'center'}}>
        <TvBackButton onPress={onClose} size={34} />
        <Text
          style={{
            flex: 1,
            color: DS.text,
            fontSize: 12.5,
            fontWeight: '700',
            letterSpacing: 1,
            marginLeft: 12,
            fontFamily: FONT,
          }}>
          FACILITY LOCATIONS
        </Text>
      </View>

      {located.length === 0 ? (
        <CenterState
          icon="map-outline"
          title="No directions listed"
          message="The front desk will point you the right way."
        />
      ) : (
        <ScrollView style={{flex: 1, marginTop: 12}} showsVerticalScrollIndicator={false}>
          {located.map(({facility, categoryName}) => (
            <View
              key={facility._id}
              style={{
                flexDirection: 'row',
                paddingVertical: 9,
                borderBottomWidth: 1,
                borderBottomColor: DS.divider,
              }}>
              <Icon name="location-outline" size={15} color={DS.champagne} style={{marginTop: 1}} />
              <View style={{flex: 1, marginLeft: 9}}>
                <Text numberOfLines={1} style={{color: DS.text, fontSize: 11.5, fontFamily: FONT}}>
                  {facility.name ?? 'Facility'}
                </Text>
                <Text
                  numberOfLines={2}
                  style={{color: DS.text2, fontSize: 10, lineHeight: 14, marginTop: 2, fontFamily: FONT}}>
                  {[facility.location, facility.area, facility.locationlink]
                    .filter(Boolean)
                    .join(' · ')}
                </Text>
                <Text style={{color: DS.muted, fontSize: 9, marginTop: 2, fontFamily: FONT}}>
                  {categoryName ?? ''}
                </Text>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </GlassPanel>
  );
}

export function TvFacilitiesScreen({navigation}: Props) {
  const vm = useFacilitiesViewModel();
  const rootNavigation = useNavigation();
  const [pane, setPane] = useState<RightPane>('wellness');

  /** A category with nothing in it has no row to draw. */
  const sections = useMemo(
    () => vm.categories.filter(category => (category.types ?? []).length > 0),
    [vm.categories],
  );

  /** Where VIEW SCHEDULE lands: the first facility the hotel has open. */
  const firstOpen = useMemo<FacilityType | undefined>(() => {
    for (const category of sections) {
      const open = (category.types ?? []).find(f => f.isAvailable !== false);
      if (open) {
        return open;
      }
    }
    return sections[0]?.types?.[0];
  }, [sections]);

  const openSchedule = (facility?: FacilityType) =>
    navigation.navigate('FacilitySchedule', facility ? {facility} : undefined);

  /**
   * This frame is the Facilities TAB's root, so there is usually nothing to pop:
   * the guest arrived from the dashboard's Facilities tile, and that is where the
   * arrow has to take them.
   */
  const onBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    (navigation as unknown as {navigate: (name: string) => void}).navigate('Home');
  };

  return (
    <SafeAreaView style={{flex: 1, backgroundColor: DS.pageBg}} edges={['top']}>
      <TvBackdrop />

      <View style={{flex: 1, paddingHorizontal: DS.margin, paddingTop: DS.margin, paddingBottom: 14}}>
        <TvTopBar />

        <View style={{flex: 1, flexDirection: 'row', marginTop: 16}}>
          {/* ── Left: the categories ── */}
          <GlassPanel style={{flex: 1, marginRight: DS.gap, padding: 16}}>
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
              <TvBackButton onPress={onBack} size={40} />
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
                <FacilityGlyph name="lotus" size={26} color={DS.gold} />
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
                  FACILITIES
                </Text>
                <Text style={{color: DS.text2, fontSize: 11, marginTop: 2, fontFamily: FONT}}>
                  Refresh your body, relax your mind
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
                  Loading facilities…
                </Text>
              </View>
            ) : vm.error ? (
              <CenterState icon="cloud-offline-outline" title="Could not load facilities" message={vm.error}>
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
            ) : sections.length === 0 ? (
              <CenterState
                icon="business-outline"
                title="No facilities listed yet"
                message="Please ask the front desk what the hotel has open."
              />
            ) : (
              <>
                <ScrollView style={{flex: 1, marginTop: 14}} showsVerticalScrollIndicator={false}>
                  {sections.map(category => (
                    <View
                      key={category._id}
                      style={{
                        flexDirection: 'row',
                        borderRadius: DS.radius,
                        borderWidth: 1,
                        borderColor: DS.borderSoft,
                        backgroundColor: 'rgba(255,255,255,0.05)',
                        padding: 9,
                        marginBottom: ROW_GAP,
                        ...(GLASS_BLUR ?? {}),
                      }}>
                      <CategoryCell category={category} height={CARD_HEIGHT} />
                      {/* Every facility in the row shares the width, so one card
                          runs full width and four sit a quarter each — the frame's
                          own behaviour, without a hard-coded column count. */}
                      <View style={{flex: 1, flexDirection: 'row', gap: 10}}>
                        {(category.types ?? []).map(facility => (
                          <FacilityCard
                            key={facility._id}
                            facility={facility}
                            categoryName={category.name}
                            height={CARD_HEIGHT}
                            onPress={() => openSchedule(facility)}
                          />
                        ))}
                      </View>
                    </View>
                  ))}
                </ScrollView>

                {/* ── Footnotes ── */}
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    marginTop: 2,
                    paddingVertical: 12,
                    borderRadius: DS.radius,
                    borderWidth: 1,
                    borderColor: DS.borderSoft,
                    backgroundColor: 'rgba(255,255,255,0.05)',
                  }}>
                  <FootNote icon="information-circle-outline">
                    For reservations and more information, please contact the Front Desk.
                  </FootNote>
                  <View style={{width: 1, alignSelf: 'stretch', backgroundColor: DS.divider}} />
                  <FootNote icon="time-outline">
                    Some facilities may require prior reservation.
                  </FootNote>
                </View>
              </>
            )}
          </GlassPanel>

          {/* ── Right: the wellness panel, then the three actions ── */}
          <View style={{width: 336}}>
            {pane === 'locations' ? (
              <LocationsPane categories={sections} onClose={() => setPane('wellness')} />
            ) : (
              <WellnessPane categories={sections} />
            )}

            <ActionRow
              icon="calendar-outline"
              title="VIEW SCHEDULE"
              subtitle="Check timings and book your slot"
              onPress={() => openSchedule(firstOpen)}
            />
            <ActionRow
              icon="location-outline"
              title="FACILITY LOCATION"
              subtitle="Find your way around the hotel"
              active={pane === 'locations'}
              onPress={() => setPane(prev => (prev === 'locations' ? 'wellness' : 'locations'))}
            />
            <ActionRow
              icon="headset-outline"
              title="NEED ASSISTANCE?"
              subtitle="Press OK to connect with our team"
              onPress={() =>
                (rootNavigation as unknown as {navigate: (n: string) => void}).navigate(
                  'ReceptionTab',
                )
              }
            />
          </View>
        </View>

        <TvFooter marginTop={12} />
      </View>
    </SafeAreaView>
  );
}
