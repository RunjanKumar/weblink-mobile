import React, {useState} from 'react';
import {
  Alert,
  type DimensionValue,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Card, ErrorState, Skeleton, Toggle, WebIcon, WEB_ICON_ACCENTS} from '../../components';
import type {WebIconName} from '../../components';
import {useDashboardViewModel, useRoomControl} from '../../viewmodels';
import {useAuth} from '../../store/AuthContext';
import {useTVFocus} from '../../hooks/useTVFocus';
import {useResponsive} from '../../hooks/useResponsive';
import {useTheme} from '../../theme';
import {getDisplayName} from '../../models/user.model';
import type {QuickCall, RoomDevice} from '../../models/device.model';
import type {HomeStackParamList} from '../../navigation/types';

type Props = NativeStackScreenProps<HomeStackParamList, 'Dashboard'>;

/* ── Header: greeting + kebab (feedback / logout) ── */
function DashboardHeader({
  name,
  subtitle,
  onFeedback,
}: {
  name: string;
  subtitle: string;
  onFeedback: () => void;
}) {
  const {theme} = useTheme();
  const {signOut} = useAuth();
  const onMenu = () => {
    Alert.alert('Menu', undefined, [
      {text: 'Share feedback', onPress: onFeedback},
      {text: 'Log out', style: 'destructive', onPress: () => void signOut()},
      {text: 'Cancel', style: 'cancel'},
    ]);
  };
  return (
    <View className="flex-row items-start justify-between px-5 pt-4">
      <View className="flex-1">
        <Text className="text-sm text-content-tertiary">Welcome,</Text>
        <Text className="mt-1 text-2xl font-bold text-content">{name} 👋</Text>
        {subtitle ? <Text className="mt-1 text-xs text-content-tertiary">{subtitle}</Text> : null}
      </View>
      <Pressable
        onPress={onMenu}
        focusable
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel="Menu"
        className="h-10 w-10 items-center justify-center rounded-full">
        <Icon name="ellipsis-vertical" size={22} color={theme.colors.text} />
      </Pressable>
    </View>
  );
}

/* ── Door: local-only toggle (mirrors the web placeholder — no backend yet) ── */
function DoorControlCard() {
  const {theme} = useTheme();
  const [closed, setClosed] = useState(true);
  return (
    <Card className="flex-row items-center justify-between">
      <View className="flex-1 pr-3">
        <Text className="text-sm font-semibold text-content">
          {closed ? 'Doors are closed' : 'Doors are open'}
        </Text>
        <Text className="mt-1 text-xs text-content-tertiary">Switch to open or close the doors</Text>
      </View>
      <Toggle
        value={!closed}
        onValueChange={next => setClosed(!next)}
        accessibilityLabel="Toggle door"
      />
      <View className="ml-3">
        <Icon name={closed ? 'lock-closed' : 'lock-open'} size={20} color={theme.colors.primary} />
      </View>
    </Card>
  );
}

/* ── Scene / quick-call glyphs ──
   The web uses emoji on tinted circles for both rows. Its lists are hard-coded
   dummies while ours come from the API, so match on name and fall back to a
   neutral glyph for scenes the web never had. Tint colours cycle in the web's
   order (emerald / orange / purple). */
const SCENE_EMOJI: Record<string, string> = {
  master: '📍',
  night: '🌙',
  movie: '🎬',
};
const SCENE_TINTS = ['rgba(6,78,59,0.6)', 'rgba(124,45,18,0.6)', 'rgba(88,28,135,0.6)'];

function sceneEmoji(name?: string): string {
  const key = (name ?? '').toLowerCase();
  const match = Object.entries(SCENE_EMOJI).find(([k]) => key.includes(k));
  return match ? match[1] : '💡';
}

const CALL_EMOJI: Record<string, string> = {
  reception: '🏨',
  tea: '🍵',
  snack: '🍪',
  coffee: '☕',
  food: '🍽️',
  clean: '🧹',
  room: '🧹',
};

function callEmoji(name?: string): string {
  const key = (name ?? '').toLowerCase();
  const match = Object.entries(CALL_EMOJI).find(([k]) => key.includes(k));
  return match ? match[1] : '🛎️';
}

/* ── One scene row (real API via useRoomControl) ── */
function SceneRow({
  device,
  index,
  onToggle,
}: {
  device: RoomDevice;
  index: number;
  onToggle: (d: RoomDevice) => void;
}) {
  const {theme} = useTheme();
  return (
    <Card className="mb-3 flex-row items-center justify-between">
      <View className="flex-row items-center">
        <View
          className="h-10 w-10 items-center justify-center rounded-full"
          style={{backgroundColor: SCENE_TINTS[index % SCENE_TINTS.length]}}>
          <Text style={{fontSize: 18}}>{sceneEmoji(device.friendlyname)}</Text>
        </View>
        <View className="ml-3">
          <Text className="text-sm font-medium text-content">{device.friendlyname ?? 'Scene'}</Text>
          {device.isOffline ? (
            <View className="mt-0.5 flex-row items-center">
              <Icon name="wifi-outline" size={12} color={theme.colors.danger} />
              <Text className="ml-1 text-[10px] text-danger">Offline</Text>
            </View>
          ) : null}
        </View>
      </View>
      <Toggle
        value={device.isOn}
        onValueChange={() => onToggle(device)}
        accessibilityLabel={`Toggle ${device.friendlyname ?? 'scene'}`}
      />
    </Card>
  );
}

/* ── Quick-call chip ── */
function QuickCallCard({item, onPress}: {item: QuickCall; onPress: () => void}) {
  const {theme} = useTheme();
  const {focused, onFocus, onBlur} = useTVFocus();
  return (
    <Pressable
      onPress={onPress}
      onFocus={onFocus}
      onBlur={onBlur}
      focusable
      accessibilityRole="button"
      accessibilityLabel={item.name}
      className="mr-3 w-28 items-center rounded-2xl bg-surface p-3"
      style={{borderWidth: 2, borderColor: focused ? theme.colors.focusRing : theme.colors.border}}>
      <View className="mb-2 h-12 w-12 items-center justify-center rounded-xl bg-surface-elevated">
        <Text style={{fontSize: 26}}>{callEmoji(item.name)}</Text>
      </View>
      <Text className="text-xs font-semibold text-content" numberOfLines={1}>
        {item.name}
      </Text>
      {item.description ? (
        <Text className="mt-0.5 text-center text-[10px] text-content-tertiary" numberOfLines={2}>
          {item.description}
        </Text>
      ) : null}
    </Pressable>
  );
}

/* ── Quick-action tile ──
   Icon + accent colour are the web's (see components/WebIcon), so the tile grid
   reads the same on both platforms. `accent` falls back to the theme primary for
   tiles the web has no counterpart for. */
function QuickActionTile({
  icon,
  accent,
  title,
  onPress,
  right,
  width,
  hasTVPreferredFocus = false,
}: {
  icon: WebIconName;
  accent?: string;
  title: string;
  onPress: () => void;
  right?: React.ReactNode;
  width: DimensionValue;
  hasTVPreferredFocus?: boolean;
}) {
  const {theme} = useTheme();
  const {focused, onFocus, onBlur} = useTVFocus();
  return (
    <Pressable
      onPress={onPress}
      onFocus={onFocus}
      onBlur={onBlur}
      focusable
      hasTVPreferredFocus={hasTVPreferredFocus}
      accessibilityRole="button"
      accessibilityLabel={title}
      className="mb-3 rounded-2xl bg-surface p-4"
      style={{width, borderWidth: 2, borderColor: focused ? theme.colors.focusRing : theme.colors.border}}>
      <View className="flex-row items-center justify-between">
        <WebIcon name={icon} size={24} color={accent ?? theme.colors.primary} />
        {right}
      </View>
      <Text className="mt-6 text-sm font-bold text-content">{title}</Text>
    </Pressable>
  );
}

export function DashboardScreen({navigation}: Props) {
  const {theme} = useTheme();
  const {select} = useResponsive();
  const dash = useDashboardViewModel();
  const room = useRoomControl();
  // 2 columns on phone, 3 on tablet/TV.
  const tileWidth = select<DimensionValue>({phone: '48%', tablet: '31%', tv: '31%'});

  const safeAreaStyle = {flex: 1, backgroundColor: theme.colors.background};

  if (dash.isLoading) {
    return (
      <SafeAreaView style={safeAreaStyle} edges={['top']}>
        <View className="px-5 pt-4">
          <Skeleton width={160} height={24} radius={8} />
          <Skeleton width={110} height={14} radius={8} style={{marginTop: 10}} />
          <Skeleton width="100%" height={80} radius={20} style={{marginTop: 24}} />
          <Skeleton width="100%" height={140} radius={20} style={{marginTop: 16}} />
        </View>
      </SafeAreaView>
    );
  }

  if (dash.error) {
    return (
      <SafeAreaView style={safeAreaStyle} edges={['top']}>
        <ErrorState message={dash.error} onRetry={dash.refetch} />
      </SafeAreaView>
    );
  }

  const subtitle = [dash.roomNumber != null ? `Room ${dash.roomNumber}` : null, dash.hotel?.name]
    .filter(Boolean)
    .join(' · ');

  const toggleScene = (device: RoomDevice) => {
    room.toggleDevice(device).catch(() =>
      Alert.alert('Error', 'Could not update the scene. Please try again.'),
    );
  };

  return (
    <SafeAreaView style={safeAreaStyle} edges={['top']}>
      <ScrollView
        contentContainerStyle={{paddingBottom: 32}}
        refreshControl={
          <RefreshControl
            refreshing={dash.isRefetching}
            onRefresh={() => {
              dash.refetch();
              room.refetch();
            }}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        }>
        <DashboardHeader
          name={getDisplayName(dash.user)}
          subtitle={subtitle}
          onFeedback={() => navigation.navigate('Feedback')}
        />

        <View className="mt-6 px-5">
          <DoorControlCard />
        </View>

        {/* Room scenes (real devices) */}
        {room.hasScenes ? (
          <View className="mt-6 px-5">
            <Text className="mb-3 text-lg font-bold text-content">
              Room <Text className="text-primary">Scenes</Text>
            </Text>
            {room.scenes.map((s, i) => (
              <SceneRow key={s._id} device={s} index={i} onToggle={toggleScene} />
            ))}
          </View>
        ) : null}

        {/* Quick calls */}
        {dash.quickCalls.length > 0 ? (
          <View className="mt-4">
            <Text className="mb-3 px-5 text-lg font-bold text-content">
              Quick <Text className="text-primary">Calls</Text>
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{paddingHorizontal: 20}}>
              {dash.quickCalls.map(c => (
                <QuickCallCard
                  key={c._id}
                  item={c}
                  onPress={() => dash.onQuickCallPress(c, () => navigation.navigate('Food'))}
                />
              ))}
            </ScrollView>
          </View>
        ) : null}

        {/* Quick actions */}
        <View className="mt-6 px-5">
          <Text className="mb-3 text-lg font-bold text-content">
            Quick <Text className="text-primary">Actions</Text>
          </Text>
          <View className="flex-row flex-wrap justify-between">
            <QuickActionTile
              icon="bulb"
              accent={WEB_ICON_ACCENTS.bulb}
              title="Lights Control"
              width={tileWidth}
              hasTVPreferredFocus
              onPress={() => navigation.navigate('Lights')}
              right={
                <Toggle
                  size="sm"
                  value={room.masterOn}
                  onValueChange={() =>
                    room
                      .toggleMaster()
                      .catch(() => Alert.alert('Error', 'Could not toggle the master scene.'))
                  }
                  accessibilityLabel="Master scene"
                />
              }
            />
            <QuickActionTile
              icon="snow"
              accent={WEB_ICON_ACCENTS.snow}
              title="Climate / AC"
              width={tileWidth}
              onPress={() => navigation.navigate('Ac')}
            />
            <QuickActionTile
              icon="bell"
              accent={WEB_ICON_ACCENTS.bell}
              title="Service Request"
              width={tileWidth}
              onPress={() => navigation.navigate('Services')}
            />
            <QuickActionTile
              icon="food"
              accent={WEB_ICON_ACCENTS.food}
              title="Food Order"
              width={tileWidth}
              onPress={() => navigation.navigate('Food')}
            />
            <QuickActionTile
              icon="facilities"
              title="Facilities"
              width={tileWidth}
              onPress={() => navigation.navigate('Facilities')}
            />
            <QuickActionTile
              icon="laundry"
              title="Laundry"
              width={tileWidth}
              onPress={() => navigation.navigate('Laundry')}
            />
            <QuickActionTile
              icon="reception"
              title="Reception"
              width={tileWidth}
              onPress={() => navigation.navigate('Reception')}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
