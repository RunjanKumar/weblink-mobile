import {io, type Socket} from 'socket.io-client';
import {config} from '../constants/config';
import {SOCKET_CONFIG} from '../constants/socket';

/**
 * Singleton Socket.IO transport (ported from the web app). Zero business logic —
 * just one connection for the whole app, with the JWT attached on the handshake
 * query (the backend reads `authorization` from the query, not a header).
 * socket.io-client works in React Native unchanged.
 */
let socket: Socket | null = null;

export const socketService = {
  connect(token: string): Socket {
    if (socket?.connected) {
      return socket;
    }
    if (socket) {
      socket.removeAllListeners();
      socket.disconnect();
      socket = null;
    }
    socket = io(config.socketUrl, {
      query: {authorization: token},
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: SOCKET_CONFIG.RECONNECTION_ATTEMPTS,
      reconnectionDelay: SOCKET_CONFIG.RECONNECTION_DELAY,
      reconnectionDelayMax: SOCKET_CONFIG.RECONNECTION_DELAY_MAX,
      timeout: SOCKET_CONFIG.TIMEOUT,
      autoConnect: true,
    });
    return socket;
  },

  disconnect(): void {
    if (socket) {
      socket.removeAllListeners();
      socket.disconnect();
      socket = null;
    }
  },

  emit(event: string, data?: unknown, ack?: (...args: unknown[]) => void): void {
    if (!socket?.connected) {
      return;
    }
    if (ack) {
      socket.emit(event, data, ack);
    } else {
      socket.emit(event, data);
    }
  },

  on(event: string, handler: (...args: any[]) => void): void {
    socket?.on(event, handler);
  },

  off(event: string, handler?: (...args: any[]) => void): void {
    if (!socket) {
      return;
    }
    if (handler) {
      socket.off(event, handler);
    } else {
      socket.off(event);
    }
  },

  getSocket(): Socket | null {
    return socket;
  },

  isConnected(): boolean {
    return socket?.connected ?? false;
  },
};
