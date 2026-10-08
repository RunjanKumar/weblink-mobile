import React from 'react';
import {Pressable, ScrollView, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Card, EmptyState, ErrorState, Header, Loader, RefreshButton} from '../../components';
import {useDincharyaViewModel} from '../../viewmodels';
import {useAuth} from '../../store/AuthContext';
import {useTVFocus} from '../../hooks/useTVFocus';
import {useTheme} from '../../theme';
import {IS_TV} from '../../utils/responsive';
import {
  DINCHARYA_ROW_TYPE,
  dayNumOf,
  longDateOf,
  rowKindOf,
  rowTimeOf,
  weekdayOf,
} from '../../models/dincharya.model';
import type {DincharyaRow} from '../../models/dincharya.model';
import type {HomeStackParamList} from '../../navigation/types';

type Props = NativeStackScreenProps<HomeStackParamList, 'MyDay'>;

/**
 * My Day — the guest's Dincharya (daily wellness rhythm), as on the web app's
 * /my-day page: a strip of the published dates, the day's header, then the
 * timeline. Only days the wellness team PUBLISHED exist here; there is nothing
 * else to browse.
 *
 * Each kind of row keeps its own accent so the day reads at a glance —
 * rituals neutral, meals amber, therapies violet, hydration cyan.
 */

const KIND_COLORS = {
  dark: {
    [DINCHARYA_ROW_TYPE.COMMON]: '#9ca3af',
    [DINCHARYA_ROW_TYPE.MEAL]: '#fbbf24',
    [DINCHARYA_ROW_TYPE.THERAPY]: '#a78bfa',
    [DINCHARYA_ROW_TYPE.HYDRATION]: '#22d3ee',
  },
  // Same hues at their 700 weights so they hold up on the light cards.
  light: {
    [DINCHARYA_ROW_TYPE.COMMON]: '#4b5563',
    [DINCHARYA_ROW_TYPE.MEAL]: '#b45309',
    [DINCHARYA_ROW_TYPE.THERAPY]: '#6d28d9',
    [DINCHARYA_ROW_TYPE.HYDRATION]: '#0e7490',
  },
} as const;

function useKindColor() {
  const {scheme, theme} = useTheme();
  const palette: Record<string, string> = KIND_COLORS[scheme];
  return (type: string): string =>
    palette[type] ?? palette[DINCHARYA_ROW_TYPE.COMMON] ?? theme.colors.muted;
}

function DateChip({
  dateKey,
  active,
  onPress,
}: {
  dateKey: string;
  active: boolean;
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
      accessibilityState={{selected: active}}
      accessibilityLabel={longDateOf(dateKey)}
      style={{
        width: IS_TV ? 64 : 52,
        paddingVertical: 8,
        marginRight: 8,
        borderRadius: 16,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: focused
          ? theme.colors.focusRing
          : active
            ? theme.colors.primary
            : theme.colors.border,
        backgroundColor: active ? theme.colors.primary : theme.colors.surface,
      }}
    >
      <Text
        style={{
          fontSize: 10,
          fontWeight: '600',
          color: active ? theme.colors.primaryForeground : theme.colors.muted,
        }}
      >
        {weekdayOf(dateKey)}
      </Text>
      <Text
        style={{
          fontSize: 16,
          fontWeight: '700',
          color: active ? theme.colors.primaryForeground : theme.colors.text,
        }}
      >
        {dayNumOf(dateKey)}
      </Text>
    </Pressable>
  );
}

/**
 * One timeline entry. Focusable no-op so the D-pad can walk (and thereby
 * scroll) a long day on a TV; inert on the phone.
 */
function TimelineRow({row, last}: {row: DincharyaRow; last: boolean}) {
  const {theme} = useTheme();
  const kindColor = useKindColor();
  const {focused, onFocus, onBlur} = useTVFocus();
  const color = kindColor(row.type);
  return (
    <View style={{flexDirection: 'row'}}>
      {/* rail */}
      <View style={{width: 14, alignItems: 'center', paddingTop: 6}}>
        <View style={{width: 10, height: 10, borderRadius: 5, backgroundColor: color}} />
        {!last ? (
          <View style={{width: 1, flex: 1, marginTop: 4, backgroundColor: theme.colors.border}} />
        ) : null}
      </View>

      <View style={{flex: 1, marginLeft: 10, paddingBottom: 18}}>
        <View
          style={{flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between'}}
        >
          <Text className="font-semibold text-content" style={{fontSize: IS_TV ? 15 : 13}}>
            {rowTimeOf(row)}
          </Text>
          <Text
            style={{
              color,
              fontSize: 10,
              fontWeight: '700',
              letterSpacing: 0.6,
              marginLeft: 12,
            }}
          >
            {rowKindOf(row.type).toUpperCase()}
          </Text>
        </View>

        <Pressable
          focusable
          onFocus={onFocus}
          onBlur={onBlur}
          accessibilityLabel={`${rowTimeOf(row)}, ${row.label}`}
          className="rounded-2xl bg-surface"
          style={{
            marginTop: 6,
            paddingHorizontal: 14,
            paddingVertical: 12,
            borderWidth: focused ? 2 : 1,
            borderColor: focused ? theme.colors.focusRing : theme.colors.border,
          }}
        >
          <Text className="font-semibold text-content" style={{fontSize: IS_TV ? 16 : 14}}>
            {row.label}
          </Text>
          {row.text ? (
            <Text
              className="text-content-secondary"
              style={{fontSize: IS_TV ? 14 : 13, marginTop: 4, lineHeight: IS_TV ? 20 : 19}}
            >
              {row.text}
            </Text>
          ) : null}
          {row.locationLabel ? (
            <View style={{flexDirection: 'row', alignItems: 'center', marginTop: 8}}>
              <Icon name="location-outline" size={13} color={theme.colors.success} />
              <Text style={{color: theme.colors.success, fontSize: 12, marginLeft: 4, flex: 1}}>
                {row.locationLabel}
              </Text>
            </View>
          ) : null}
        </Pressable>
      </View>
    </View>
  );
}

export function MyDayScreen({navigation}: Props) {
  const {theme} = useTheme();
  const {session} = useAuth();
  const vm = useDincharyaViewModel();
  const roomNumber = session?.booking?.roomData?.roomNumber;

  const headerRight =
    !vm.isLoading && !vm.error && !vm.unavailable ? (
      <RefreshButton
        onPress={() => vm.refetch()}
        busy={vm.isFetching}
        accessibilityLabel="Refresh my day"
      />
    ) : undefined;

  return (
    <SafeAreaView style={{flex: 1, backgroundColor: theme.colors.background}} edges={['top']}>
      <Header
        title="My Day"
        subtitle={`Your daily wellness rhythm${roomNumber != null ? ` · Room ${roomNumber}` : ''}`}
        onBack={() => navigation.goBack()}
        right={headerRight}
      />

      {vm.isLoading ? (
        <Loader label="Loading your day…" />
      ) : vm.error ? (
        <ErrorState message={vm.error} onRetry={() => vm.refetch()} />
      ) : vm.unavailable ? (
        <EmptyState
          icon="sunny-outline"
          title="Not available at this hotel"
          message="My Day is offered by hotels with a wellness programme."
        />
      ) : vm.isEmpty ? (
        <EmptyState
          icon="sunny-outline"
          title="Nothing scheduled yet"
          message="Your wellness team will share your daily rhythm here once it is ready."
        />
      ) : (
        <ScrollView contentContainerStyle={{paddingHorizontal: 20, paddingBottom: 28}}>
          {/* One chip per published day. A single day is just the header below. */}
          {vm.publishedDates.length > 1 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{marginBottom: 16, marginHorizontal: -20}}
              contentContainerStyle={{paddingHorizontal: 20}}
            >
              {vm.publishedDates.map(key => (
                <DateChip
                  key={key}
                  dateKey={key}
                  active={key === vm.activeDate}
                  onPress={() => vm.selectDate(key)}
                />
              ))}
            </ScrollView>
          ) : null}

          <Card>
            <Text className="font-semibold text-content" style={{fontSize: IS_TV ? 17 : 15}}>
              {longDateOf(vm.activeDate)}
            </Text>
            {vm.day?.dietDayNumber != null ? (
              <Text className="text-content-tertiary" style={{fontSize: 12, marginTop: 4}}>
                Diet Day {vm.day.dietDayNumber}
                {vm.day.dietMenuNumber != null ? ` · Menu ${vm.day.dietMenuNumber}` : ''}
              </Text>
            ) : null}
          </Card>

          <View style={{marginTop: 18}}>
            {vm.rows.map((row, index) => (
              <TimelineRow
                key={`${row.minute}-${row.type}-${index}`}
                row={row}
                last={index === vm.rows.length - 1}
              />
            ))}
          </View>

          <Text
            className="text-content-tertiary"
            style={{fontSize: IS_TV ? 13 : 11, textAlign: 'center', marginTop: 8}}
          >
            Timings follow the hotel’s schedule. Speak to your wellness team for any change.
          </Text>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
