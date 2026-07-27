import React from 'react';
import {Alert, ScrollView, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Card, ErrorState, Header, Loader, Stepper, Toggle} from '../../components';
import {useRoomControl} from '../../viewmodels';
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
  const isFan = device.type === DEVICE_TYPE.FAN;
  return (
    <View
      className="mb-4 w-[48%] rounded-2xl bg-surface-elevated p-4"
      style={{
        borderWidth: device.isOn ? 2 : 1,
        borderColor: device.isOn ? theme.colors.primary : theme.colors.border,
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
          accessibilityLabel={`Toggle ${device.friendlyname ?? 'device'}`}
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
    </View>
  );
}

export function LightsScreen({navigation}: Props) {
  const {theme} = useTheme();
  const room = useRoomControl();

  const onToggle = (device: RoomDevice) =>
    room.toggleDevice(device).catch(() => Alert.alert('Error', 'Could not update the device.'));
  const onMaster = () =>
    room.toggleMaster().catch(() => Alert.alert('Error', 'Could not toggle the master scene.'));

  return (
    <SafeAreaView style={{flex: 1, backgroundColor: theme.colors.background}} edges={['top']}>
      <Header title="Lights & Fans" onBack={() => navigation.goBack()} />

      {room.isLoading ? (
        <Loader label="Loading devices…" />
      ) : room.error ? (
        <ErrorState message={room.error} onRetry={room.refetch} />
      ) : (
        <ScrollView contentContainerStyle={{paddingHorizontal: 20, paddingBottom: 32}}>
          {room.master ? (
            <Card className="mb-4 flex-row items-center justify-between">
              <View className="flex-row items-center">
                <Icon name="color-wand" size={22} color={theme.colors.primary} />
                <Text className="ml-3 text-base font-semibold text-content">Master Scene</Text>
              </View>
              <Toggle value={room.masterOn} onValueChange={onMaster} accessibilityLabel="Master scene" />
            </Card>
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
