import React from 'react';
import {Image, Pressable, ScrollView, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Card, ErrorState, Header, Loader} from '../../components';
import {useFacilitiesViewModel} from '../../viewmodels';
import {useTVFocus} from '../../hooks/useTVFocus';
import {useTheme} from '../../theme';
import type {FacilityType} from '../../models/facility.model';
import type {HomeStackParamList} from '../../navigation/types';

type Props = NativeStackScreenProps<HomeStackParamList, 'Facilities'>;

function Tab({label, active, onPress}: {label: string; active: boolean; onPress: () => void}) {
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
      style={{
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 999,
        marginRight: 8,
        backgroundColor: active ? theme.colors.primary : theme.colors.surface,
        borderWidth: 2,
        borderColor: focused ? theme.colors.focusRing : active ? theme.colors.primary : theme.colors.border,
      }}>
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

function FacilityCard({facility, onPress}: {facility: FacilityType; onPress: () => void}) {
  const {theme} = useTheme();
  const {focused, onFocus, onBlur} = useTVFocus();
  const available = facility.isAvailable !== false;
  return (
    <Pressable
      onPress={available ? onPress : undefined}
      onFocus={onFocus}
      onBlur={onBlur}
      focusable={available}
      disabled={!available}
      accessibilityRole="button"
      accessibilityLabel={facility.name}
      className="mb-3">
      <Card
        className="overflow-hidden p-0"
        style={{
          borderColor: focused ? theme.colors.focusRing : theme.colors.border,
          borderWidth: focused ? 2 : 1,
          opacity: available ? 1 : 0.5,
        }}>
        {facility.image ? (
          <Image
            source={{uri: facility.image}}
            style={{width: '100%', height: 150}}
            resizeMode="cover"
          />
        ) : (
          <View className="h-[150px] items-center justify-center bg-surface-elevated">
            <Icon name="image-outline" size={40} color={theme.colors.muted} />
          </View>
        )}
        <View className="p-4">
          <View className="flex-row items-center justify-between">
            <Text className="flex-1 pr-2 text-base font-bold text-content">{facility.name}</Text>
            {!available ? (
              <Text className="text-[11px] font-semibold text-danger">Unavailable</Text>
            ) : (
              <Icon name="chevron-forward" size={18} color={theme.colors.muted} />
            )}
          </View>
          {facility.description ? (
            <Text className="mt-1 text-xs text-content-tertiary" numberOfLines={2}>
              {facility.description}
            </Text>
          ) : null}
        </View>
      </Card>
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
      <Header title="Facilities" onBack={() => navigation.goBack()} right={headerRight} />

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
            contentContainerStyle={{paddingHorizontal: 20, paddingVertical: 4}}
            style={{maxHeight: 52}}>
            {vm.facilityTypes.map(t => (
              <Tab
                key={t.id}
                label={t.label}
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
