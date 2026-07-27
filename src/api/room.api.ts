import {apiClient} from './axios';
import {ENDPOINTS} from './endpoints';
import type {ApiResponse} from '../models/api.model';
import type {ExecDevicePayload, QuickCall, RoomDeviceRaw} from '../models/device.model';

/** Room automation + quick-call API (guest token required). */
export const roomApi = {
  /** GET /api/rooms/devices — all room devices (lights, fans, scene buttons). */
  async getDevices(): Promise<ApiResponse<RoomDeviceRaw[]>> {
    const {data} = await apiClient.get<ApiResponse<RoomDeviceRaw[]>>(ENDPOINTS.ROOM_DEVICES);
    return data;
  },

  /** POST /api/rooms/device/exec — turn a device/scene on/off (optionally with a level). */
  async execDevice(payload: ExecDevicePayload): Promise<ApiResponse<unknown>> {
    const {data} = await apiClient.post<ApiResponse<unknown>>(ENDPOINTS.DEVICE_EXEC, payload);
    return data;
  },

  /** GET /v1/quickCall — quick-call shortcuts (reception, room service, etc.). */
  async getQuickCalls(): Promise<ApiResponse<QuickCall[]>> {
    const {data} = await apiClient.get<ApiResponse<QuickCall[]>>(ENDPOINTS.QUICK_CALL);
    return data;
  },
};
