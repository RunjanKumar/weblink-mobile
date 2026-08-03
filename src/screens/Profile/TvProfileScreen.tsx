import React, {useState} from 'react';
import {Image, ScrollView, Text, View} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {dialog} from '../../components';
import {
  DS,
  FONT,
  GlassButton,
  GlassPanel,
  MetaRow,
  DISPLAY,
  TvPanelHeader,
  TvScreen,
} from '../../components/TvGlass';
import {useAuth} from '../../store/AuthContext';
import {formatDate} from '../../utils';
import {resolveImageUrl} from '../../utils/imageUrl';
import {getDisplayName, getHotelAddress} from '../../models/user.model';
import type {HomeStackParamList} from '../../navigation/types';

type Props = NativeStackScreenProps<HomeStackParamList, 'Profile'>;

/**
 * Profile (TV) — one of the three pages behind the dashboard's ⋮ menu, wearing
 * the same glass as the dashboard it was opened from.
 *
 * Read-only on purpose: the backend has no guest-facing profile PATCH, and even
 * if it had one, editing a name or an email with a remote is not something to
 * ask a guest to do. So this is the identity card, the stay, and the way out
 * (log out) — nothing that needs a keyboard.
 */

function Avatar({uri, size = 92}: {uri?: string | null; size?: number}) {
  const [failed, setFailed] = useState(false);
  const src = resolveImageUrl(uri);
  const box = {
    width: size,
    height: size,
    borderRadius: size / 2,
    overflow: 'hidden' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderWidth: 1,
    borderColor: 'rgba(212,180,131,0.55)',
    backgroundColor: 'rgba(212,180,131,0.18)',
  };
  if (!src || failed) {
    return (
      <View style={box}>
        <Icon name="person" size={Math.round(size * 0.44)} color={DS.gold} />
      </View>
    );
  }
  return (
    <View style={box}>
      <Image
        source={{uri: src}}
        resizeMode="cover"
        onError={() => setFailed(true)}
        style={{width: '100%', height: '100%'}}
      />
    </View>
  );
}

export function TvProfileScreen({navigation}: Props) {
  const {user, hotel, session, signOut} = useAuth();
  const rootNavigation = useNavigation();
  const rootNavigate = (name: string, params?: object) =>
    (rootNavigation as unknown as {navigate: (n: string, p?: object) => void}).navigate(
      name,
      params,
    );

  const booking = session?.booking ?? null;
  const phone = user?.phoneNumber
    ? `${user.phoneCountryCode ?? ''} ${user.phoneNumber}`.trim()
    : undefined;

  const confirmLogout = async () => {
    const confirmed = await dialog.confirm({
      title: 'Are You Ready to Log Out?',
      message: "You'll need to sign in again to access your stay and in-room services.",
      confirmLabel: 'Log Out',
      cancelLabel: 'Stay Logged In',
      destructive: true,
    });
    if (confirmed) {
      void signOut();
    }
  };

  return (
    <TvScreen>
      <View style={{flex: 1, flexDirection: 'row', marginTop: 16}}>
        {/* ── Left: who the guest is ── */}
        <GlassPanel style={{width: 300, marginRight: DS.gap, padding: 16}}>
          <TvPanelHeader
            title="Profile"
            subtitle="Your guest account"
            onBack={() => navigation.goBack()}
          />

          <View style={{alignItems: 'center', marginTop: 6}}>
            <Avatar uri={user?.profilePic} />
            <Text
              numberOfLines={2}
              style={{
                color: DS.text,
                fontSize: 20,
                fontWeight: '600',
                marginTop: 14,
                textAlign: 'center',
                fontFamily: FONT,
              }}>
              {getDisplayName(user)}
            </Text>
            {hotel?.name ? (
              <Text
                numberOfLines={2}
                style={{
                  color: DS.champagne,
                  fontSize: 16,
                  marginTop: 4,
                  textAlign: 'center',
                  fontFamily: DISPLAY,
                  fontWeight: '300',
                  letterSpacing: 0.8,
                }}>
                {hotel.name}
              </Text>
            ) : null}
          </View>

          <View style={{flex: 1}} />

          {/* Room number, big — the guest reads this out to reception. */}
          <View
            style={{
              alignItems: 'center',
              paddingVertical: 12,
              borderRadius: DS.radiusSm,
              backgroundColor: 'rgba(255,255,255,0.08)',
            }}>
            <Text style={{color: DS.muted, fontSize: 9, letterSpacing: 1, fontFamily: FONT}}>
              ROOM NO.
            </Text>
            <Text
              style={{
                color: DS.text,
                fontSize: 30,
                fontWeight: '600',
                marginTop: 2,
                fontFamily: FONT,
              }}>
              {booking?.roomData?.roomNumber ?? '—'}
            </Text>
          </View>
        </GlassPanel>

        {/* ── Middle: the details ── */}
        <GlassPanel style={{flex: 1, marginRight: DS.gap, padding: 16}}>
          <Text
            style={{
              color: DS.text,
              fontSize: 16,
              fontWeight: '600',
              letterSpacing: 1,
              marginBottom: 10,
              fontFamily: FONT,
            }}>
            GUEST DETAILS
          </Text>

          <ScrollView style={{flex: 1}} showsVerticalScrollIndicator={false}>
            <MetaRow icon="person-outline" label="Name" value={getDisplayName(user)} />
            <View style={{height: 1, backgroundColor: DS.divider}} />
            <MetaRow icon="mail-outline" label="Email" value={user?.email} />
            <View style={{height: 1, backgroundColor: DS.divider}} />
            <MetaRow icon="call-outline" label="Phone" value={phone} />

            {/* Near-white, not muted: these group labels sit over the panel's
                thinnest glass, and 10px grey (or champagne) washes out against
                the bright bands of the backdrop photo behind it. */}
            <Text
              style={{
                color: DS.text2,
                fontSize: 10,
                fontWeight: '700',
                letterSpacing: 1,
                marginTop: 20,
                marginBottom: 4,
                fontFamily: FONT,
              }}>
              YOUR STAY
            </Text>
            <MetaRow
              icon="bed-outline"
              label="Room"
              value={
                booking?.roomData?.roomNumber != null
                  ? String(booking.roomData.roomNumber)
                  : undefined
              }
            />
            <View style={{height: 1, backgroundColor: DS.divider}} />
            <MetaRow
              icon="layers-outline"
              label="Floor"
              value={booking?.roomData?.floor != null ? String(booking.roomData.floor) : undefined}
            />
            <View style={{height: 1, backgroundColor: DS.divider}} />
            <MetaRow
              icon="log-in-outline"
              label="Check-in"
              value={formatDate(booking?.checkInDate)}
            />
            <View style={{height: 1, backgroundColor: DS.divider}} />
            <MetaRow
              icon="log-out-outline"
              label="Check-out"
              value={formatDate(booking?.checkOutDate)}
            />

            {/* Near-white, not muted: these group labels sit over the panel's
                thinnest glass, and 10px grey (or champagne) washes out against
                the bright bands of the backdrop photo behind it. */}
            <Text
              style={{
                color: DS.text2,
                fontSize: 10,
                fontWeight: '700',
                letterSpacing: 1,
                marginTop: 20,
                marginBottom: 4,
                fontFamily: FONT,
              }}>
              HOTEL
            </Text>
            <MetaRow icon="business-outline" label="Hotel" value={hotel?.name} />
            <View style={{height: 1, backgroundColor: DS.divider}} />
            <MetaRow icon="location-outline" label="Address" value={getHotelAddress(hotel)} />
            <View style={{height: 1, backgroundColor: DS.divider}} />
            <MetaRow icon="call-outline" label="Reception" value={hotel?.phoneNumber} />
          </ScrollView>
        </GlassPanel>

        {/* ── Right: where to go from here ── */}
        <GlassPanel style={{width: 268, padding: 16}}>
          <Text
            style={{
              color: DS.text,
              fontSize: 14,
              fontWeight: '700',
              letterSpacing: 1,
              marginBottom: 12,
              fontFamily: FONT,
            }}>
            QUICK LINKS
          </Text>

          <GlassButton
            label="View Bill"
            icon="receipt-outline"
            onPress={() => navigation.navigate('ViewBill')}
            height={44}
            style={{marginBottom: 8}}
          />
          <GlassButton
            label="Settings"
            icon="settings-outline"
            onPress={() => navigation.navigate('Settings')}
            height={44}
            style={{marginBottom: 8}}
          />
          <GlassButton
            label="Share Feedback"
            icon="star-outline"
            onPress={() => navigation.navigate('Feedback')}
            height={44}
            style={{marginBottom: 8}}
          />
          <GlassButton
            label="Ask Reception"
            icon="headset-outline"
            onPress={() => rootNavigate('ReceptionTab')}
            height={44}
          />

          <View style={{flex: 1}} />

          <Text
            style={{
              color: DS.muted,
              fontSize: 10,
              lineHeight: 15,
              marginBottom: 8,
              fontFamily: FONT,
            }}>
            Logging out clears this TV — do it before you check out so the next
            guest never sees your stay.
          </Text>
          {/* Danger reads as a TINT on the glass, not a red slab: a red block
              this size on the dashboard's palette looks like an error banner. */}
          <GlassButton
            label="Log Out"
            icon="log-out-outline"
            tone={DS.danger}
            onPress={confirmLogout}
            height={44}
          />
        </GlassPanel>
      </View>
    </TvScreen>
  );
}
