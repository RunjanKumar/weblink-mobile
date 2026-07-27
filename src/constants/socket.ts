// Socket.IO event + enum registry (mirrors web utils/socketEvents.js).

export const CLIENT_EVENTS = {
  SEND_MESSAGE: 'sendMessage',
  READ_MESSAGE: 'readMessage',
  TYPING: 'typing',
} as const;

export const SERVER_EVENTS = {
  NEW_MESSAGE: 'newMessage',
  READ_MESSAGE: 'readMessage',
  USER_TYPING: 'typing',
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  CONNECT_ERROR: 'connect_error',
  RECONNECT: 'reconnect',
  RECONNECT_ATTEMPT: 'reconnect_attempt',
  RECONNECT_FAILED: 'reconnect_failed',
} as const;

export const MESSAGE_STATUS = {SENT: 1, DELIVERED: 2, SEEN: 3} as const;
export const MESSAGE_TYPES = {TEXT: 1, IMAGE: 2, DOCUMENT: 3} as const;
export const USER_TYPES = {ADMIN: 1, STAFF: 2, CUSTOMER: 3} as const;

export const SOCKET_CONFIG = {
  RECONNECTION_ATTEMPTS: 10,
  RECONNECTION_DELAY: 1000,
  RECONNECTION_DELAY_MAX: 10000,
  TIMEOUT: 20000,
} as const;

export type ConnectionStatus = 'connected' | 'disconnected' | 'reconnecting' | 'offline';
