import React, {useEffect, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Animated,
  type DimensionValue,
  Easing,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {useIsFocused} from '@react-navigation/native';
import {
  AppImage,
  Card,
  RefreshButton,
  Skeleton,
  Toggle,
  WebIcon,
  useWebIconAccents,
  dialog,
  toast,
} from '../../components';
import type {WebIconName} from '../../components';
import {useDashboardViewModel, useRoomControl} from '../../viewmodels';
import {useAuth} from '../../store/AuthContext';
import {useAppVisible} from '../../hooks/useAppVisible';
import {useTVFocus} from '../../hooks/useTVFocus';
import {useResponsive} from '../../hooks/useResponsive';
import {useTheme} from '../../theme';
import {getApiErrorMessage} from '../../utils/errorHandler';
import {IS_TV, IS_WEB_BUILD} from '../../utils/responsive';
import {getDisplayName} from '../../models/user.model';
import type {QuickCall, RoomDevice} from '../../models/device.model';
import type {HomeStackParamList} from '../../navigation/types';

type Props = NativeStackScreenProps<HomeStackParamList, 'Dashboard'>;

/* Ten-foot sizing for the greeting block.

   Deliberately a MODEST bump, not the ~2x it looks like it needs: the webOS
   build also applies a global 1.5x `zoom` (see web/index.html), so these land
   at roughly 24/45/22 on a TV. Doubling here as well would scale the header
   twice and dwarf the rest of the dashboard.

   Gated on IS_TV (not IS_WEB_BUILD) because this is a viewing-distance concern:
   a phone APK is untouched, and an Android TV APK — which gets no zoom — wants
   the bump on its own. */
const HEADER_SIZE = IS_TV
  ? {greeting: 16, name: 30, subtitle: 15, gap: 5, kebab: 48, kebabIcon: 26}
  : // Phone greeting enlarged on request: the guest's name is the first thing
    // the screen should say, and at 24 it read as a caption next to the cards
    // below it. The kebab stays 40 — it is a control, not part of the greeting.
    {greeting: 17, name: 32, subtitle: 15, gap: 5, kebab: 40, kebabIcon: 22};

/**
 * Which welcome treatment the TV shows. BOTH implementations are kept on
 * purpose so the two can be compared on the device — flip this one word to
 * switch, no code needs uncommenting.
 *
 *   'banner' — running marquee strip, scrolls right-to-left (newest)
 *   'lines'  — staggered fade/rise + waving hand (previous)
 */
const TV_WELCOME: 'banner' | 'lines' = 'banner';

/** Pause with an empty banner between one pass of the message and the next. */
const REPEAT_GAP_MS = 900;

/**
 * Running welcome banner — the greeting scrolls continuously right-to-left,
 * the way a hotel lobby display does. TV only.
 *
 * ONE message at a time, deliberately: it travels the full width, leaves on the
 * left, pauses, then re-enters from the right. Showing several copies at once
 * fills the strip end to end and there is no clear place to start reading.
 *
 * The text sits in a row with `flexShrink: 0` so `onLayout` reports its true
 * width. That matters: measuring it while it was clipped to the container is
 * what made an earlier version reset while the text was still on screen, so the
 * message appeared to restart halfway through.
 */
function WelcomeBanner({name, subtitle}: {name: string; subtitle: string}) {
  const {theme} = useTheme();
  const [trackWidth, setTrackWidth] = useState(0);
  const [copyWidth, setCopyWidth] = useState(0);
  const offset = useRef(new Animated.Value(0)).current;
  // A marquee never ends, so it must not run when nobody can see it: another
  // tab is open, or the TV has been switched to a different input. Left running
  // it repaints for as long as the television is powered on.
  const screenFocused = useIsFocused();
  const appVisible = useAppVisible();
  const running = screenFocused && appVisible;

  const message = [`Welcome, ${name} 👋`, subtitle, 'Enjoy Your Stay 😊']
    .filter(Boolean)
    .join('   ·   ');

  useEffect(() => {
    if (!trackWidth || !copyWidth || !running) {
      return;
    }
    // Constant speed regardless of message length, so a long guest name does
    // not scroll faster than a short one.
    const PIXELS_PER_SECOND = 135;
    // Off the right edge, all the way until the tail clears the left edge.
    const distance = trackWidth + copyWidth;
    offset.setValue(trackWidth);
    const run = Animated.loop(
      Animated.sequence([
        Animated.timing(offset, {
          toValue: -copyWidth,
          duration: (distance / PIXELS_PER_SECOND) * 1000,
          easing: Easing.linear,
          useNativeDriver: Platform.OS !== 'web',
        }),
        // Empty beat between passes, so each one reads as a separate message
        // rather than an unbroken stream.
        Animated.delay(REPEAT_GAP_MS),
      ]),
    );
    run.start();
    return () => run.stop();
  }, [trackWidth, copyWidth, offset, running]);

  const textStyle = {
    color: theme.colors.text,
    fontSize: HEADER_SIZE.name,
    fontWeight: '700' as const,
    // Must not compress inside the row, or every copy measures short.
    flexShrink: 0,
  };

  return (
    <View
      onLayout={e => setTrackWidth(e.nativeEvent.layout.width)}
      style={{
        height: HEADER_SIZE.name * 1.9,
        justifyContent: 'center',
        overflow: 'hidden',
        borderRadius: 14,
        backgroundColor: theme.colors.surface,
      }}>
      <Animated.View style={{flexDirection: 'row', transform: [{translateX: offset}]}}>
        <Text numberOfLines={1} onLayout={e => setCopyWidth(e.nativeEvent.layout.width)} style={textStyle}>
          {message}
        </Text>
      </Animated.View>
    </View>
  );
}

/**
 * Welcome entrance: the three greeting lines fade and rise in sequence, then
 * the hand waves a few times and settles.
 *
 * TV only — on a phone the values start at their final state and nothing
 * animates, so the dashboard opens as instantly as it does today. Built on RN's
 * `Animated`, NOT reanimated: reanimated does not initialise in the webOS
 * bundle (see StateViews/Skeleton for the same constraint).
 */
function useWelcomeAnimation(ready: boolean) {
  const initial = IS_TV ? 0 : 1;
  const line1 = useRef(new Animated.Value(initial)).current;
  const line2 = useRef(new Animated.Value(initial)).current;
  const line3 = useRef(new Animated.Value(initial)).current;
  const wave = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!ready || !IS_TV) {
      return;
    }
    const useNativeDriver = Platform.OS !== 'web';
    const rise = (value: Animated.Value) =>
      Animated.timing(value, {
        toValue: 1,
        duration: 460,
        easing: Easing.out(Easing.cubic),
        useNativeDriver,
      });
    const tilt = (toValue: number, duration: number) =>
      Animated.timing(wave, {
        toValue,
        duration,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver,
      });

    const entrance = Animated.stagger(120, [rise(line1), rise(line2), rise(line3)]);
    const hand = Animated.sequence([
      // Starts once the name itself has landed, so the wave reads as a greeting.
      Animated.delay(560),
      Animated.loop(Animated.sequence([tilt(1, 170), tilt(-1, 170)]), {iterations: 3}),
      tilt(0, 150),
    ]);

    entrance.start();
    hand.start();
    return () => {
      entrance.stop();
      hand.stop();
    };
  }, [ready, line1, line2, line3, wave]);

  const riseStyle = (value: Animated.Value) => ({
    opacity: value,
    transform: [{translateY: value.interpolate({inputRange: [0, 1], outputRange: [18, 0]})}],
  });

  return {
    riseStyle,
    line1,
    line2,
    line3,
    waveRotation: wave.interpolate({inputRange: [-1, 1], outputRange: ['-14deg', '14deg']}),
  };
}

/* ── Header: greeting + kebab (reference ThreeDotMenu + LogoutModal) ── */
function DashboardHeader({
  name,
  subtitle,
  loading,
  error,
  onFeedback,
  onProfile,
  onSettings,
  onRefresh,
  refreshing,
}: {
  name: string;
  subtitle: string;
  loading: boolean;
  error: string | null;
  onFeedback: () => void;
  onProfile: () => void;
  onSettings: () => void;
  onRefresh: () => void;
  refreshing: boolean;
}) {
  const {theme} = useTheme();
  const {signOut} = useAuth();
  const {focused, onFocus, onBlur} = useTVFocus();
  // Idle unless the staggered treatment is the one selected, so the banner
  // variant is not driving animated values nothing renders.
  const anim = useWelcomeAnimation(!loading && !error && TV_WELCOME === 'lines');

  const onMenu = async () => {
    // Reference order: Share feedback, then Log out (+ our Profile/Settings,
    // which the reference web app does not have as pages).
    const choice = await dialog.show({
      title: 'Menu',
      dismissValue: 'cancel',
      actions: [
        {label: 'Cancel', value: 'cancel', variant: 'secondary'},
        {label: 'Log out', value: 'logout', variant: 'danger'},
        {label: 'Settings', value: 'settings', variant: 'secondary'},
        {label: 'Profile', value: 'profile', variant: 'secondary'},
        {label: 'Share feedback', value: 'feedback', variant: 'primary'},
      ],
    });
    if (choice === 'feedback') {
      onFeedback();
    } else if (choice === 'profile') {
      onProfile();
    } else if (choice === 'settings') {
      onSettings();
    } else if (choice === 'logout') {
      // Reference LogoutModal copy.
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

  return (
    <View
      className="flex-row items-start justify-between"
      style={{
        paddingHorizontal: IS_TV ? 32 : 20,
        paddingTop: IS_TV ? 24 : 16,
      }}>
      <View className="flex-1">
        {loading ? (
          <View>
            {/* Sized off HEADER_SIZE so the placeholder and the real greeting
                occupy the same box — otherwise the page jumps as it loads. */}
            <Skeleton width={IS_TV ? 300 : 200} height={IS_TV ? 44 : 32} radius={8} />
            <Skeleton
              width={IS_TV ? 200 : 130}
              height={IS_TV ? 22 : 17}
              radius={8}
              style={{marginTop: 10}}
            />
          </View>
        ) : error ? (
          // Reference: inline greeting error — the rest of the page stays alive.
          <Text className="font-semibold text-danger" style={{fontSize: HEADER_SIZE.greeting}}>
            Could not load profile
          </Text>
        ) : IS_TV && TV_WELCOME === 'banner' ? (
          <WelcomeBanner name={name} subtitle={subtitle} />
        ) : (
          <>
            <Animated.View style={anim.riseStyle(anim.line1)}>
              <Text className="text-content-tertiary" style={{fontSize: HEADER_SIZE.greeting}}>
                Welcome,
              </Text>
            </Animated.View>
            <Animated.View
              style={[
                anim.riseStyle(anim.line2),
                {flexDirection: 'row', alignItems: 'center', marginTop: HEADER_SIZE.gap},
              ]}>
              <Text className="font-bold text-content" style={{fontSize: HEADER_SIZE.name}}>
                {name}
              </Text>
              {/* Split out of the name so it can wave on its own. */}
              <Animated.Text
                style={{
                  fontSize: HEADER_SIZE.name,
                  marginLeft: 10,
                  transform: [{rotate: anim.waveRotation}],
                }}>
                👋
              </Animated.Text>
            </Animated.View>
            {subtitle ? (
              <Animated.View
                style={[anim.riseStyle(anim.line3), {marginTop: HEADER_SIZE.gap}]}>
                <Text className="text-content-tertiary" style={{fontSize: HEADER_SIZE.subtitle}}>
                  {subtitle}
                </Text>
              </Animated.View>
            ) : null}
          </>
        )}
      </View>
      {/* Pull-to-refresh cannot be performed with a remote, so TV gets a button. */}
      {IS_TV ? (
        <RefreshButton
          onPress={onRefresh}
          busy={refreshing}
          accessibilityLabel="Refresh dashboard"
        />
      ) : null}
      <Pressable
        onPress={onMenu}
        onFocus={onFocus}
        onBlur={onBlur}
        focusable
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel="Menu"
        className="items-center justify-center"
        style={{
          height: HEADER_SIZE.kebab,
          width: HEADER_SIZE.kebab,
          borderRadius: HEADER_SIZE.kebab / 2,
          // The kebab is D-pad focusable but drew no ring, so on a TV there was
          // no way to tell it was selected.
          borderWidth: 2,
          borderColor: focused ? theme.colors.focusRing : 'transparent',
          backgroundColor: focused ? theme.colors.surfaceElevated : 'transparent',
        }}>
        <Icon name="ellipsis-vertical" size={HEADER_SIZE.kebabIcon} color={theme.colors.text} />
      </Pressable>
    </View>
  );
}

/* ── Door: single round icon-button (reference DoorControl) ── */
function DoorControlCard() {
  const {theme} = useTheme();
  const {focused, onFocus, onBlur} = useTVFocus();
  const [closed, setClosed] = useState(true);
  return (
    // Whole card opens/closes the doors; the round lock is now the indicator.
    <Pressable
      onPress={() => setClosed(prev => !prev)}
      onFocus={onFocus}
      onBlur={onBlur}
      focusable
      accessibilityRole="switch"
      accessibilityState={{checked: !closed}}
      accessibilityLabel="Toggle door">
      <Card
        className="flex-row items-center justify-between"
        style={{
          borderWidth: 2,
          borderColor: focused ? theme.colors.focusRing : theme.colors.border,
        }}>
        <View className="flex-1 pr-3">
          <Text className="text-sm font-semibold text-content">
            {closed ? 'Doors are closed' : 'Doors are open'}
          </Text>
          <Text className="mt-1 text-xs text-content-tertiary">
            Switch to open or close the doors
          </Text>
        </View>
        <View
          pointerEvents="none"
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: closed ? theme.colors.surfaceElevated : `${theme.colors.primary}26`,
          }}>
          <Icon name={closed ? 'lock-closed' : 'lock-open'} size={20} color={theme.colors.primary} />
        </View>
      </Card>
    </Pressable>
  );
}

/* ── Scene tints: keyed to the scene NAME (reference), not the list index ── */
interface SceneTintSet {
  master: string;
  night: string;
  movie: string;
  default: string;
}
const SCENE_TINTS: Record<'dark' | 'light', SceneTintSet> = {
  dark: {
    master: 'rgba(34,197,94,0.35)', // green-500 tint
    night: 'rgba(124,45,18,0.6)', // orange-900
    movie: 'rgba(88,28,135,0.6)', // purple-900
    default: 'rgba(249,115,22,0.35)', // orange-500
  },
  light: {
    master: '#d8efe1',
    night: '#f7e3d0',
    movie: '#ece1f7',
    default: '#fde8d4',
  },
};

function sceneTint(scheme: 'dark' | 'light', name?: string): string {
  const key = (name ?? '').toLowerCase();
  const tints = SCENE_TINTS[scheme];
  if (key.includes('master')) {
    return tints.master;
  }
  if (key.includes('night')) {
    return tints.night;
  }
  if (key.includes('movie')) {
    return tints.movie;
  }
  return tints.default;
}

/* ── One scene row: API icon via AppImage, emoji fallback (reference) ── */
/**
 * The WHOLE row toggles the scene, not just the switch. Landing a D-pad on a
 * 44px switch is fiddly; a full-width row is one press away in any direction.
 * The switch itself is display-only so the row is a single focus stop.
 */
function SceneRow({device, onToggle}: {device: RoomDevice; onToggle: (d: RoomDevice) => void}) {
  const {theme, scheme} = useTheme();
  const {focused, onFocus, onBlur} = useTVFocus();
  return (
    <Pressable
      onPress={() => onToggle(device)}
      onFocus={onFocus}
      onBlur={onBlur}
      focusable
      accessibilityRole="switch"
      accessibilityState={{checked: device.isOn}}
      accessibilityLabel={`Toggle ${device.friendlyname ?? 'scene'}`}>
      <Card
        className="mb-3 flex-row items-center justify-between"
        style={{
          borderWidth: 2,
          borderColor: focused ? theme.colors.focusRing : theme.colors.border,
        }}>
      <View className="flex-row items-center" style={{flex: 1, minWidth: 0}}>
        <View
          className="h-10 w-10 items-center justify-center rounded-full"
          style={{backgroundColor: sceneTint(scheme, device.friendlyname), overflow: 'hidden'}}>
          {device.deviceicon ? (
            <AppImage
              src={device.deviceicon}
              fallbackIcon="sparkles-outline"
              fallbackIconSize={18}
              style={{width: 26, height: 26}}
              resizeMode="contain"
            />
          ) : (
            <Text style={{fontSize: 18}}>📍</Text>
          )}
        </View>
        <View className="ml-3" style={{flex: 1, minWidth: 0}}>
          <Text numberOfLines={1} className="text-sm font-medium text-content">
            {device.friendlyname ?? 'Scene'}
          </Text>
          {device.isOffline ? (
            <View className="mt-0.5 flex-row items-center">
              <Icon name="wifi-outline" size={12} color={theme.colors.danger} />
              <Text className="ml-1 text-[10px] text-danger">Offline</Text>
            </View>
          ) : null}
        </View>
      </View>
        <Toggle value={device.isOn} onValueChange={() => onToggle(device)} interactive={false} />
      </Card>
    </Pressable>
  );
}

/* ── Quick-call chip: API icon via AppImage, emoji fallback (reference) ── */
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
      style={{
        borderWidth: 2,
        borderColor: focused ? theme.colors.focusRing : theme.colors.border,
        transform: [{scale: focused ? 1.05 : 1}],
      }}>
      <View
        className="mb-2 h-12 w-12 items-center justify-center rounded-xl bg-surface-elevated"
        style={{overflow: 'hidden'}}>
        {item.icon ? (
          <AppImage
            src={item.icon}
            fallbackIcon="call-outline"
            fallbackIconSize={20}
            style={{width: '100%', height: '100%'}}
            resizeMode="contain"
          />
        ) : (
          <Text style={{fontSize: 26}}>{callEmoji(item.name)}</Text>
        )}
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

/* ── Quick-action tile (reference QuickActions ActionCard) ── */
function QuickActionTile({
  icon,
  accent,
  title,
  sub,
  onPress,
  right,
  width,
  hasTVPreferredFocus = false,
}: {
  icon: WebIconName;
  accent?: string;
  title: string;
  sub?: string;
  onPress: () => void;
  right?: React.ReactNode;
  width: DimensionValue;
  hasTVPreferredFocus?: boolean;
}) {
  const {theme} = useTheme();
  const {focused, onFocus, onBlur} = useTVFocus();
  const accentColor = accent ?? theme.colors.primary;
  return (
    <Pressable
      onPress={onPress}
      onFocus={onFocus}
      onBlur={onBlur}
      focusable
      hasTVPreferredFocus={hasTVPreferredFocus}
      accessibilityRole="button"
      accessibilityLabel={title}
      className="mb-3 rounded-2xl bg-surface"
      style={{
        width,
        minHeight: 140,
        borderWidth: 2,
        borderColor: focused ? theme.colors.focusRing : theme.colors.border,
        transform: [{scale: focused ? 1.05 : 1}],
        overflow: 'hidden',
        padding: 16,
        justifyContent: 'space-between',
      }}>
      <View className="flex-row items-start justify-between">
        <WebIcon name={icon} size={24} color={accentColor} />
        {/* top-right circular ↗ (reference ArrowButton) */}
        <View
          style={{
            width: 28,
            height: 28,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: theme.colors.border,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <WebIcon name="arrow" size={12} color={theme.colors.text} />
        </View>
      </View>
      <View style={{marginTop: 'auto', paddingTop: 12}}>
        <Text className="text-sm font-bold text-content">{title}</Text>
        {sub ? <Text className="mt-1 text-[10px] text-content-tertiary">{sub}</Text> : null}
        {right}
      </View>
      {/* bottom accent bar (reference gradient strip) */}
      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: 3,
          backgroundColor: accentColor,
        }}
      />
    </Pressable>
  );
}

export function DashboardScreen({navigation}: Props) {
  const {theme} = useTheme();
  const accents = useWebIconAccents();
  const {select} = useResponsive();
  const dash = useDashboardViewModel();
  const room = useRoomControl();
  // 2 columns on phone, 3 on tablet/TV.
  const tileWidth = select<DimensionValue>({phone: '48%', tablet: '31%', tv: '31%'});

  const subtitle = [dash.roomNumber != null ? `Room ${dash.roomNumber}` : null, dash.hotel?.name]
    .filter(Boolean)
    .join(' · ');

  const toggleScene = (device: RoomDevice) => {
    room
      .toggleDevice(device)
      .catch(error =>
        toast.error(getApiErrorMessage(error, 'Could not update the scene. Please try again.')),
      );
  };

  // Cross-TAB navigation — outside HomeStackParamList, so cast once here.
  const rootNavigate = (name: string, params?: object) =>
    (navigation as unknown as {navigate: (name: string, params?: object) => void}).navigate(
      name,
      params,
    );
  const openFood = (foodCategoryId?: string) =>
    rootNavigate('FoodTab', {screen: 'Food', params: foodCategoryId ? {foodCategoryId} : undefined});

  const refreshAll = () => {
    dash.refetch();
    room.refetch();
  };

  return (
    <SafeAreaView style={{flex: 1, backgroundColor: theme.colors.background}} edges={['top']}>
      <ScrollView
        contentContainerStyle={{paddingBottom: 32}}
        // No pull gesture exists on a remote — TV refreshes from the header
        // button instead.
        refreshControl={
          IS_TV ? undefined : (
            <RefreshControl
              refreshing={dash.isRefetching}
              onRefresh={refreshAll}
              tintColor={theme.colors.primary}
              colors={[theme.colors.primary]}
            />
          )
        }>
        <DashboardHeader
          name={getDisplayName(dash.user)}
          subtitle={subtitle}
          loading={dash.isLoading}
          error={dash.profileError}
          onFeedback={() => navigation.navigate('Feedback')}
          onProfile={() => navigation.navigate('Profile')}
          onSettings={() => navigation.navigate('Settings')}
          onRefresh={refreshAll}
          refreshing={dash.isRefetching}
        />

        <View className="mt-6 px-5">
          <DoorControlCard />
        </View>

        {/* Room scenes — heading + spinner while loading (reference) */}
        {room.isLoading ? (
          <View className="mt-6 px-5">
            <Text className="mb-3 text-lg font-bold text-content">
              Room <Text className="text-primary">Scenes</Text>
            </Text>
            <View className="items-center py-4">
              <ActivityIndicator color={theme.colors.primary} />
            </View>
          </View>
        ) : room.hasScenes ? (
          <View className="mt-6 px-5">
            <Text className="mb-3 text-lg font-bold text-content">
              Room <Text className="text-primary">Scenes</Text>
            </Text>
            {room.scenes.map(s => (
              <SceneRow key={s._id} device={s} onToggle={toggleScene} />
            ))}
          </View>
        ) : null}

        {/* Quick calls — hidden on webOS at the client's request. Its actions are
            a `tel:` dial and a food deep link, and dialling is meaningless on a TV. */}
        {!IS_WEB_BUILD && dash.quickCalls.length > 0 ? (
          <View className="mt-4">
            <Text className="mb-3 px-5 text-lg font-bold text-content">
              Quick <Text className="text-primary">Calls</Text>
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{paddingHorizontal: 20}}>
              {dash.quickCalls.map(c => (
                <QuickCallCard
                  key={c._id}
                  item={c}
                  onPress={() => dash.onQuickCallPress(c, openFood)}
                />
              ))}
            </ScrollView>
          </View>
        ) : null}

        {/* Quick actions — reference tile set/order (+ Climate/AC, mobile-only) */}
        <View className="mt-6 px-5">
          <Text className="mb-3 text-lg font-bold text-content">
            Quick <Text className="text-primary">Actions</Text>
          </Text>
          <View className="flex-row flex-wrap justify-between">
            <QuickActionTile
              icon="bell"
              accent={accents.bell}
              title="Service Request"
              sub="From 8:00 am - 11: pm"
              width={tileWidth}
              onPress={() => rootNavigate('ServicesTab')}
            />
            <QuickActionTile
              icon="bulb"
              accent={accents.bulb}
              title="Lights Control"
              width={tileWidth}
              hasTVPreferredFocus
              onPress={() => navigation.navigate('Lights')}
              right={
                <View className="mt-2 flex-row items-center" style={{gap: 8}}>
                  <Toggle
                    size="sm"
                    value={room.masterOn}
                    onValueChange={() =>
                      room
                        .toggleMaster()
                        .catch(error =>
                          toast.error(
                            getApiErrorMessage(error, 'Could not toggle the master scene.'),
                          ),
                        )
                    }
                    accessibilityLabel="Master scene"
                  />
                  <Text className="text-[10px] text-content-tertiary">Master Scene</Text>
                </View>
              }
            />
            <QuickActionTile
              icon="facilities"
              accent={accents.facilities}
              title="Facilities"
              width={tileWidth}
              onPress={() => rootNavigate('FacilitiesTab')}
            />
            <QuickActionTile
              icon="food"
              accent={accents.food}
              title="Food Order"
              width={tileWidth}
              onPress={() => openFood()}
            />
            <QuickActionTile
              icon="laundry"
              accent={accents.laundry}
              title="Laundry"
              sub="Billed to your room"
              width={tileWidth}
              onPress={() => navigation.navigate('Laundry')}
            />
            {/* Mobile-only: the web app reaches /ac by URL, TVs cannot. */}
            <QuickActionTile
              icon="snow"
              accent={accents.snow}
              title="Climate / AC"
              width={tileWidth}
              onPress={() => navigation.navigate('Ac')}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
