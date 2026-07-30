import {useCallback, useEffect, useRef} from 'react';
import {useQuery, useQueryClient} from '@tanstack/react-query';
import {roomRepository} from '../repositories/room.repository';
import {DEVICE_ACTION, DEVICE_TYPE, isCurtainChannel} from '../constants/roomControl';
import {getApiErrorMessage} from '../utils/errorHandler';
import type {ExecDevicePayload, RoomDevice} from '../models/device.model';

const DEVICES_KEY = ['room', 'devices'] as const;
const FAN_DEBOUNCE_MS = 400;

/**
 * Shared room-automation ViewModel used by both the Dashboard (scenes) and the
 * Lights screen. One React Query fetch backs both; toggles are optimistic against
 * the query cache with rollback, and fan-speed changes are debounced (mirroring
 * the web light viewModel) so dragging doesn't spam the ESP32.
 */
export function useRoomControl() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: DEVICES_KEY as unknown as string[],
    queryFn: () => roomRepository.getDevices(),
  });

  const devices = query.data ?? [];
  // Curtain motor lines come back as ordinary switch channels. They are pulled
  // out of BOTH lists: as a "light" a guest could energise open and close at the
  // same time (a stalled motor), and as a "scene" they would appear twice.
  const curtains = devices.filter(d => isCurtainChannel(d.friendlyname));
  const isCurtain = (d: RoomDevice) => isCurtainChannel(d.friendlyname);
  const lights = devices.filter(d => !d.isSceneButton && !isCurtain(d));
  const scenes = devices.filter(d => d.isSceneButton && !isCurtain(d));
  const master = devices.find(d => d.isMasterScene) ?? null;

  const fanTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  useEffect(() => {
    const timers = fanTimers.current;
    return () => {
      Object.values(timers).forEach(clearTimeout);
    };
  }, []);

  const patchDevice = useCallback(
    (id: string, patch: Partial<RoomDevice>) => {
      queryClient.setQueryData<RoomDevice[]>(DEVICES_KEY as unknown as string[], prev =>
        prev ? prev.map(d => (d._id === id ? {...d, ...patch} : d)) : prev,
      );
    },
    [queryClient],
  );

  const patchAllLights = useCallback(
    (isOn: boolean) => {
      queryClient.setQueryData<RoomDevice[]>(DEVICES_KEY as unknown as string[], prev =>
        prev
          ? prev.map(d =>
              // Curtains are skipped: "all lights off" must not paint the curtain
              // card as though both motor lines had been driven.
              d.isSceneButton || isCurtainChannel(d.friendlyname) ? d : {...d, isOn},
            )
          : prev,
      );
    },
    [queryClient],
  );

  /**
   * Drive a channel to an EXPLICIT state, rather than flipping it.
   *
   * Curtains need this and a toggle cannot serve: "open" is a direction, not the
   * opposite of whatever the cache last saw, and STOP has to be able to fire OFF
   * at a line the cache already believes is off (the cache can be a poll behind
   * a motor that is still travelling). So the call always goes out.
   */
  const setDevice = useCallback(
    async (device: RoomDevice, isOn: boolean) => {
      const previous = device.isOn;
      patchDevice(device._id, {isOn});
      try {
        await roomRepository.exec({
          channelid: device.channelid,
          action: isOn ? DEVICE_ACTION.ON : DEVICE_ACTION.OFF,
        });
      } catch (error) {
        patchDevice(device._id, {isOn: previous});
        throw error;
      }
    },
    [patchDevice],
  );

  /** Toggle a single device/scene. Optimistic; rolls back and rethrows on failure. */
  const toggleDevice = useCallback(
    async (device: RoomDevice) => {
      const next = !device.isOn;
      patchDevice(device._id, {isOn: next});
      const payload: ExecDevicePayload = {
        channelid: device.channelid,
        action: next ? DEVICE_ACTION.ON : DEVICE_ACTION.OFF,
      };
      if (device.type === DEVICE_TYPE.FAN) {
        payload.level = device.level ?? 0;
      }
      try {
        await roomRepository.exec(payload);
      } catch (error) {
        patchDevice(device._id, {isOn: device.isOn});
        throw error;
      }
    },
    [patchDevice],
  );

  /** One API call turns every channel on/off via the master-scene device. */
  const toggleMaster = useCallback(async () => {
    if (!master) {
      return;
    }
    const next = !master.isOn;
    // Snapshot the exact prior state so rollback restores each light individually
    // (a light may have been on/off independently of the master).
    const snapshot = queryClient.getQueryData<RoomDevice[]>(DEVICES_KEY as unknown as string[]);
    patchDevice(master._id, {isOn: next});
    patchAllLights(next);
    try {
      await roomRepository.exec({
        channelid: master.channelid,
        action: next ? DEVICE_ACTION.ON : DEVICE_ACTION.OFF,
      });
    } catch (error) {
      if (snapshot) {
        queryClient.setQueryData<RoomDevice[]>(DEVICES_KEY as unknown as string[], snapshot);
      }
      throw error;
    }
  }, [master, patchDevice, patchAllLights, queryClient]);

  /** Debounced fan speed — UI updates immediately, API fires after the drag settles. */
  const setFanLevel = useCallback(
    (device: RoomDevice, level: number) => {
      const prevLevel = device.level ?? 0;
      const prevIsOn = device.isOn;
      patchDevice(device._id, {level, isOn: level > 0});

      const existing = fanTimers.current[device._id];
      if (existing) {
        clearTimeout(existing);
      }
      fanTimers.current[device._id] = setTimeout(async () => {
        try {
          await roomRepository.exec({
            channelid: device.channelid,
            action: DEVICE_ACTION.ON,
            level,
          });
        } catch {
          patchDevice(device._id, {level: prevLevel, isOn: prevIsOn});
        }
      }, FAN_DEBOUNCE_MS);
    },
    [patchDevice],
  );

  return {
    devices,
    lights,
    scenes,
    curtains,
    master,
    masterOn: master?.isOn ?? false,
    hasScenes: scenes.length > 0,
    isLoading: query.isLoading,
    isRefetching: query.isRefetching,
    error: query.isError ? getApiErrorMessage(query.error) : null,
    refetch: query.refetch,
    toggleDevice,
    setDevice,
    toggleMaster,
    setFanLevel,
  };
}
