import type {DeviceAction} from '../constants/roomControl';

/** Raw room device as returned by GET /api/rooms/devices (data[]). */
export interface RoomDeviceRaw {
  _id: string;
  channelid?: string;
  type?: string;
  /** JSON string, e.g. '{"state":"ON","level":60}'. */
  status?: string;
  isSceneButton?: boolean;
  isMasterScene?: boolean;
  onlinestate?: number; // 0 = offline
  friendlyname?: string;
  deviceicon?: string;
}

/** Device with its `status` JSON parsed into convenient fields. */
export interface RoomDevice extends RoomDeviceRaw {
  isOn: boolean;
  level: number;
  isOffline: boolean;
}

export interface ExecDevicePayload {
  channelid?: string;
  action: DeviceAction;
  level?: number;
}

export interface QuickCall {
  _id: string;
  name?: string;
  description?: string;
  icon?: string;
  redirectTypes?: number;
  supportNumber?: string;
  foodCategoryId?: string;
}

export function parseDevice(raw: RoomDeviceRaw): RoomDevice {
  let isOn = false;
  let level = 0;
  try {
    const parsed = raw.status ? (JSON.parse(raw.status) as {state?: string; level?: number}) : null;
    isOn = parsed?.state === 'ON';
    level = typeof parsed?.level === 'number' ? parsed.level : 0;
  } catch {
    // Malformed status — treat as off with no level.
  }
  return {...raw, isOn, level, isOffline: raw.onlinestate === 0};
}

export function parseDevices(raw: RoomDeviceRaw[]): RoomDevice[] {
  return raw.map(parseDevice);
}
