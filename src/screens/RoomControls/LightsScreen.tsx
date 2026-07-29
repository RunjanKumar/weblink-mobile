import React from 'react';
import {Pressable, ScrollView, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Card, ErrorState, Header, Loader, Stepper, Toggle, toast} from '../../components';
import {useRoomControl} from '../../viewmodels';
import {useTVFocus} from '../../hooks/useTVFocus';
import {useTheme} from '../../theme';
import {DEVICE_TYPE, FAN_LEVEL} from '../../constants/roomControl';
import type {RoomDevice} from '../../models/device.model';
import type {HomeStackParamList} from '../../navigation/types';

type Props = NativeStackScreenProps<HomeStackParamList, 'Lights'>;

function DeviceCard({
  device,
  onToggle,
  onFanLevel,
}: {
  device: RoomDevice;
  onToggle: (d: RoomDevice) => void;
  onFanLevel: (d: RoomDevice, level: number) => void;
}) {
  const {theme} = useTheme();
  const {focused, onFocus, onBlur} = useTVFocus();
  const isFan = device.type === DEVICE_TYPE.FAN;
  return (
    // The whole tile is the power control — a D-pad should not have to land on
    // the small switch. Fan speed keeps its own Stepper below.
    <Pressable
      onPress={() => onToggle(device)}
      onFocus={onFocus}
      onBlur={onBlur}
      focusable
      accessibilityRole="switch"
      accessibilityState={{checked: device.isOn}}
      accessibilityLabel={`Toggle ${device.friendlyname ?? 'device'}`}
      className="mb-4 w-[48%] rounded-2xl bg-surface-elevated p-4"
      style={{
        // Always 2px so focus does not resize the tile.
        borderWidth: 2,
        borderColor: focused
          ? theme.colors.focusRing
          : device.isOn
            ? theme.colors.primary
            : theme.colors.border,
      }}>
      {device.isOffline ? (
        <View className="mb-1 flex-row items-center self-end">
          <Icon name="wifi-outline" size={12} color={theme.colors.danger} />
          <Text className="ml-1 text-[10px] text-danger">Offline</Text>
        </View>
      ) : null}

      <View className="items-center py-4">
        <Icon
          name={isFan ? 'aperture-outline' : device.isOn ? 'bulb' : 'bulb-outline'}
          size={56}
          color={device.isOn ? theme.colors.primary : theme.colors.muted}
        />
      </View>

      <Text className="text-sm font-bold text-content" numberOfLines={1}>
        {device.friendlyname ?? 'Device'}
      </Text>
      <View className="mt-1.5 flex-row items-center justify-between">
        <Text className="text-xs text-content-tertiary">{device.isOn ? 'Power on' : 'Power off'}</Text>
        <Toggle
          size="sm"
          value={device.isOn}
          onValueChange={() => onToggle(device)}
          interactive={false}
        />
      </View>

      {isFan ? (
        <View className="mt-3 border-t border-border pt-3">
          <View className="mb-2 flex-row items-center justify-between">
            <Text className="text-xs text-content-tertiary">Speed</Text>
            <Text className="text-xs font-semibold text-primary">{device.level}%</Text>
          </View>
          <Stepper
            value={device.level}
            min={FAN_LEVEL.MIN}
            max={FAN_LEVEL.MAX}
            step={FAN_LEVEL.STEP}
            format={v => `${v}%`}
            onChange={level => onFanLevel(device, level)}
            accessibilityLabel="Fan speed"
          />
        </View>
      ) : null}
    </Pressable>
  );
}

export function LightsScreen({navigation}: Props) {
  const {theme} = useTheme();
  const {
    focused: masterFocused,
    onFocus: onMasterFocus,
    onBlur: onMasterBlur,
  } = useTVFocus();
  const room = useRoomControl();

  const onToggle = (device: RoomDevice) =>
    room.toggleDevice(device).catch(() => toast.error('Could not update the device.'));
  const onMaster = () =>
    room.toggleMaster().catch(() => toast.error('Could not toggle the master scene.'));

  return (
    <SafeAreaView style={{flex: 1, backgroundColor: theme.colors.background}} edges={['top']}>
      <Header title="Lights Control" onBack={() => navigation.goBack()} />

      {room.isLoading ? (
        <Loader label="Loading devices…" />
      ) : room.error ? (
        <ErrorState message={room.error} onRetry={room.refetch} />
      ) : (
        <ScrollView contentContainerStyle={{paddingHorizontal: 20, paddingBottom: 32}}>
          {room.master ? (
            // Whole card toggles the master scene; the power button is now just
            // the indicator.
            <Pressable
              onPress={onMaster}
              onFocus={onMasterFocus}
              onBlur={onMasterBlur}
              focusable
              accessibilityRole="switch"
              accessibilityState={{checked: room.masterOn}}
              accessibilityLabel="Master scene">
              <Card
                className="mb-4 flex-row items-center justify-between"
                style={{
                  borderWidth: 2,
                  borderColor: masterFocused ? theme.colors.focusRing : theme.colors.border,
                }}>
                <View className="flex-1 pr-3">
                  <Text className="text-sm font-semibold text-content">Master Scene</Text>
                  <Text className="mt-0.5 text-xs text-content-tertiary">
                    Turn on Master Scene, to turn on all the lights.
                  </Text>
                </View>
                {/* Reference: round power button, amber when on. */}
                <View
                  className="h-11 w-11 items-center justify-center rounded-full"
                  pointerEvents="none"
                  style={{
                    backgroundColor: room.masterOn ? theme.colors.primary : theme.colors.muted,
                  }}>
                  <Icon
                    name="power"
                    size={18}
                    color={room.masterOn ? theme.colors.primaryForeground : '#ffffff'}
                  />
                </View>
              </Card>
            </Pressable>
          ) : null}

          {room.lights.length === 0 ? (
            <Text className="mt-10 text-center text-sm text-content-tertiary">
              No controllable devices found for this room.
            </Text>
          ) : (
            <View className="flex-row flex-wrap justify-between">
              {room.lights.map(d => (
                <DeviceCard key={d._id} device={d} onToggle={onToggle} onFanLevel={room.setFanLevel} />
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
