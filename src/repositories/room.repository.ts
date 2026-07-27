import {roomApi} from '../api/room.api';
import {
  parseDevices,
  type ExecDevicePayload,
  type QuickCall,
  type RoomDevice,
} from '../models/device.model';

export const roomRepository = {
  /** Fetch + parse all room devices. */
  async getDevices(): Promise<RoomDevice[]> {
    const res = await roomApi.getDevices();
    return parseDevices(res.data ?? []);
  },

  /** Execute a device command (fire-and-return; throws on network/API error). */
  async exec(payload: ExecDevicePayload): Promise<void> {
    await roomApi.execDevice(payload);
  },

  async getQuickCalls(): Promise<QuickCall[]> {
    const res = await roomApi.getQuickCalls();
    return res.data ?? [];
  },
};
