import React from 'react';
import {Text, View} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {
  CenterState,
  DISPLAY,
  DS,
  FONT,
  GlassPanel,
  TvBackdrop,
  TvClock,
} from '../../components/TvGlass';
import {useTvPresence} from '../../store/TvPresenceContext';

/**
 * What a Samsung in-room TV shows whenever no guest is signed in — it replaces
 * the Login screen there (see RootNavigator). Driven entirely by
 * TvPresenceContext: a pairing code until staff pair the TV, then a Welcome
 * screen until a guest checks in, at which point the dashboard takes over.
 */
export function TvGateScreen() {
  const {phase, pairingCode, hotelName, roomNumber} = useTvPresence();

  return (
    <View style={{flex: 1, backgroundColor: DS.pageBg}}>
      <TvBackdrop />
      <View style={{flex: 1, padding: DS.margin}}>
        <View style={{alignItems: 'flex-end'}}>
          <TvClock />
        </View>
        <View style={{flex: 1, alignItems: 'center', justifyContent: 'center'}}>
          {phase === 'pairing' && pairingCode ? (
            <PairingPanel code={pairingCode} />
          ) : phase === 'idle' ? (
            <WelcomePanel hotelName={hotelName} roomNumber={roomNumber} />
          ) : phase === 'offline' ? (
            <CenterState
              icon="cloud-offline-outline"
              title="Connecting to the hotel…"
              message="Check the TV's network connection. This screen retries on its own."
            />
          ) : (
            <CenterState icon="tv-outline" title="Getting your room ready…" />
          )}
        </View>
      </View>
    </View>
  );
}

function PairingPanel({code}: {code: string}) {
  const steps = [
    'Open the Nexgen admin panel → TV Devices',
    'Click “Pair TV” and enter this code',
    'Choose the room this TV is in',
  ];
  return (
    <GlassPanel style={{width: 560, paddingVertical: 32, paddingHorizontal: 40}}>
      <Text
        style={{
          color: DS.gold,
          fontSize: 11,
          fontWeight: '700',
          letterSpacing: 2,
          textAlign: 'center',
          fontFamily: FONT,
        }}>
        SET UP THIS TV
      </Text>
      <Text
        style={{
          color: DS.text,
          fontSize: 22,
          fontWeight: '600',
          marginTop: 8,
          textAlign: 'center',
          fontFamily: DISPLAY,
        }}>
        Pair this TV with a room
      </Text>
      <Text
        style={{
          color: DS.champagne,
          fontSize: 64,
          fontWeight: '700',
          letterSpacing: 10,
          marginTop: 22,
          textAlign: 'center',
          fontFamily: DISPLAY,
        }}>
        {`${code.slice(0, 3)} ${code.slice(3)}`}
      </Text>
      <View style={{marginTop: 22}}>
        {steps.map((step, i) => (
          <View key={step} style={{flexDirection: 'row', alignItems: 'center', marginTop: 8}}>
            <View
              style={{
                width: 22,
                height: 22,
                borderRadius: 11,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(212,180,131,0.20)',
              }}>
              <Text style={{color: DS.gold, fontSize: 11, fontWeight: '700', fontFamily: FONT}}>
                {i + 1}
              </Text>
            </View>
            <Text style={{color: DS.text2, fontSize: 13, marginLeft: 10, fontFamily: FONT}}>
              {step}
            </Text>
          </View>
        ))}
      </View>
      <Text
        style={{
          color: DS.muted,
          fontSize: 10,
          marginTop: 20,
          textAlign: 'center',
          fontFamily: FONT,
        }}>
        The code refreshes automatically every few minutes.
      </Text>
    </GlassPanel>
  );
}

function WelcomePanel({hotelName, roomNumber}: {hotelName?: string; roomNumber?: string}) {
  return (
    <GlassPanel style={{width: 560, paddingVertical: 36, paddingHorizontal: 40, alignItems: 'center'}}>
      <Icon name="bed-outline" size={34} color={DS.gold} />
      <Text
        style={{
          color: DS.text,
          fontSize: 28,
          fontWeight: '600',
          marginTop: 14,
          textAlign: 'center',
          fontFamily: DISPLAY,
        }}>
        Welcome to {hotelName || 'our hotel'}
      </Text>
      {roomNumber ? (
        <Text
          style={{
            color: DS.champagne,
            fontSize: 15,
            letterSpacing: 3,
            marginTop: 8,
            fontFamily: FONT,
          }}>
          ROOM {roomNumber}
        </Text>
      ) : null}
      <Text
        style={{
          color: DS.text2,
          fontSize: 12,
          lineHeight: 18,
          marginTop: 18,
          textAlign: 'center',
          fontFamily: FONT,
        }}>
        Your stay — room controls, dining and services — appears here as soon as
        you check in. No sign-in needed.
      </Text>
    </GlassPanel>
  );
}
