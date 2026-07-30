import React, {useState} from 'react';
import {ActivityIndicator, ScrollView, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {toast} from '../../components';
import {
  DS,
  FONT,
  GLASS_BLUR,
  GlassPanel,
  GlassSheen,
  RoomIcon,
  SHADOW,
  TvBackButton,
  TvBackdrop,
  TvFooter,
  TvPressable,
  TvTopBar,
  roomIconFor,
  type RoomIconName,
} from '../../components/TvGlass';
import {useRoomControl} from '../../viewmodels';
import {DEVICE_TYPE, FAN_LEVEL} from '../../constants/roomControl';
import {getApiErrorMessage} from '../../utils/errorHandler';
import type {RoomDevice} from '../../models/device.model';
import type {HomeStackParamList} from '../../navigation/types';

type Props = NativeStackScreenProps<HomeStackParamList, 'Lights'>;

/**
 * Light Control — the client's Figma screen.
 *
 * Wears the SAME chrome as the dashboard and the food frames (TvTopBar with the
 * "Dear guest" welcome, TvFooter with the hotel wordmark) — the client asked for
 * the welcome header and hotel footer on every page, so the guest reads all of
 * them as one surface. Between them, the Figma's single soft pane: back button +
 * LIGHT CONTROL heading, then a five-column grid of fixture tiles.
 *
 * Each tile is a drawn line icon (see RoomIcons), the fixture name, and ON/OFF in
 * the bottom-right corner — no switches, because at ten feet a word reads faster
 * than a 44px toggle, and the whole tile is the button.
 *
 * The phone keeps `LightsScreen`; the navigator picks on IS_TV. Data is the
 * shared `useRoomControl` ViewModel, so a toggle here and a scene on the
 * dashboard hit one React Query cache and stay in agreement.
 */

/* Grid: 5 across. 18.4% + 2×0.8% margin = 20% per column, exactly. */
const COL_WIDTH = '18.4%';
const COL_INSET = '0.8%';
/* Two rows + the chrome fit the 720 viewport with nothing cut off. */
const TILE_HEIGHT = 208;

/**
 * Figma tile states. ON is champagne GLASS, not paint — the warm tint at low
 * opacity over the pre-blurred golden backdrop is what produces the Figma's
 * lit-from-behind look. OFF stays neutral white glass so the two states read
 * apart at ten feet. Keep both LOW: the backdrop must stay visible through the
 * tile (the client's photo of the panel showed exactly what going milky looks
 * like), and GlassSheen composites another few percent on top.
 *
 * RETUNED (client: "tiles still too bright, want more glass"): both fills are
 * halved and the sheen runs at `SHEEN`, so a tile now lands on the same
 * effective weight as the food menu's unavailable cards — the reference the
 * client pointed at — which is 0.12 fill at 45% opacity ≈ 0.054 white. The
 * fill is only half the story: at full strength the sheen's veil and gradient
 * add several more percent, which is what kept the tiles reading as painted
 * panels after earlier fill-only passes.
 */
const FILL_ON = 'rgba(222,186,128,0.12)';
const FILL_OFF = 'rgba(255,255,255,0.055)';
const SHEEN = 0.5;
const BORDER_ON = 'rgba(231,215,181,0.42)';
const ICON_OFF = 'rgba(255,255,255,0.55)';
const LABEL_OFF = 'rgba(255,255,255,0.50)';

/**
 * Shown only when the room reports no devices at all, so the client can still
 * walk the screen in a demo. Exactly the Figma's ten fixtures; state is local
 * and nothing is sent to the backend.
 */
const DEMO_LIGHTS: {id: string; name: string; icon: RoomIconName; on: boolean}[] = [
  {id: 'demo-master', name: 'Master Light', icon: 'pendant', on: true},
  {id: 'demo-entrance', name: 'Entrance', icon: 'door', on: false},
  {id: 'demo-ceiling', name: 'Ceiling', icon: 'ceiling', on: true},
  {id: 'demo-bed-left', name: 'Bed Left', icon: 'bedLeft', on: true},
  {id: 'demo-bed-right', name: 'Bed Right', icon: 'bedRight', on: false},
  {id: 'demo-cove', name: 'Cove Light', icon: 'cove', on: true},
  {id: 'demo-bath', name: 'Bathroom', icon: 'bathroom', on: true},
  {id: 'demo-mirror', name: 'Mirror', icon: 'mirror', on: false},
  {id: 'demo-wardrobe', name: 'Wardrobe', icon: 'wardrobe', on: true},
  {id: 'demo-balcony', name: 'Balcony', icon: 'balcony', on: true},
];

/* ── One fixture ── */
function LightTile({
  name,
  icon,
  on,
  offline = false,
  level,
  onPress,
  onLevel,
}: {
  name: string;
  icon: RoomIconName;
  on: boolean;
  offline?: boolean;
  /** Fan speed; `undefined` for a plain light. */
  level?: number;
  onPress: () => void;
  onLevel?: (next: number) => void;
}) {
  return (
    <TvPressable
      onPress={onPress}
      label={`${name}, currently ${on ? 'on' : 'off'}`}
      restBorderColor={on ? BORDER_ON : DS.borderSoft}
      style={{
        width: COL_WIDTH,
        height: TILE_HEIGHT,
        marginHorizontal: COL_INSET,
        marginBottom: 14,
        borderRadius: DS.radius,
        overflow: 'hidden',
        paddingHorizontal: 16,
        paddingTop: 14,
        paddingBottom: 12,
        backgroundColor: on ? FILL_ON : FILL_OFF,
        ...SHADOW,
        ...(GLASS_BLUR ?? {}),
      }}>
      {/* behind the content, so icon and labels stay crisp — and at half
          strength, so the tile keeps its catch-light without going milky */}
      <GlassSheen strength={SHEEN} />

      <View style={{flex: 1, alignItems: 'center', justifyContent: 'center'}}>
        <RoomIcon name={icon} size={64} color={on ? DS.gold : ICON_OFF} />
      </View>

      <Text
        numberOfLines={1}
        style={{
          color: DS.text,
          fontSize: 14,
          fontWeight: '500',
          letterSpacing: 0.8,
          textAlign: 'center',
          fontFamily: FONT,
        }}>
        {name.toUpperCase()}
      </Text>

      <View style={{flexDirection: 'row', alignItems: 'center', marginTop: 10}}>
        {/* Fans keep a speed control — the Figma has none because the client's
            room is all lights, but the device model allows one. */}
        {level != null && onLevel ? (
          <View style={{flexDirection: 'row', alignItems: 'center', flex: 1}}>
            <TvPressable
              onPress={() => onLevel(Math.max(FAN_LEVEL.MIN, level - FAN_LEVEL.STEP))}
              label="Slower"
              restBorderColor={DS.border}
              style={{
                width: 24,
                height: 24,
                borderRadius: 12,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <Icon name="remove" size={12} color={DS.text} />
            </TvPressable>
            <Text
              style={{
                color: DS.gold,
                fontSize: 11,
                fontWeight: '700',
                marginHorizontal: 4,
                fontFamily: FONT,
              }}>
              {level}%
            </Text>
            <TvPressable
              onPress={() => onLevel(Math.min(FAN_LEVEL.MAX, level + FAN_LEVEL.STEP))}
              label="Faster"
              restBorderColor={DS.border}
              style={{
                width: 24,
                height: 24,
                borderRadius: 12,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <Icon name="add" size={12} color={DS.text} />
            </TvPressable>
          </View>
        ) : (
          <View style={{flex: 1}}>
            {offline ? (
              <Text style={{color: DS.danger, fontSize: 10, fontFamily: FONT}}>OFFLINE</Text>
            ) : null}
          </View>
        )}
        <Text
          style={{
            color: on ? DS.gold : LABEL_OFF,
            fontSize: 13,
            fontWeight: '600',
            letterSpacing: 1,
            fontFamily: FONT,
          }}>
          {on ? 'ON' : 'OFF'}
        </Text>
      </View>
    </TvPressable>
  );
}

export function TvLightsScreen({navigation}: Props) {
  const room = useRoomControl();
  const [demo, setDemo] = useState(DEMO_LIGHTS);

  // The master scene leads the grid as "Master Light" (Figma tile 1); the rest
  // of the scenes — DND, MMR, lighting moods — belong to the dashboard.
  const fixtures = [
    ...(room.master ? [room.master] : []),
    ...room.lights.filter(d => d._id !== room.master?._id),
  ];
  const isDemo = !room.isLoading && !room.error && fixtures.length === 0;

  const onToggle = (device: RoomDevice) => {
    const call = device.isMasterScene ? room.toggleMaster() : room.toggleDevice(device);
    call.catch(error =>
      toast.error(getApiErrorMessage(error, 'Could not update the light. Please try again.')),
    );
  };

  return (
    <SafeAreaView style={{flex: 1, backgroundColor: DS.pageBg}} edges={['top']}>
      <TvBackdrop />

      {/* Same page scaffold as the dashboard and food frames: welcome bar on
          top, hotel footer underneath, content between. */}
      <View style={{flex: 1, paddingHorizontal: DS.margin, paddingTop: DS.margin, paddingBottom: 14}}>
        <TvTopBar />

        {/* The Figma's single soft pane — quieter than a PanelCard so the tiles
            provide the glass and the pane just frames them. */}
        <GlassPanel
          style={{
            flex: 1,
            marginTop: 16,
            padding: 18,
            backgroundColor: 'rgba(255,255,255,0.05)',
          }}>
          {/* ── Section header: back + title, refresh on the right ── */}
          <View style={{flexDirection: 'row', alignItems: 'center'}}>
            {/* The remote's Back key already works (webosRemote → goBackIfPossible);
                this is the on-screen affordance for guests who never find it. */}
            <TvBackButton onPress={() => navigation.goBack()} />

            <Text
              style={{
                color: DS.text,
                fontSize: 26,
                fontWeight: '500',
                letterSpacing: 1.5,
                marginLeft: 16,
                flex: 1,
                fontFamily: FONT,
              }}>
              LIGHT CONTROLS
            </Text>

            <TvPressable
              onPress={() => room.refetch()}
              label="Refresh lights"
              restBorderColor={DS.border}
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: DS.glass,
              }}>
              {room.isRefetching ? (
                <ActivityIndicator size="small" color={DS.gold} />
              ) : (
                <Icon name="refresh" size={20} color={DS.text} />
              )}
            </TvPressable>
          </View>

          {/* ── Fixtures ── */}
          {room.isLoading ? (
            <View style={{flex: 1, alignItems: 'center', justifyContent: 'center'}}>
              <ActivityIndicator size="large" color={DS.gold} />
              <Text style={{color: DS.text2, fontSize: 13, marginTop: 12, fontFamily: FONT}}>
                Loading your room…
              </Text>
            </View>
          ) : room.error ? (
            <View style={{flex: 1, alignItems: 'center', justifyContent: 'center'}}>
              <Icon name="cloud-offline-outline" size={34} color={DS.gold} />
              <Text
                style={{
                  color: DS.text2,
                  fontSize: 14,
                  marginTop: 12,
                  textAlign: 'center',
                  fontFamily: FONT,
                }}>
                {room.error}
              </Text>
              <TvPressable
                onPress={() => room.refetch()}
                label="Try again"
                restBorderColor="#E5CFA5"
                style={{
                  height: 37,
                  justifyContent: 'center',
                  borderRadius: 11,
                  paddingHorizontal: 20,
                  backgroundColor: DS.gold,
                  marginTop: 16,
                }}>
                <Text
                  style={{
                    color: DS.text,
                    fontSize: 12,
                    fontWeight: '700',
                    letterSpacing: 1,
                    fontFamily: FONT,
                  }}>
                  TRY AGAIN
                </Text>
              </TvPressable>
            </View>
          ) : (
            <ScrollView
              style={{marginTop: 16}}
              contentContainerStyle={{flexGrow: 1}}
              showsVerticalScrollIndicator={false}>
              <View
                style={{
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  // cancels each tile's COL_INSET so the grid sits flush with the
                  // frame's padding instead of 9px inside it
                  marginHorizontal: '-0.8%',
                }}>
                {isDemo
                  ? demo.map(d => (
                      <LightTile
                        key={d.id}
                        name={d.name}
                        icon={d.icon}
                        on={d.on}
                        onPress={() =>
                          setDemo(prev =>
                            prev.map(x => (x.id === d.id ? {...x, on: !x.on} : x)),
                          )
                        }
                      />
                    ))
                  : fixtures.map(device => (
                      <LightTile
                        key={device._id}
                        name={device.friendlyname ?? 'Light'}
                        icon={
                          device.isMasterScene
                            ? 'pendant'
                            : roomIconFor(device.friendlyname)
                        }
                        on={device.isOn}
                        offline={device.isOffline}
                        level={device.type === DEVICE_TYPE.FAN ? device.level : undefined}
                        onPress={() => onToggle(device)}
                        onLevel={next => room.setFanLevel(device, next)}
                      />
                    ))}
              </View>
            </ScrollView>
          )}
        </GlassPanel>

        <TvFooter marginTop={12} />
      </View>
    </SafeAreaView>
  );
}
