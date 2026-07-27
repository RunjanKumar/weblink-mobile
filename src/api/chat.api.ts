import {apiClient} from './axios';
import {ENDPOINTS} from './endpoints';
import type {ApiResponse} from '../models/api.model';
import type {RawChatMessage} from '../models/chat.model';

export const chatApi = {
  /** GET /conversation/list?skip&limit — history (data.data + data.totalCount). */
  async getMessages(params: {
    skip: number;
    limit: number;
  }): Promise<ApiResponse<{data: RawChatMessage[]; totalCount: number}>> {
    const {data} = await apiClient.get<ApiResponse<{data: RawChatMessage[]; totalCount: number}>>(
      ENDPOINTS.CONVERSATION_LIST,
      {params},
    );
    return data;
  },
};
