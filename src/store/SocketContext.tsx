import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import NetInfo from '@react-native-community/netinfo';
import {socketService} from '../services/socketService';
import type {ConnectionStatus} from '../constants/socket';
import {useAuth} from './AuthContext';

interface SocketValue {
  connectionStatus: ConnectionStatus;
  isOnline: boolean;
  isConnected: boolean;
  socketService: typeof socketService;
}

const SocketContext = createContext<SocketValue | undefined>(undefined);

/**
 * Owns the socket lifecycle: connects when authenticated, disconnects on logout,
 * and derives a connection status from socket + NetInfo events (replacing the
 * web's navigator.onLine / window online-offline listeners).
 *
 * THE SOCKET IS THE AUTHORITY, not NetInfo. On webOS NetInfo has no real signal
 * to work with — its web module explicitly opts out of the browser connection
 * API for webOS and falls back to `navigator.onLine`, which a packaged file://
 * app reports unreliably. Letting that flip the status to 'offline' used to
 * unregister ChatViewModel's `newMessage` listener, so admin replies silently
 * stopped arriving while sending still worked (emit checks the real socket, not
 * this status). NetInfo now only informs `isOnline`, which is presentation.
 */
export function SocketProvider({children}: {children: React.ReactNode}) {
  const {isAuthenticated, session} = useAuth();
  const token = session?.token ?? null;

  // Reported by the socket itself — the only thing that knows if realtime works.
  const [socketStatus, setSocketStatus] = useState<ConnectionStatus>('disconnected');
  const [networkOnline, setNetworkOnline] = useState(true);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setNetworkOnline(Boolean(state.isConnected));
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !token) {
      socketService.disconnect();
      setSocketStatus('disconnected');
      return;
    }

    const sock = socketService.connect(token);
    const onConnect = () => setSocketStatus('connected');
    const onDisconnect = () => setSocketStatus('disconnected');
    const onConnectError = () => setSocketStatus('disconnected');
    const onReconnectAttempt = () => setSocketStatus('reconnecting');
    const onReconnect = () => setSocketStatus('connected');
    const onReconnectFailed = () => setSocketStatus('disconnected');

    sock.on('connect', onConnect);
    sock.on('disconnect', onDisconnect);
    sock.on('connect_error', onConnectError);
    sock.io.on('reconnect_attempt', onReconnectAttempt);
    sock.io.on('reconnect', onReconnect);
    sock.io.on('reconnect_failed', onReconnectFailed);
    if (sock.connected) {
      setSocketStatus('connected');
    }

    return () => {
      sock.off('connect', onConnect);
      sock.off('disconnect', onDisconnect);
      sock.off('connect_error', onConnectError);
      sock.io.off('reconnect_attempt', onReconnectAttempt);
      sock.io.off('reconnect', onReconnect);
      sock.io.off('reconnect_failed', onReconnectFailed);
    };
  }, [isAuthenticated, token]);

  const value = useMemo<SocketValue>(() => {
    const isConnected = socketStatus === 'connected';
    // A live socket proves we are online, whatever the platform claims.
    const isOnline = networkOnline || isConnected;
    const connectionStatus: ConnectionStatus = isConnected
      ? 'connected'
      : isOnline
        ? socketStatus
        : 'offline';
    return {connectionStatus, isOnline, isConnected, socketService};
  }, [socketStatus, networkOnline]);

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

export function useSocket(): SocketValue {
  const ctx = useContext(SocketContext);
  if (!ctx) {
    throw new Error('useSocket must be used within a <SocketProvider>');
  }
  return ctx;
}
