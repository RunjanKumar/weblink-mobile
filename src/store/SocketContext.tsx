import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
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
 */
export function SocketProvider({children}: {children: React.ReactNode}) {
  const {isAuthenticated, session} = useAuth();
  const token = session?.token ?? null;

  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [isOnline, setIsOnline] = useState(true);
  const onlineRef = useRef(true);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      const online = Boolean(state.isConnected);
      onlineRef.current = online;
      setIsOnline(online);
      if (!online) {
        setConnectionStatus('offline');
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !token) {
      socketService.disconnect();
      setConnectionStatus('disconnected');
      return;
    }

    const sock = socketService.connect(token);
    const onConnect = () => setConnectionStatus('connected');
    const onDisconnect = () =>
      setConnectionStatus(onlineRef.current ? 'disconnected' : 'offline');
    const onReconnectAttempt = () => setConnectionStatus('reconnecting');

    sock.on('connect', onConnect);
    sock.on('disconnect', onDisconnect);
    sock.io.on('reconnect_attempt', onReconnectAttempt);
    if (sock.connected) {
      setConnectionStatus('connected');
    }

    return () => {
      sock.off('connect', onConnect);
      sock.off('disconnect', onDisconnect);
      sock.io.off('reconnect_attempt', onReconnectAttempt);
    };
  }, [isAuthenticated, token]);

  const value = useMemo<SocketValue>(
    () => ({
      connectionStatus,
      isOnline,
      isConnected: connectionStatus === 'connected',
      socketService,
    }),
    [connectionStatus, isOnline],
  );

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

export function useSocket(): SocketValue {
  const ctx = useContext(SocketContext);
  if (!ctx) {
    throw new Error('useSocket must be used within a <SocketProvider>');
  }
  return ctx;
}
