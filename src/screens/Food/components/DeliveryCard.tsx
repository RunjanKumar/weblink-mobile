import React from 'react';
import {Text, View} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {useTheme} from '../../../theme';
import {IS_TV} from '../../../utils/responsive';

function InfoRow({
  icon,
  children,
  last,
}: {
  icon: string;
  children: React.ReactNode;
  last?: boolean;
}) {
  const {theme} = useTheme();
  return (
    <View
      className="flex-row items-center"
      style={{
        gap: 12,
        paddingVertical: 12,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: theme.colors.border,
        borderStyle: 'dashed',
      }}>
      <Icon name={icon} size={18} color={theme.colors.primary} />
      <Text style={{color: theme.colors.textSecondary, fontSize: IS_TV ? 16 : 13, flex: 1}}>
        {children}
      </Text>
    </View>
  );
}

/** Reference delivery card: fixed 30-minute promise, room, guest contact. */
export function DeliveryCard({
  roomNumber,
  guestName,
  guestPhone,
}: {
  roomNumber: string | number | null;
  guestName: string;
  guestPhone: string;
}) {
  const {theme} = useTheme();
  const strong = {color: theme.colors.text, fontWeight: '700' as const};
  return (
    <View
      style={{
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: 12,
        paddingHorizontal: 16,
      }}>
      <InfoRow icon="time-outline">
        Delivery in <Text style={strong}>30 Minutes</Text>
      </InfoRow>
      <InfoRow icon="home-outline">
        Delivery at <Text style={strong}>Room No. {roomNumber ?? '—'}</Text>
      </InfoRow>
      <InfoRow icon="call-outline" last>
        <Text style={strong}>{guestName || 'Guest'}</Text>
        {guestPhone ? ` ${guestPhone}` : ''}
      </InfoRow>
    </View>
  );
}
