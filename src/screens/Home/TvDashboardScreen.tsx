import React, {useState} from 'react';
import {
  ActivityIndicator,
  Image,
  type ImageSourcePropType,
  ScrollView,
  Text,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Toggle, dialog, toast} from '../../components';
import {
  DEMO_SCENES,
  DND_RE,
  DS,
  DoNotDisturbIcon,
  FONT,
  GLASS_BLUR,
  GlassSheen,
  MMR_RE,
  MakeMyRoomIcon,
  PanelCard,
  SERIF,
  SHADOW,
  SceneSquare,
  TvBackdrop,
  TvFooter,
  TvPressable,
  TvTopBar,
  isRoomModeScene,
  sceneIcon,
  toSource,
  useDemoScenes,
} from '../../components/TvGlass';
import {useDashboardViewModel, useRoomControl} from '../../viewmodels';
import {CurtainControl} from './components/CurtainControl';
import {useAuth} from '../../store/AuthContext';
import {getApiErrorMessage} from '../../utils/errorHandler';
import type {RoomDevice} from '../../models/device.model';
import type {HomeStackParamList} from '../../navigation/types';

import heroImg from '../../assets/tv/hero.jpg';
import serviceImg from '../../assets/tv/service.jpg';
import foodImg from '../../assets/tv/food.jpg';
import facilitiesImg from '../../assets/tv/facilities.jpg';
import helpdeskImg from '../../assets/tv/helpdesk.jpg';
import climateImg from '../../assets/tv/climate.jpg';
import lightsImg from '../../assets/tv/lights.jpg';
import laundryImg from '../../assets/tv/laundry.jpg';
import doorImg from '../../assets/tv/door.jpg';
import livetvImg from '../../assets/tv/livetv.jpg';

type Props = NativeStackScreenProps<HomeStackParamList, 'Dashboard'>;

const comingSoon = () =>
  toast.info('Coming soon — this feature is not available yet.', {duration: 3000});

/**
 * The DND / MMR signs render far larger than the 22px Ionicons glyph they
 * replaced, because that is the proportion the Figma draws them at — the hanger
 * is as tall as both of its label lines. It still fits: the row's height is set
 * by the 100px Light Scenes squares beside it, not by this card.
 */
const ROOM_MODE_GLYPH = 38;

/* ── Photo tile (spec: SERVICE TILES 310×220 → 207×147 CSS) ── */
function Tile({
  title,
  subtitle,
  image,
  icon,
  soon = false,
  onPress,
}: {
  title: string;
  subtitle: string;
  image?: ImageSourcePropType;
  icon: string;
  soon?: boolean;
  onPress: () => void;
}) {
  return (
    <TvPressable
      onPress={onPress}
      label={soon ? `${title} (coming soon)` : title}
      restBorderColor={DS.borderSoft}
      // Height is a % of the (stretched) grid, so tiles grow with the viewport
      // and the two rows always fill the hero's height with no gap below.
      style={{
        width: '23.5%',
        height: '48.6%',
        minHeight: 147,
        borderRadius: DS.radius,
        overflow: 'hidden',
        backgroundColor: DS.glass,
        ...SHADOW,
        ...(GLASS_BLUR ?? {}),
      }}>
      <View style={{flex: 1, backgroundColor: DS.glassSoft}}>
        {image ? (
          // Slightly translucent so the golden backdrop tints every photo —
          // the shared glow is what makes the tiles read as one glass sheet.
          // NOTE: no rotation here — any sideways SOURCE photo (phone EXIF)
          // gets fixed at the asset level, like door.jpg was.
          <Image
            source={image}
            resizeMode="cover"
            style={{width: '100%', height: '100%', opacity: 0.85}}
          />
        ) : (
          <View style={{flex: 1, alignItems: 'center', justifyContent: 'center'}}>
            <Icon name={icon} size={36} color={DS.gold} />
          </View>
        )}
        {soon ? (
          <View
            style={{
              position: 'absolute',
              top: 6,
              right: 6,
              backgroundColor: DS.gold,
              borderRadius: 6,
              paddingHorizontal: 6,
              paddingVertical: 2,
            }}>
            <Text style={{color: DS.dark, fontSize: 8, fontWeight: '800', fontFamily: FONT}}>
              SOON
            </Text>
          </View>
        ) : null}
      </View>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 12,
          paddingVertical: 9,
        }}>
        <View style={{flex: 1, paddingRight: 6}}>
          <Text
            numberOfLines={1}
            style={{color: DS.text, fontSize: 13, fontWeight: '600', fontFamily: FONT}}>
            {title.toUpperCase()}
          </Text>
          <Text
            numberOfLines={1}
            style={{color: DS.text2, fontSize: 10, marginTop: 2, fontFamily: FONT}}>
            {subtitle}
          </Text>
        </View>
        {/* spec: arrow circle white 20%, arrow gold */}
        <View
          style={{
            width: 24,
            height: 24,
            borderRadius: 12,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(255,255,255,0.20)',
          }}>
          <Icon name="chevron-forward" size={13} color={DS.gold} />
        </View>
      </View>
      {/* one frosted pane over photo AND label together */}
      <GlassSheen />
    </TvPressable>
  );
}

/* ── DND / MMR: real scene devices as whole-card toggles ──
   `glyph` rather than an Ionicons name: the client's Figma draws these two as
   real signs (a door hanger, a housekeeping trolley), which no icon font ships.
   See `TvGlass/RoomIcons`. */
function SceneSwitch({
  device,
  glyph,
  title,
  subtitle,
  onToggle,
}: {
  device: RoomDevice | undefined;
  glyph: (color: string) => React.ReactNode;
  title: string;
  subtitle: string;
  onToggle: (d: RoomDevice) => void;
}) {
  if (!device) {
    return (
      <View style={{flex: 1, alignItems: 'center', justifyContent: 'center', padding: 8}}>
        {glyph(DS.muted)}
        <Text style={{color: DS.muted, fontSize: 10, marginTop: 6, fontFamily: FONT}}>{title}</Text>
        <Text style={{color: DS.muted, fontSize: 9, marginTop: 2, fontFamily: FONT}}>
          Not configured
        </Text>
      </View>
    );
  }
  return (
    <TvPressable
      onPress={() => onToggle(device)}
      label={`Toggle ${title}`}
      style={{flex: 1, alignItems: 'center', borderRadius: DS.radiusSm, paddingVertical: 8}}>
      {glyph(DS.gold)}
      <Text
        style={{color: DS.text, fontSize: 11, fontWeight: '600', marginTop: 5, fontFamily: FONT}}>
        {title}
      </Text>
      <Text style={{color: DS.muted, fontSize: 9, marginTop: 1, fontFamily: FONT}}>{subtitle}</Text>
      <View style={{marginTop: 7}} pointerEvents="none">
        <Toggle
          size="sm"
          value={device.isOn}
          onValueChange={() => onToggle(device)}
          interactive={false}
          trackOnColor={DS.gold}
          trackOffColor={DS.toggleOff}
        />
      </View>
    </TvPressable>
  );
}

/**
 * TV home screen — implements the client's "Luxury Hotel Smart Room UI" design
 * system (Vision-Pro glassmorphism, warm beige + champagne gold). Tokens and the
 * glass primitives live in `components/TvGlass`, shared with Light Control.
 *
 * Feature status: View Bill and Help Desk are real; Netflix / Google Cast /
 * Explore Hotel / Live TV are "coming soon" toasts; DND & MMR are real scenes
 * split by name; Curtain Control drives the real motor channels when the room
 * has them and falls back to local state when it does not; Light Scenes fall
 * back to a local demo set until live scenes exist.
 */
export function TvDashboardScreen({navigation}: Props) {
  const {signOut} = useAuth();
  const dash = useDashboardViewModel();
  const room = useRoomControl();
  // Door is a local placeholder, exactly like the phone dashboard's DoorControlCard.
  const [doorClosed, setDoorClosed] = useState(true);
  // Which DEMO_SCENES are "on" (presentation only, shared with Light Control).
  const demo = useDemoScenes();

  const dndScene = room.scenes.find(s => DND_RE.test(s.friendlyname ?? ''));
  const mmrScene = room.scenes.find(s => MMR_RE.test(s.friendlyname ?? ''));
  const lightScenes = room.scenes.filter(s => !isRoomModeScene(s.friendlyname));

  const flipScene = (device: RoomDevice) => {
    room
      .toggleDevice(device)
      .catch(error =>
        toast.error(getApiErrorMessage(error, 'Could not update the scene. Please try again.')),
      );
  };

  const rootNavigate = (name: string, params?: object) =>
    (navigation as unknown as {navigate: (name: string, params?: object) => void}).navigate(
      name,
      params,
    );

  const onMenu = async () => {
    const choice = await dialog.show({
      title: 'Menu',
      dismissValue: 'cancel',
      actions: [
        {label: 'Cancel', value: 'cancel', variant: 'secondary'},
        {label: 'Log out', value: 'logout', variant: 'danger'},
        {label: 'Refresh', value: 'refresh', variant: 'secondary'},
        {label: 'Settings', value: 'settings', variant: 'secondary'},
        {label: 'Profile', value: 'profile', variant: 'secondary'},
        // The TV has no bottom bar, so the reception chat needs a way in.
        {label: 'Reception', value: 'reception', variant: 'secondary'},
        {label: 'Share feedback', value: 'feedback', variant: 'primary'},
      ],
    });
    if (choice === 'reception') {
      rootNavigate('ReceptionTab');
    } else if (choice === 'refresh') {
      dash.refetch();
      room.refetch();
    } else if (choice === 'feedback') {
      navigation.navigate('Feedback');
    } else if (choice === 'profile') {
      navigation.navigate('Profile');
    } else if (choice === 'settings') {
      navigation.navigate('Settings');
    } else if (choice === 'logout') {
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
    }
  };

  const hotelName = dash.hotel?.name ?? 'your hotel';

  return (
    <SafeAreaView style={{flex: 1, backgroundColor: DS.pageBg}} edges={['top']}>
      {/* spec BACKGROUND: "Luxury Hotel Bedroom (Blurred)" — the hero photo IS
          a warm golden bedroom now, so hero and backdrop share it, exactly as
          the design system describes. */}
      <TvBackdrop />

      {/* flexGrow fills the full 720 CSS viewport — without it the page ended
          ~100px short and the backdrop showed as a dead strip at the bottom. */}
      <ScrollView contentContainerStyle={{padding: DS.margin, paddingBottom: 16, flexGrow: 1}}>
        {/* ── Header (spec: 88px → 59) ──
            Shared with the food frames (components/TvGlass/TvChrome) so the bar
            never shifts as the guest moves between pages. */}
        <TvTopBar onMenu={onMenu} />

        {/* ── Hero (spec: 640×520 → 427×347) + tile grid ── */}
        {/* flex: 1 — this row absorbs the viewport space freed by removing the
            nav bar, so hero and tiles grow instead of leaving a bottom gap. */}
        <View style={{flexDirection: 'row', marginTop: 16, flex: 1}}>
          <View
            style={{
              width: 427,
              minHeight: 307,
              borderRadius: DS.radius,
              overflow: 'hidden',
              backgroundColor: DS.glassSoft,
              borderWidth: 1,
              borderColor: DS.border,
              marginRight: DS.gap,
              ...SHADOW,
            }}>
            <Image
              source={toSource(heroImg)}
              resizeMode="cover"
              style={{position: 'absolute', width: '100%', height: '100%'}}
            />
            <View
              style={{
                flex: 1,
                backgroundColor: 'rgba(18,12,6,0.30)',
                padding: 16,
                justifyContent: 'flex-end',
              }}>
              <Text
                style={{color: DS.text, fontSize: 30, fontFamily: SERIF, fontStyle: 'italic'}}>
                {hotelName}
              </Text>
              <Text style={{color: DS.text2, fontSize: 13, marginTop: 6, fontFamily: FONT}}>
                We are at your service
              </Text>
              {/* spec PRIMARY BUTTON: gold bg, white text, 56 → 37 high */}
              <TvPressable
                onPress={comingSoon}
                label="Explore hotel (coming soon)"
                restBorderColor="#E5CFA5"
                style={{
                  alignSelf: 'flex-start',
                  flexDirection: 'row',
                  alignItems: 'center',
                  height: 37,
                  borderRadius: 11,
                  backgroundColor: DS.gold,
                  paddingHorizontal: 16,
                  marginTop: 14,
                }}>
                <Text
                  style={{
                    color: DS.text,
                    fontSize: 12,
                    fontWeight: '700',
                    letterSpacing: 1,
                    fontFamily: FONT,
                  }}>
                  EXPLORE HOTEL
                </Text>
                <Icon name="chevron-forward" size={14} color={DS.text} style={{marginLeft: 6}} />
              </TvPressable>
            </View>
          </View>

          <View
            style={{
              flex: 1,
              flexDirection: 'row',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              alignContent: 'space-between',
            }}>
            {/* Services / Food / Facilities live in sibling tab stacks — plain
                navigate() is silently dropped, so route through the tab. */}
            <Tile
              title="Service Request"
              subtitle="Let us take care of you"
              image={toSource(serviceImg)}
              icon="notifications-outline"
              onPress={() => rootNavigate('ServicesTab', {screen: 'Services'})}
            />
            <Tile
              title="Light Controls"
              subtitle="Control your room lights"
              image={toSource(lightsImg)}
              icon="bulb-outline"
              onPress={() => navigation.navigate('Lights')}
            />
            <Tile
              title="Climate / AC"
              subtitle="Adjust room temperature"
              image={toSource(climateImg)}
              icon="snow-outline"
              onPress={() => navigation.navigate('Ac')}
            />
            <Tile
              title="Food Order"
              subtitle="Order delicious meals"
              image={toSource(foodImg)}
              icon="restaurant-outline"
              onPress={() => rootNavigate('FoodTab', {screen: 'Food'})}
            />
            <Tile
              title="Laundry"
              subtitle="Fresh & pressed delivered"
              image={toSource(laundryImg)}
              icon="shirt-outline"
              onPress={() => navigation.navigate('Laundry')}
            />
            <Tile
              title="Facilities"
              subtitle="Explore hotel facilities"
              image={toSource(facilitiesImg)}
              icon="barbell-outline"
              onPress={() => rootNavigate('FacilitiesTab', {screen: 'Facilities'})}
            />
            {/* Replaces the old "Offers" placeholder — a real feature in the
                grid beats a coming-soon tile. `ReceptionTab` IS the live chat
                (see AppNavigator), so this drops the guest straight into the
                conversation with the receptionist. */}
            <Tile
              title="Help Desk"
              subtitle="Chat with our receptionist"
              image={toSource(helpdeskImg)}
              icon="headset-outline"
              onPress={() => rootNavigate('ReceptionTab')}
            />
            <Tile
              title="Live TV"
              subtitle="Watch your favourite"
              image={toSource(livetvImg)}
              icon="tv-outline"
              soon
              onPress={comingSoon}
            />
          </View>
        </View>

        {/* ── Bottom control row (spec: 210 → 140 high) ── */}
        {/* marginTop = DS.gap so hero→bottom-row spacing matches the vertical
            gap between the two tile rows (Service Request / Laundry). */}
        <View style={{flexDirection: 'row', gap: DS.gap, marginTop: DS.gap}}>
          <PanelCard title="Door Lock">
            <TvPressable
              onPress={() => setDoorClosed(prev => !prev)}
              label="Toggle door lock"
              style={{
                flexDirection: 'row',
                alignItems: 'stretch',
                borderRadius: DS.radiusSm,
                padding: 2,
                flex: 1,
              }}>
              {/* Figma door component: tall portrait photo filling the card height */}
              <View
                style={{
                  width: 74,
                  borderRadius: 11,
                  overflow: 'hidden',
                  alignSelf: 'stretch',
                }}>
                <Image
                  source={toSource(doorImg)}
                  resizeMode="cover"
                  style={{width: '100%', height: '100%'}}
                />
              </View>
              <View style={{marginLeft: 12, flex: 1, justifyContent: 'center'}}>
                <Text style={{color: DS.text2, fontSize: 12, fontFamily: FONT}}>Door is</Text>
                <Text
                  style={{
                    color: DS.gold,
                    fontSize: 16,
                    fontWeight: '800',
                    letterSpacing: 0.5,
                    marginTop: 1,
                    fontFamily: FONT,
                  }}>
                  {doorClosed ? 'LOCKED' : 'UNLOCKED'}
                </Text>
                {/* Figma: outline glass pill, not a filled button */}
                <View
                  style={{
                    alignSelf: 'flex-start',
                    flexDirection: 'row',
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: DS.border,
                    backgroundColor: 'rgba(255,255,255,0.10)',
                    borderRadius: 9,
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    marginTop: 9,
                  }}>
                  <Icon
                    name={doorClosed ? 'lock-open-outline' : 'lock-closed-outline'}
                    size={11}
                    color={DS.text}
                  />
                  <Text
                    style={{
                      color: DS.text,
                      fontSize: 10,
                      fontWeight: '700',
                      marginLeft: 5,
                      fontFamily: FONT,
                    }}>
                    {doorClosed ? 'UNLOCK DOOR' : 'LOCK DOOR'}
                  </Text>
                </View>
              </View>
            </TvPressable>
          </PanelCard>

          <PanelCard title="DND & MMR">
            {room.isLoading ? (
              <ActivityIndicator color={DS.gold} />
            ) : (
              <View style={{flexDirection: 'row', alignItems: 'stretch', flex: 1}}>
                <SceneSwitch
                  device={dndScene}
                  glyph={color => <DoNotDisturbIcon size={ROOM_MODE_GLYPH} color={color} />}
                  title="DND"
                  subtitle="Do Not Disturb"
                  onToggle={flipScene}
                />
                <View style={{width: 1, backgroundColor: DS.divider, marginHorizontal: 6}} />
                <SceneSwitch
                  device={mmrScene}
                  glyph={color => <MakeMyRoomIcon size={ROOM_MODE_GLYPH} color={color} />}
                  title="MMR"
                  subtitle="Make My Room"
                  onToggle={flipScene}
                />
              </View>
            )}
          </PanelCard>

          {/* Width hugs its three squares; Climate takes the freed space. */}
          <PanelCard title="Light Scenes" width={300}>
            {room.isLoading ? (
              <ActivityIndicator color={DS.gold} />
            ) : lightScenes.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {lightScenes.map(s => (
                  <SceneSquare
                    key={s._id}
                    name={s.friendlyname ?? 'Scene'}
                    icon={sceneIcon(s.friendlyname)}
                    active={s.isOn}
                    onPress={() => flipScene(s)}
                  />
                ))}
              </ScrollView>
            ) : (
              // Live data wins when it exists; until then the demo set keeps the
              // client presentation alive — three independent scenes, exactly
              // how the live ones behave.
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {DEMO_SCENES.map(d => (
                  <SceneSquare
                    key={d.key}
                    name={d.name}
                    icon={d.icon}
                    active={demo.isOn(d.key)}
                    onPress={() => demo.toggle(d.key)}
                  />
                ))}
              </ScrollView>
            )}
          </PanelCard>

          {/* Curtains, not Climate: the client moved AC off the dashboard in the
              latest Figma. Nothing is lost — "Climate / AC" is still a tile in
              the grid above, and it opens the full AC screen. */}
          <PanelCard title="Curtain Control" flex={1.5}>
            <CurtainControl />
          </PanelCard>
        </View>

        {/* ── Footer: non-smoking left, hotel wordmark centre, vendor mark right ── */}
        <TvFooter />
      </ScrollView>
    </SafeAreaView>
  );
}
