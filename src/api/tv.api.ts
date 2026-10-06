import axios, {type AxiosInstance} from 'axios';
import {config} from '../constants/config';
import {ENDPOINTS} from './endpoints';
import type {ApiResponse} from '../models/api.model';
import type {TvPairingStart, TvPairingStatus, TvState} from '../models/tv.model';

/**
 * In-room TV API. Its own axios instance on purpose: these calls authenticate
 * with the TV's device token (`x-tv-token`), not a guest token, so the shared
 * client's interceptors must not touch them — a 401 here means "TV unpaired",
 * not "guest signed out".
 */
const tvClient: AxiosInstance = axios.create({
  baseURL: config.apiBaseUrl,
  timeout: config.apiTimeout,
  headers: {'Content-Type': 'application/json'},
});

export const tvApi = {
  /** POST /v1/tv/pair/start — a fresh 6-digit code for this TV to display. */
  async startPairing(body: {
    duid?: string;
    model?: string;
    appVersion?: string;
  }): Promise<ApiResponse<TvPairingStart>> {
    const {data} = await tvClient.post<ApiResponse<TvPairingStart>>(ENDPOINTS.TV_PAIR_START, body);
    return data;
  },

  /** GET /v1/tv/pair/status — PENDING until staff pair it, then the device token (once). */
  async pairingStatus(pairingId: string, secret: string): Promise<ApiResponse<TvPairingStatus>> {
    const {data} = await tvClient.get<ApiResponse<TvPairingStatus>>(ENDPOINTS.TV_PAIR_STATUS, {
      params: {pairingId, secret},
    });
    return data;
  },

  /** GET /v1/tv/state — empty room, or the checked-in guest's session token. */
  async getState(deviceToken: string, appVersion?: string): Promise<ApiResponse<TvState>> {
    const {data} = await tvClient.get<ApiResponse<TvState>>(ENDPOINTS.TV_STATE, {
      headers: {'x-tv-token': deviceToken},
      params: appVersion ? {appVersion} : undefined,
    });
    return data;
  },
};
