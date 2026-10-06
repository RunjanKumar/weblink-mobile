import React, {useEffect, useState} from 'react';
import {ScrollView, Text, View} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Toggle, dialog} from '../../components';
import {
  DS,
  FONT,
  GlassButton,
  GlassPanel,
  MetaRow,
  TvPanelHeader,
  TvPressable,
  TvScreen,
} from '../../components/TvGlass';
import {useAuth} from '../../store/AuthContext';
import {useTheme} from '../../theme';
import {config} from '../../constants/config';
import {getDisplayName} from '../../models/user.model';
import type {HomeStackParamList} from '../../navigation/types';
import {getDiagnostics, platform, platformLabel, type TvDiagnostics} from '../../services/tvPlatform';

type Props = NativeStackScreenProps<HomeStackParamList, 'Settings'>;

const APP_VERSION = '0.1.0';

/** Apps worth surfacing by ID — the ones the hotel tiles will launch. */
const KEY_APPS = /netflix|youtube|prime|disney|hotstar|jio|zee5|sonyliv|apple|spotify/i;

const Divider = () => <View style={{height: 1, backgroundColor: DS.divider}} />;

/**
 * What the TV itself reports: DUID, screen, server reachability and, on
 * Samsung, the installed apps and video inputs. This is how the feasibility
 * tests read a hotel TV (or a Remote Test Lab TV) without a debugger.
 */
function DeviceInfo() {
  const [diag, setDiag] = useState<TvDiagnostics | null>(null);

  useEffect(() => {
    let alive = true;
    void getDiagnostics().then(d => alive && setDiag(d));
    return () => {
      alive = false;
    };
  }, []);

  if (!diag) {
    return <MetaRow icon="hourglass-outline" label="Reading this TV" value="Checking…" />;
  }

  const reach = (ok: boolean) => (ok ? 'Reachable' : 'Not reachable');
  const keyApps = diag.apps.ok ? diag.apps.value.filter(a => KEY_APPS.test(a.name)) : [];

  return (
    <>
      <MetaRow
        icon="finger-print-outline"
        label="Device ID (DUID)"
        value={diag.deviceId.ok ? diag.deviceId.value : `Unavailable: ${diag.deviceId.error}`}
      />
      <Divider />
      <MetaRow icon="resize-outline" label="Screen" value={diag.screen} />
      <Divider />
      <MetaRow
        icon="server-outline"
        label="Hotel server"
        value={reach(diag.apiReachable)}
        valueColor={diag.apiReachable ? DS.good : DS.danger}
      />
      <Divider />
      <MetaRow
        icon="pulse-outline"
        label="Live updates"
        value={reach(diag.socketReachable)}
        valueColor={diag.socketReachable ? DS.good : DS.danger}
      />
      {platform() === 'tizen' ? (
        <>
          <Divider />
          <MetaRow
            icon="git-network-outline"
            label="Video inputs"
            value={
              diag.videoSources.ok ? diag.videoSources.value.join(', ') : diag.videoSources.error
            }
          />
          <Divider />
          <MetaRow
            icon="apps-outline"
            label="Installed apps"
            value={diag.apps.ok ? `${diag.apps.value.length} apps` : diag.apps.error}
          />
          {keyApps.map(app => (
            <React.Fragment key={app.id}>
              <Divider />
              <MetaRow icon="play-circle-outline" label={app.name} value={app.id} />
            </React.Fragment>
          ))}
        </>
      ) : null}
      <Text
        style={{
          color: DS.muted,
          fontSize: 9,
          lineHeight: 13,
          marginTop: 12,
          fontFamily: FONT,
        }}>
        {diag.userAgent}
      </Text>
    </>
  );
}

/**
 * Settings (TV) — the ⋮ menu's Settings page in the dashboard's glass.
 *
 * The only real preference here is Appearance, and it is deliberately labelled
 * for what it actually does on a TV: the ten-foot frames are ALWAYS the dark
 * champagne glass (the design system is not themed — see `components/TvGlass`),
 * so the switch only reaches the hotel-information pages that still render with
 * the app theme. Claiming it themed "the app" would be a lie the guest can see.
 */
export function TvSettingsScreen({navigation}: Props) {
  const {scheme, toggleScheme} = useTheme();
  const {user, hotel, session, signOut} = useAuth();
  const rootNavigation = useNavigation();
  const dark = scheme === 'dark';
  const [showDevice, setShowDevice] = useState(false);

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
        {/* ── Left: preferences ── */}
        <GlassPanel style={{width: 340, marginRight: DS.gap, padding: 16}}>
          <TvPanelHeader
            title="Settings"
            subtitle="Preferences for this room"
            onBack={() => navigation.goBack()}
          />

          {/* Whole row is the control — a remote should not have to land on a
              14px switch to flip it. */}
          <TvPressable
            onPress={toggleScheme}
            label={dark ? 'Switch to light appearance' : 'Switch to dark appearance'}
            restBorderColor={DS.borderSoft}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              padding: 14,
              borderRadius: DS.radiusSm,
              backgroundColor: 'rgba(255,255,255,0.08)',
            }}>
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(212,180,131,0.18)',
              }}>
              <Icon name={dark ? 'moon-outline' : 'sunny-outline'} size={19} color={DS.gold} />
            </View>
            <View style={{flex: 1, marginLeft: 12, paddingRight: 10}}>
              <Text
                style={{
                  color: DS.text,
                  fontSize: 13,
                  fontWeight: '600',
                  letterSpacing: 0.5,
                  fontFamily: FONT,
                }}>
                APPEARANCE
              </Text>
              <Text style={{color: DS.muted, fontSize: 10, marginTop: 2, fontFamily: FONT}}>
                {dark ? 'Dark mode' : 'Light mode'}
              </Text>
            </View>
            <View pointerEvents="none">
              <Toggle
                size="sm"
                value={dark}
                onValueChange={toggleScheme}
                interactive={false}
                trackOnColor={DS.gold}
                trackOffColor={DS.toggleOff}
              />
            </View>
          </TvPressable>

          <Text
            style={{
              color: DS.muted,
              fontSize: 10,
              lineHeight: 15,
              marginTop: 10,
              fontFamily: FONT,
            }}>
            Your room screens always use the hotel's champagne glass theme.
            Appearance applies to the hotel information pages.
          </Text>

          <View style={{flex: 1}} />

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 12,
              paddingVertical: 11,
              borderRadius: DS.radiusSm,
              backgroundColor: 'rgba(255,255,255,0.08)',
            }}>
            <Icon name="lock-closed-outline" size={15} color={DS.champagne} />
            <Text
              style={{
                flex: 1,
                color: DS.text2,
                fontSize: 10,
                lineHeight: 15,
                marginLeft: 8,
                fontFamily: FONT,
              }}>
              Room controls, billing and orders are tied to your stay — nothing
              here is shared with the next guest.
            </Text>
          </View>
        </GlassPanel>

        {/* ── Middle: what this TV is signed in as ── */}
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
            {showDevice ? 'DEVICE' : 'ABOUT'}
          </Text>

          {/* Plain text cannot take remote focus, so a long list would never
              scroll — the device details swap in for ABOUT instead of stacking
              under it. */}
          {showDevice ? (
            <ScrollView style={{flex: 1}} showsVerticalScrollIndicator={false}>
              <DeviceInfo />
            </ScrollView>
          ) : (
            <ScrollView style={{flex: 1}} showsVerticalScrollIndicator={false}>
              <MetaRow icon="tv-outline" label="App" value="Weblink In-Room TV" />
              <View style={{height: 1, backgroundColor: DS.divider}} />
              <MetaRow icon="pricetag-outline" label="Version" value={`v${APP_VERSION}`} />
              <View style={{height: 1, backgroundColor: DS.divider}} />
              <MetaRow icon="cube-outline" label="Environment" value={config.appEnv} />
              <View style={{height: 1, backgroundColor: DS.divider}} />
              <MetaRow icon="hardware-chip-outline" label="Platform" value={platformLabel()} />

              {/* Near-white, not muted — see the note in TvProfileScreen. */}
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
                SIGNED IN
              </Text>
              <MetaRow icon="person-outline" label="Guest" value={getDisplayName(user)} />
              <View style={{height: 1, backgroundColor: DS.divider}} />
              <MetaRow icon="mail-outline" label="Email" value={user?.email} />
              <View style={{height: 1, backgroundColor: DS.divider}} />
              <MetaRow icon="business-outline" label="Hotel" value={hotel?.name} />
              <View style={{height: 1, backgroundColor: DS.divider}} />
              <MetaRow
                icon="bed-outline"
                label="Room"
                value={
                  session?.booking?.roomData?.roomNumber != null
                    ? String(session.booking.roomData.roomNumber)
                    : undefined
                }
              />
            </ScrollView>
          )}
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
            label="Profile"
            icon="person-outline"
            onPress={() => navigation.navigate('Profile')}
            height={44}
            style={{marginBottom: 8}}
          />
          <GlassButton
            label="View Bill"
            icon="receipt-outline"
            onPress={() => navigation.navigate('ViewBill')}
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
            onPress={() =>
              (rootNavigation as unknown as {navigate: (n: string) => void}).navigate(
                'ReceptionTab',
              )
            }
            height={44}
            style={{marginBottom: 8}}
          />
          <GlassButton
            label={showDevice ? 'About This App' : 'Device Info'}
            icon={showDevice ? 'information-circle-outline' : 'hardware-chip-outline'}
            onPress={() => setShowDevice(v => !v)}
            height={44}
          />

          <View style={{flex: 1}} />

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
