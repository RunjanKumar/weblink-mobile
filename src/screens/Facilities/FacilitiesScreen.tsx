import React from 'react';
import {Platform, Pressable, ScrollView, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {AppImage, ErrorState, Header, Loader} from '../../components';
import {useFacilitiesViewModel} from '../../viewmodels';
import {useTVFocus} from '../../hooks/useTVFocus';
import {useTheme} from '../../theme';
import {IS_TV} from '../../utils/responsive';
import {formatTime12h, formatDays} from '../../utils/format';
import type {FacilityType} from '../../models/facility.model';
import type {HomeStackParamList} from '../../navigation/types';

type Props = NativeStackScreenProps<HomeStackParamList, 'Facilities'>;

/** Reference `FacilityTabs.jsx`: circular category thumbnail + label pills. */
function Tab({
  label,
  imageUrl,
  active,
  onPress,
}: {
  label: string;
  imageUrl?: string;
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
      accessibilityRole="tab"
      accessibilityState={{selected: active}}
      className="flex-row items-center"
      style={{
        gap: 8,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 999,
        marginRight: 10,
        backgroundColor: active ? theme.colors.primary : theme.colors.surface,
        borderWidth: 2,
        borderColor: focused ? theme.colors.focusRing : active ? theme.colors.primary : theme.colors.border,
        transform: [{scale: focused ? 1.05 : 1}],
      }}>
      <View style={{width: 32, height: 32, borderRadius: 16, overflow: 'hidden'}}>
        <AppImage
          src={imageUrl}
          fallbackIcon="business-outline"
          fallbackIconSize={16}
          style={{width: '100%', height: '100%'}}
          resizeMode="cover"
        />
      </View>
      <Text
        style={{
          color: active ? theme.colors.primaryForeground : theme.colors.textSecondary,
          fontSize: 13,
          fontWeight: '600',
        }}>
        {label}
      </Text>
    </Pressable>
  );
}

/**
 * Reference `FacilityCard.jsx`: HORIZONTAL card — text column left (accent-
 * bordered name, cuisine, timings in accent, days, 📍 location), fixed-width
 * full-height image right. Unavailable = dim + grayscale + badge row below.
 */
function FacilityCard({facility, onPress}: {facility: FacilityType; onPress: () => void}) {
  const {theme} = useTheme();
  const {focused, onFocus, onBlur} = useTVFocus();
  const available = facility.isAvailable !== false;
  const timings =
    facility.startTime && facility.endTime
      ? `${formatTime12h(facility.startTime)} – ${formatTime12h(facility.endTime)}`
      : null;

  return (
    <Pressable
      onPress={onPress}
      onFocus={onFocus}
      onBlur={onBlur}
      focusable
      accessibilityRole="button"
      accessibilityLabel={facility.name}
      className="mb-3">
      <View
        style={[
          {
            flexDirection: 'row',
            borderRadius: 20,
            overflow: 'hidden',
            backgroundColor: theme.colors.surface,
            borderWidth: focused ? 2 : 1,
            borderColor: focused ? theme.colors.focusRing : theme.colors.border,
            opacity: available ? 1 : 0.4,
            transform: [{scale: focused ? 1.02 : 1}],
          },
          !available && Platform.OS === 'web' ? ({filter: 'grayscale(1)'} as object) : null,
        ]}>
        {/* Left: text column */}
        <View style={{flex: 1, padding: 16, minWidth: 0}}>
          <View
            style={{
              borderLeftWidth: 2,
              borderLeftColor: theme.colors.primary,
              paddingLeft: 10,
              marginBottom: 8,
            }}>
            <Text
              numberOfLines={1}
              style={{color: theme.colors.text, fontSize: IS_TV ? 20 : 17, fontWeight: '700'}}>
              {facility.name}
            </Text>
          </View>
          {facility.cuisine ? (
            <Text
              numberOfLines={1}
              style={{color: theme.colors.textTertiary, fontSize: 13, marginBottom: 4}}>
              {facility.cuisine}
            </Text>
          ) : null}
          {timings ? (
            <Text style={{color: theme.colors.primary, fontSize: 13, fontWeight: '600', marginBottom: 4}}>
              {timings}
            </Text>
          ) : null}
          {facility.days && facility.days.length > 0 ? (
            <Text numberOfLines={1} style={{color: theme.colors.textTertiary, fontSize: 12, marginBottom: 4}}>
              {formatDays(facility.days)}
            </Text>
          ) : null}
          {facility.location ? (
            <Text numberOfLines={1} style={{color: theme.colors.textTertiary, fontSize: 12}}>
              📍 {facility.location}
            </Text>
          ) : null}
        </View>
        {/* Right: fixed-width full-height image. Absolutely filled — a
            percentage height in this auto-height row resolves to the image's
            intrinsic pixel height and stretches the card to the source size. */}
        <View style={{width: 130, flexShrink: 0, alignSelf: 'stretch', minHeight: 120}}>
          <AppImage
            src={facility.image}
            fallbackIcon="image-outline"
            fallbackIconSize={30}
            style={{position: 'absolute', top: 0, left: 0, right: 0, bottom: 0}}
            resizeMode="cover"
          />
        </View>
      </View>
      {!available ? (
        <Text style={{color: theme.colors.danger, fontSize: 12, fontWeight: '600', marginTop: 6}}>
          Currently Unavailable
        </Text>
      ) : null}
    </Pressable>
  );
}

export function FacilitiesScreen({navigation}: Props) {
  const {theme} = useTheme();
  const vm = useFacilitiesViewModel();

  const headerRight = (
    <Pressable
      onPress={() => navigation.navigate('FacilityBookings')}
      focusable
      accessibilityRole="button"
      accessibilityLabel="My bookings"
      className="rounded-full bg-surface-elevated px-3 py-2">
      <Text className="text-xs font-semibold text-primary">My Bookings</Text>
    </Pressable>
  );

  return (
    <SafeAreaView style={{flex: 1, backgroundColor: theme.colors.background}} edges={['top']}>
      <Header
        title="Facilities"
        onBack={navigation.canGoBack() ? () => navigation.goBack() : undefined}
        right={headerRight}
      />

      {vm.isLoading ? (
        <Loader label="Loading facilities…" />
      ) : vm.error ? (
        <ErrorState message={vm.error} onRetry={vm.refetch} />
      ) : vm.categories.length === 0 ? (
        <Text className="mt-10 px-8 text-center text-sm text-content-tertiary">
          No facilities available.
        </Text>
      ) : (
        <>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{paddingHorizontal: 20, paddingVertical: 4, alignItems: 'center'}}
            style={{maxHeight: 60}}>
            {vm.facilityTypes.map(t => (
              <Tab
                key={t.id}
                label={t.label}
                imageUrl={t.imageUrl}
                active={vm.activeType === t.id}
                onPress={() => vm.setActiveType(t.id)}
              />
            ))}
          </ScrollView>

          <ScrollView contentContainerStyle={{paddingHorizontal: 20, paddingBottom: 24, paddingTop: 8}}>
            {vm.facilities.length === 0 ? (
              <Text className="mt-8 text-center text-sm text-content-tertiary">
                Nothing in this category yet.
              </Text>
            ) : (
              vm.facilities.map(f => (
                <FacilityCard
                  key={f._id}
                  facility={f}
                  onPress={() =>
                    navigation.navigate('FacilityDetail', {
                      facility: f,
                      categoryName: vm.activeCategory?.name,
                    })
                  }
                />
              ))
            )}
          </ScrollView>
        </>
      )}
    </SafeAreaView>
  );
}
