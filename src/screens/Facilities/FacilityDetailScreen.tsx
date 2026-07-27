import React, {useState} from 'react';
import {Image, Pressable, ScrollView, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Button, Header} from '../../components';
import {useTheme} from '../../theme';
import {formatTime12h, formatDays} from '../../utils/format';
import type {HomeStackParamList} from '../../navigation/types';

type Props = NativeStackScreenProps<HomeStackParamList, 'FacilityDetail'>;

function InfoRow({icon, label, value}: {icon: string; label: string; value?: string}) {
  const {theme} = useTheme();
  if (!value) {
    return null;
  }
  return (
    <View className="flex-row items-start py-3">
      <Icon name={icon} size={18} color={theme.colors.primary} />
      <Text className="ml-3 w-28 text-xs text-content-tertiary">{label}</Text>
      <Text className="flex-1 text-sm text-content-secondary">{value}</Text>
    </View>
  );
}

export function FacilityDetailScreen({navigation, route}: Props) {
  const {theme} = useTheme();
  const {facility, categoryName} = route.params;
  const [expanded, setExpanded] = useState(false);
  const available = facility.isAvailable !== false;

  const timings =
    facility.startTime && facility.endTime
      ? `${formatTime12h(facility.startTime)} – ${formatTime12h(facility.endTime)}`
      : undefined;
  const description = facility.description ?? '';
  const isLong = description.length > 150;
  const shownDescription = expanded || !isLong ? description : `${description.slice(0, 150)}…`;

  return (
    <SafeAreaView style={{flex: 1, backgroundColor: theme.colors.background}} edges={['top']}>
      <Header title={facility.name ?? 'Facility'} subtitle={categoryName} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{paddingBottom: 24}}>
        {facility.image ? (
          <Image source={{uri: facility.image}} style={{width: '100%', height: 200}} resizeMode="cover" />
        ) : null}

        <View className="px-5 pt-4">
          {description ? (
            <>
              <Text className="text-sm leading-5 text-content-secondary">{shownDescription}</Text>
              {isLong ? (
                <Pressable onPress={() => setExpanded(e => !e)} focusable accessibilityRole="button">
                  <Text className="mt-1 text-xs font-semibold text-primary">
                    {expanded ? 'Show less' : 'Show more'}
                  </Text>
                </Pressable>
              ) : null}
            </>
          ) : null}

          <View className="mt-4 rounded-2xl border border-border bg-surface px-4">
            <InfoRow icon="time-outline" label="Timings" value={timings} />
            <InfoRow icon="calendar-outline" label="Days" value={formatDays(facility.days)} />
            <InfoRow icon="restaurant-outline" label="Cuisine" value={facility.cuisine} />
            <InfoRow icon="location-outline" label="Location" value={facility.location} />
            <InfoRow
              icon="pricetag-outline"
              label="Pricing"
              value={facility.pricing != null ? `₹ ${facility.pricing}` : undefined}
            />
            <InfoRow icon="call-outline" label="Contact" value={facility.phoneNumber} />
            <InfoRow
              icon="people-outline"
              label="Capacity"
              value={facility.capacity != null ? `${facility.capacity} people` : undefined}
            />
            <InfoRow icon="resize-outline" label="Area" value={facility.area} />
          </View>

          <View className="mt-6">
            <Button
              label={available ? 'Check availability' : 'Currently unavailable'}
              disabled={!available}
              onPress={() => navigation.navigate('FacilityReserve', {facility})}
              fullWidth
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
