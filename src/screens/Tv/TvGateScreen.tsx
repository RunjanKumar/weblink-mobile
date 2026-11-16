import React, {useEffect, useState} from 'react';
import {AppState, Text, View} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {
  CenterState,
  DISPLAY,
  DS,
  FONT,
  GlassButton,
  GlassPanel,
  TvBackdrop,
  TvClock,
} from '../../components/TvGlass';
import {
  hotelModeStatus,
  openHomeChooser,
  openOverlaySettings,
  type HotelModeStatus,
} from '../../services/tvPlatform';
import {useTvPresence} from '../../store/TvPresenceContext';
import {IS_ANDROID_TV_APP} from '../../utils/responsive';

/**
 * What an in-room TV shows whenever no guest is signed in — it replaces
 * the Login screen there (see RootNavigator). Driven entirely by
 * TvPresenceContext: a pairing code until staff pair the TV, then a Welcome
 * screen until a guest checks in, at which point the dashboard takes over.
 */
export function TvGateScreen() {
  const {phase, pairingCode, hotelName, roomNumber, hotelMode} = useTvPresence();

  // Starting, or signing the guest in: on Android TV the app's black + logo
  // splash stays up instead (see bootDone), so the guest goes from the logo
  // straight to the screen that follows — usually the dashboard.
  const settled = (phase === 'pairing' && !!pairingCode) || phase === 'idle' || phase === 'offline';
  if (IS_ANDROID_TV_APP && !settled) {
    return <View style={{flex: 1}} />;
  }

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
            <>
              <WelcomePanel hotelName={hotelName} roomNumber={roomNumber} />
              {IS_ANDROID_TV_APP ? <HotelModeSetup hotelMode={hotelMode} /> : null}
            </>
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

/**
 * Android TV, for staff: after Hotel mode is switched on in the admin panel the
 * TV still has to be told to use this app as its Home — Android only lets that
 * happen on the TV. The empty-room Welcome screen is where staff set a TV up,
 * so the step is offered here (it is also under Settings → Device Info), and
 * disappears once done. What the step is depends on the TV (HomeChoice):
 *  - chooser: "Set as Home app" → Nexgen Hotels → Always
 *  - default: another launcher is the default — clear it first
 *  - locked:  Google TV never lets another Home in; the app can only open on
 *             power-on, which on Android 10+ needs "Display over other apps"
 */
function HotelModeSetup({hotelMode}: {hotelMode?: boolean}) {
  const [status, setStatus] = useState<HotelModeStatus | null>(hotelModeStatus);
  const [overlayHint, setOverlayHint] = useState(false);

  // Re-read when the admin switch changes and when the TV comes back from the
  // Home chooser.
  useEffect(() => setStatus(hotelModeStatus()), [hotelMode]);
  useEffect(() => {
    const sub = AppState.addEventListener('change', next => {
      if (next === 'active') {
        setStatus(hotelModeStatus());
      }
    });
    return () => sub.remove();
  }, []);

  const step = status?.on ? setupStep(status) : null;
  if (!step) {
    return null;
  }
  const allowOverlay = () => {
    if (!openOverlaySettings()) {
      setOverlayHint(true);
    }
  };
  return (
    <GlassPanel
      style={{
        width: 560,
        marginTop: DS.gap,
        paddingVertical: 18,
        paddingHorizontal: 24,
        flexDirection: 'row',
        alignItems: 'center',
      }}>
      <Icon name={step.icon} size={22} color={DS.gold} />
      <View style={{flex: 1, marginLeft: 14, marginRight: step.action ? 14 : 0}}>
        <Text style={{color: DS.text, fontSize: 13, fontWeight: '600', fontFamily: FONT}}>
          {step.title}
        </Text>
        <Text style={{color: DS.text2, fontSize: 11, lineHeight: 16, marginTop: 3, fontFamily: FONT}}>
          {overlayHint ? `This TV has no such setting. From a computer: ${OVERLAY_ADB}` : step.detail}
        </Text>
      </View>
      {step.action === 'home' ? (
        <GlassButton
          label="Set as Home app"
          icon="home-outline"
          onPress={openHomeChooser}
          height={40}
          hasTVPreferredFocus
        />
      ) : step.action === 'overlay' && !overlayHint ? (
        <GlassButton label="Allow" icon="layers-outline" onPress={allowOverlay} height={40} hasTVPreferredFocus />
      ) : null}
    </GlassPanel>
  );
}

/** Granting "Display over other apps" by hand, for TVs without that settings screen. */
const OVERLAY_ADB ='adb shell appops set com.wattinventive.nexgenhotels SYSTEM_ALERT_WINDOW allow';

/** The one thing staff still have to do on this TV for Hotel mode, or null when it is set up. */
function setupStep(status: HotelModeStatus): {
  icon: string;
  title: string;
  detail: string;
  action: 'home' | 'overlay' | null;
} | null {
  const launcher = status.homeLabel || 'Another app';
  switch (status.home) {
    case 'chooser':
      return {
        icon: 'home-outline',
        title: 'Staff: finish Hotel mode',
        detail: 'Choose Nexgen Hotels, then “Always”.',
        action: 'home',
      };
    case 'default':
      return {
        icon: 'home-outline',
        title: 'Staff: finish Hotel mode',
        detail: `${launcher} is this TV's Home app. In the TV's Settings → Apps → ${launcher}, choose “Clear defaults”, then come back here.`,
        action: null,
      };
    case 'locked':
      if (status.needsOverlay && !status.canDrawOverlays) {
        return {
          icon: 'power-outline',
          title: 'Staff: let the app open on power-on',
          detail:
            'This TV always keeps its own Home screen. Allow “Display over other apps” so the app opens whenever the TV is switched on.',
          action: 'overlay',
        };
      }
      // Until the TV restarts, a power cut can still lose the permission.
      return status.restartNeeded
        ? {
            icon: 'refresh-outline',
            title: 'Staff: restart this TV once',
            detail:
              'This saves the permission. Use the TV’s Settings → About → Restart, not the power button on the remote.',
            action: null,
          }
        : null;
    default:
      return null;
  }
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
