import React from 'react';
import {ActivityIndicator, ScrollView, Text, View} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {
  CenterState,
  DS,
  FONT,
  GlassButton,
  GlassPanel,
  GoldButton,
  MetaRow,
  TvPanelHeader,
  TvPressable,
  TvScreen,
} from '../../components/TvGlass';
import {useDincharyaViewModel} from '../../viewmodels';
import {useAuth} from '../../store/AuthContext';
import {getDisplayName} from '../../models/user.model';
import {
  DINCHARYA_ROW_TYPE,
  dayNumOf,
  longDateOf,
  monthOf,
  rowKindOf,
  rowTimeOf,
  weekdayOf,
} from '../../models/dincharya.model';
import type {DincharyaRow} from '../../models/dincharya.model';
import type {HomeStackParamList} from '../../navigation/types';

type Props = NativeStackScreenProps<HomeStackParamList, 'MyDay'>;

/**
 * My Day (TV) — the guest's Dincharya in the dashboard's glass.
 *
 * Same data as the phone screen (`MyDayScreen`) and the web /my-day page. The
 * layout is the frame every other TV page uses: the stay and the published
 * days on the left (a vertical list — a remote walks it up and down), the
 * day's timeline in the middle (scrolling INSIDE its panel so the top bar and
 * footer never move), and the day at a glance on the right.
 */

/** Row accents, tuned for the dark glass: rituals neutral, meals amber,
 *  therapies violet, hydration cyan. */
const KIND_COLOR: Record<string, string> = {
  [DINCHARYA_ROW_TYPE.COMMON]: DS.muted,
  [DINCHARYA_ROW_TYPE.MEAL]: '#F2C46D',
  [DINCHARYA_ROW_TYPE.THERAPY]: '#C4A7F5',
  [DINCHARYA_ROW_TYPE.HYDRATION]: '#8FD3E8',
};

const KIND_ICON: Record<string, string> = {
  [DINCHARYA_ROW_TYPE.COMMON]: 'leaf-outline',
  [DINCHARYA_ROW_TYPE.MEAL]: 'restaurant-outline',
  [DINCHARYA_ROW_TYPE.THERAPY]: 'flower-outline',
  [DINCHARYA_ROW_TYPE.HYDRATION]: 'water-outline',
};

const kindColor = (type: string): string => KIND_COLOR[type] ?? DS.muted;
const kindIcon = (type: string): string => KIND_ICON[type] ?? 'leaf-outline';

/** One published day in the left list. */
function DayButton({
  dateKey,
  active,
  onPress,
}: {
  dateKey: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TvPressable
      onPress={onPress}
      label={longDateOf(dateKey)}
      hasTVPreferredFocus={active}
      restBorderColor={active ? DS.gold : 'transparent'}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 7,
        paddingHorizontal: 10,
        marginBottom: 6,
        borderRadius: DS.radiusSm,
        backgroundColor: active ? DS.glassGold : 'rgba(255,255,255,0.06)',
      }}
    >
      <View style={{width: 36, alignItems: 'center'}}>
        <Text
          style={{
            color: active ? DS.gold : DS.muted,
            fontSize: 9,
            fontWeight: '700',
            letterSpacing: 0.8,
            fontFamily: FONT,
          }}
        >
          {weekdayOf(dateKey).toUpperCase()}
        </Text>
        <Text
          style={{
            color: active ? DS.gold : DS.text,
            fontSize: 17,
            fontWeight: '700',
            fontFamily: FONT,
          }}
        >
          {dayNumOf(dateKey)}
        </Text>
      </View>
      <Text
        numberOfLines={1}
        style={{
          flex: 1,
          marginLeft: 10,
          color: active ? DS.text : DS.text2,
          fontSize: 12,
          fontFamily: FONT,
        }}
      >
        {monthOf(dateKey)} {dayNumOf(dateKey)}
      </Text>
      {active ? <Icon name="chevron-forward" size={14} color={DS.gold} /> : null}
    </TvPressable>
  );
}

/**
 * One timeline entry. Focusable no-op so the D-pad can walk (and thereby
 * scroll) a long day — the same reason the bill's ledger rows are focusable.
 */
function TimelineRow({row, last}: {row: DincharyaRow; last: boolean}) {
  const color = kindColor(row.type);
  return (
    <View style={{flexDirection: 'row'}}>
      {/* time column */}
      {/* wide enough for "10:00 AM – 11:00 AM" on one line */}
      <View style={{width: 138, paddingTop: 10}}>
        <Text style={{color: DS.text, fontSize: 12, fontWeight: '600', fontFamily: FONT}}>
          {rowTimeOf(row)}
        </Text>
      </View>

      {/* rail */}
      <View style={{width: 18, alignItems: 'center', paddingTop: 13}}>
        <View style={{width: 10, height: 10, borderRadius: 5, backgroundColor: color}} />
        {!last ? (
          <View style={{width: 1, flex: 1, marginTop: 4, backgroundColor: DS.divider}} />
        ) : null}
      </View>

      <View style={{flex: 1, marginLeft: 8, paddingBottom: 10}}>
        <TvPressable
          onPress={() => {}}
          label={`${rowTimeOf(row)}, ${row.label}`}
          style={{
            flexDirection: 'row',
            alignItems: 'flex-start',
            paddingVertical: 10,
            paddingHorizontal: 12,
            borderRadius: DS.radiusSm,
            backgroundColor: 'rgba(255,255,255,0.07)',
          }}
        >
          <View
            style={{
              width: 30,
              height: 30,
              borderRadius: 9,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: `${color}2b`,
            }}
          >
            <Icon name={kindIcon(row.type)} size={15} color={color} />
          </View>
          <View style={{flex: 1, marginLeft: 12}}>
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
              <Text
                numberOfLines={1}
                style={{
                  flex: 1,
                  color: DS.text,
                  fontSize: 14,
                  fontWeight: '600',
                  fontFamily: FONT,
                }}
              >
                {row.label}
              </Text>
              <Text
                style={{
                  color,
                  fontSize: 9,
                  fontWeight: '700',
                  letterSpacing: 1,
                  marginLeft: 10,
                  fontFamily: FONT,
                }}
              >
                {rowKindOf(row.type).toUpperCase()}
              </Text>
            </View>
            {row.text ? (
              <Text
                style={{
                  color: DS.text2,
                  fontSize: 11,
                  lineHeight: 16,
                  marginTop: 3,
                  fontFamily: FONT,
                }}
              >
                {row.text}
              </Text>
            ) : null}
            {row.locationLabel ? (
              <View style={{flexDirection: 'row', alignItems: 'center', marginTop: 5}}>
                <Icon name="location-outline" size={12} color={DS.good} />
                <Text
                  numberOfLines={1}
                  style={{flex: 1, color: DS.good, fontSize: 10, marginLeft: 4, fontFamily: FONT}}
                >
                  {row.locationLabel}
                </Text>
              </View>
            ) : null}
          </View>
        </TvPressable>
      </View>
    </View>
  );
}

/** "3 Meals" with its accent dot — the right panel's day at a glance. */
function GlanceRow({type, count, noun}: {type: string; count: number; noun: string}) {
  return (
    <View style={{flexDirection: 'row', alignItems: 'center', paddingVertical: 7}}>
      <View
        style={{
          width: 28,
          height: 28,
          borderRadius: 8,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: `${kindColor(type)}2b`,
        }}
      >
        <Icon name={kindIcon(type)} size={14} color={kindColor(type)} />
      </View>
      <Text style={{flex: 1, color: DS.text2, fontSize: 12, marginLeft: 10, fontFamily: FONT}}>
        {noun}
      </Text>
      <Text style={{color: DS.text, fontSize: 15, fontWeight: '700', fontFamily: FONT}}>
        {count}
      </Text>
    </View>
  );
}

export function TvMyDayScreen({navigation}: Props) {
  const vm = useDincharyaViewModel();
  const {user, session} = useAuth();
  const rootNavigation = useNavigation();
  const toReception = () =>
    (rootNavigation as unknown as {navigate: (n: string) => void}).navigate('ReceptionTab');

  const roomNumber = session?.booking?.roomData?.roomNumber;
  const hasDay = !vm.isLoading && !vm.error && !vm.unavailable && !vm.isEmpty;

  return (
    <TvScreen>
      <View style={{flex: 1, flexDirection: 'row', marginTop: 16}}>
        {/* ── Left: the stay and its published days ── */}
        <View style={{width: 258, marginRight: DS.gap}}>
          <GlassPanel style={{flex: 1, padding: 12}}>
            <TvPanelHeader
              title="My Day"
              subtitle="Your daily wellness rhythm"
              onBack={() => navigation.goBack()}
            />

            <MetaRow icon="person-outline" label="Guest" value={getDisplayName(user)} />
            <View style={{height: 1, backgroundColor: DS.divider}} />
            <MetaRow
              icon="bed-outline"
              label="Room"
              value={roomNumber != null ? String(roomNumber) : undefined}
            />

            {vm.publishedDates.length > 0 ? (
              <>
                <Text
                  style={{
                    color: DS.muted,
                    fontSize: 10,
                    fontWeight: '600',
                    letterSpacing: 1,
                    marginTop: 14,
                    marginBottom: 8,
                    fontFamily: FONT,
                  }}
                >
                  YOUR DAYS ({vm.publishedDates.length})
                </Text>
                <ScrollView style={{flex: 1}} showsVerticalScrollIndicator={false}>
                  {vm.publishedDates.map(key => (
                    <DayButton
                      key={key}
                      dateKey={key}
                      active={key === vm.activeDate}
                      onPress={() => vm.selectDate(key)}
                    />
                  ))}
                </ScrollView>
              </>
            ) : (
              <View style={{flex: 1}} />
            )}
          </GlassPanel>

          <GlassButton
            label={vm.isFetching && !vm.isLoading ? 'Refreshing…' : 'Refresh'}
            icon="refresh"
            onPress={() => void vm.refetch()}
            height={44}
            style={{marginTop: DS.gap, borderRadius: DS.radius}}
          />
        </View>

        {/* ── Middle: the day's timeline ── */}
        <GlassPanel style={{flex: 1, marginRight: DS.gap, padding: 16}}>
          {vm.isLoading ? (
            <View style={{flex: 1, alignItems: 'center', justifyContent: 'center'}}>
              <ActivityIndicator size="large" color={DS.gold} />
              <Text style={{color: DS.text2, fontSize: 12, marginTop: 14, fontFamily: FONT}}>
                Loading your day…
              </Text>
            </View>
          ) : vm.error ? (
            <CenterState
              icon="alert-circle-outline"
              title="Could not load your day"
              message={vm.error}
            >
              <GoldButton
                label="Try Again"
                icon="refresh"
                onPress={() => void vm.refetch()}
                hasTVPreferredFocus
                style={{marginTop: 18, paddingHorizontal: 24}}
              />
            </CenterState>
          ) : vm.unavailable ? (
            <CenterState
              icon="sunny-outline"
              title="Not available at this hotel"
              message="My Day is offered by hotels with a wellness programme."
            />
          ) : vm.isEmpty ? (
            <CenterState
              icon="sunny-outline"
              title="Nothing scheduled yet"
              message="Your wellness team will share your daily rhythm here once it is ready."
            />
          ) : (
            <>
              <View style={{flexDirection: 'row', alignItems: 'flex-end', marginBottom: 14}}>
                <View style={{flex: 1}}>
                  <Text
                    style={{
                      color: DS.text,
                      fontSize: 16,
                      fontWeight: '600',
                      letterSpacing: 1,
                      fontFamily: FONT,
                    }}
                  >
                    {longDateOf(vm.activeDate).toUpperCase()}
                  </Text>
                  {vm.day?.dietDayNumber != null ? (
                    <Text style={{color: DS.muted, fontSize: 11, marginTop: 3, fontFamily: FONT}}>
                      Diet Day {vm.day.dietDayNumber}
                      {vm.day.dietMenuNumber != null ? ` · Menu ${vm.day.dietMenuNumber}` : ''}
                    </Text>
                  ) : null}
                </View>
                {vm.isFetching ? <ActivityIndicator size="small" color={DS.gold} /> : null}
              </View>

              <ScrollView style={{flex: 1}} showsVerticalScrollIndicator={false}>
                {vm.rows.map((row, index) => (
                  <TimelineRow
                    key={`${row.minute}-${row.type}-${index}`}
                    row={row}
                    last={index === vm.rows.length - 1}
                  />
                ))}
              </ScrollView>
            </>
          )}
        </GlassPanel>

        {/* ── Right: the day at a glance ── */}
        <GlassPanel style={{width: 300, padding: 16}}>
          <Text
            style={{
              color: DS.text,
              fontSize: 14,
              fontWeight: '700',
              letterSpacing: 1,
              marginBottom: 8,
              fontFamily: FONT,
            }}
          >
            DAY AT A GLANCE
          </Text>

          {hasDay ? (
            <>
              <GlanceRow
                type={DINCHARYA_ROW_TYPE.THERAPY}
                count={vm.counts.therapies}
                noun="Therapies"
              />
              <GlanceRow type={DINCHARYA_ROW_TYPE.MEAL} count={vm.counts.meals} noun="Meals" />
              <GlanceRow
                type={DINCHARYA_ROW_TYPE.HYDRATION}
                count={vm.counts.hydration}
                noun="Hydration"
              />
              <GlanceRow
                type={DINCHARYA_ROW_TYPE.COMMON}
                count={vm.counts.rituals}
                noun="Rituals"
              />
            </>
          ) : vm.unavailable ? null : (
            <Text style={{color: DS.muted, fontSize: 11, lineHeight: 16, fontFamily: FONT}}>
              Your therapies, meals and rituals for the day show here once your plan is shared.
            </Text>
          )}

          <View style={{flex: 1}} />

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'flex-start',
              paddingHorizontal: 12,
              paddingVertical: 11,
              borderRadius: DS.radiusSm,
              backgroundColor: 'rgba(255,255,255,0.08)',
            }}
          >
            <Icon name="information-circle-outline" size={15} color={DS.gold} />
            <Text
              style={{
                flex: 1,
                color: DS.text2,
                fontSize: 10,
                lineHeight: 15,
                marginLeft: 8,
                fontFamily: FONT,
              }}
            >
              Timings follow the hotel’s schedule. Speak to your wellness team for any change.
            </Text>
          </View>

          <GlassButton
            label="Ask Reception"
            icon="headset-outline"
            onPress={toReception}
            height={42}
            style={{marginTop: DS.gap}}
          />
        </GlassPanel>
      </View>
    </TvScreen>
  );
}
