import {chatApi} from '../api/chat.api';
import type {RawChatMessage} from '../models/chat.model';

export const chatRepository = {
  async getMessages(
    skip: number,
    limit: number,
  ): Promise<{messages: RawChatMessage[]; totalCount: number}> {
    const res = await chatApi.getMessages({skip, limit});
    const inner = res.data;
    return {messages: inner?.data ?? [], totalCount: inner?.totalCount ?? 0};
  },
};
