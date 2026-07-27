export interface RawChatMessage {
  _id?: string;
  id?: string;
  message?: string;
  text?: string;
  senderId?: string | {_id?: string};
  senderData?: {name?: string; userType?: number};
  senderName?: string;
  senderType?: number;
  receivedBy?: {userId?: string; status?: number}[];
  status?: number;
  createdAt?: string;
  timestamp?: string;
  tempId?: string | null;
  messageType?: number;
}

/** Normalized, view-ready message. */
export interface ChatMessage {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  senderType: number;
  isOwn: boolean;
  timestamp: string;
  messageStatus: number;
  tempId: string | null;
  isSending: boolean;
  isFailed: boolean;
}
