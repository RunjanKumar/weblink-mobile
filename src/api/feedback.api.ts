import {apiClient} from './axios';
import {ENDPOINTS} from './endpoints';
import type {ApiResponse} from '../models/api.model';

export interface FeedbackPayload {
  star: number;
  notes: string;
}

export const feedbackApi = {
  /** POST /v1/feedback — submit a stay rating + notes. */
  async submit(payload: FeedbackPayload): Promise<ApiResponse<unknown>> {
    const {data} = await apiClient.post<ApiResponse<unknown>>(ENDPOINTS.FEEDBACK, payload);
    return data;
  },
};
