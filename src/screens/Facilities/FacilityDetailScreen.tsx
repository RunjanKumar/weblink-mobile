import React, {useState} from 'react';
import {ScrollView, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Button} from '../../components';
import {useTheme} from '../../theme';
import {IS_TV} from '../../utils/responsive';
import {formatTime12h, formatDays} from '../../utils/format';
import {FacilityHero} from './components/FacilityHero';
import type {HomeStackParamList} from '../../navigation/types';

type Props = NativeStackScreenProps<HomeStackParamList, 'FacilityDetail'>;

/**
 * Reference `InfoSection.jsx`: STACKED block — semibold label heading on its
 * own line, value paragraph beneath. No icons, no card container.
 */
function InfoSection({label, value}: {label: string; value?: string | null}) {
  const {theme} = useTheme();
  if (!value) {
    return null;
  }
  return (
    <View style={{marginTop: 20}}>
      <Text
        style={{
          color: theme.colors.text,
          fontSize: IS_TV ? 20 : 17,
          fontWeight: '600',
          marginBottom: 4,
        }}>
        {label}
      </Text>
      <Text style={{color: theme.colors.textSecondary, fontSize: IS_TV ? 17 : 15, lineHeight: IS_TV ? 26 : 22}}>
        {value}
      </Text>
    </View>
  );
}

/**
 * Facility detail — reference `FacilityDetail.jsx`: hero + overlay back,
 * large accent-colored facility name, "Description" with an INLINE Show More /
 * Show Less toggle, stacked info sections in the reference order (Type,
 * Cuisine, Timings, Available Days, Location, Location Area, Pricing,
 * Contact, Capacity, Area), then the availability CTA.
 */
export function FacilityDetailScreen({navigation, route}: Props) {
  const {theme} = useTheme();
  const {facility} = route.params;
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
    <SafeAreaView style={{flex: 1, backgroundColor: theme.colors.background}} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={{paddingBottom: 24}}>
        <FacilityHero image={facility.image} onBack={() => navigation.goBack()} />

        <View style={{paddingHorizontal: 20, paddingTop: 16}}>
          <Text
            style={{
              color: theme.colors.primary,
              fontSize: IS_TV ? 32 : 26,
              fontWeight: '700',
            }}>
            {facility.name}
          </Text>

          {description ? (
            <View style={{marginTop: 20}}>
              <Text
                style={{
                  color: theme.colors.text,
                  fontSize: IS_TV ? 20 : 17,
                  fontWeight: '600',
                  marginBottom: 4,
                }}>
                Description
              </Text>
              <Text
                style={{
                  color: theme.colors.textSecondary,
                  fontSize: IS_TV ? 17 : 15,
                  lineHeight: IS_TV ? 26 : 22,
                }}>
                {shownDescription}
                {isLong ? (
                  <Text
                    onPress={() => setExpanded(e => !e)}
                    style={{color: theme.colors.primary, fontWeight: '600'}}>
                    {' '}
                    {expanded ? 'Show Less' : 'Show More'}
                  </Text>
                ) : null}
              </Text>
            </View>
          ) : null}

          {/* Reference order (facilityDetailViewModel.js) */}
          <InfoSection label="Type" value={facility.type} />
          <InfoSection label="Cuisine" value={facility.cuisine} />
          <InfoSection label="Timings" value={timings} />
          <InfoSection label="Available Days" value={formatDays(facility.days)} />
          <InfoSection label="Location" value={facility.location} />
          <InfoSection label="Location Area" value={facility.locationlink} />
          <InfoSection
            label="Pricing"
            value={facility.pricing != null ? `₹ ${facility.pricing}` : undefined}
          />
          <InfoSection label="Contact" value={facility.phoneNumber} />
          <InfoSection
            label="Capacity"
            value={facility.capacity != null ? `${facility.capacity} people` : undefined}
          />
          <InfoSection label="Area" value={facility.area} />

          <View style={{marginTop: 28}}>
            <Button
              label={available ? 'Check Availability' : 'Currently unavailable'}
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
