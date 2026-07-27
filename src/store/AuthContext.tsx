import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {authRepository} from '../repositories/auth.repository';
import {authEvents} from '../services/authEvents';
import {logger} from '../services/logger';
import type {AuthStatus, LoginRequest, Session} from '../models/auth.model';
import type {CustomerUser, Hotel} from '../models/user.model';

interface AuthContextValue {
  status: AuthStatus;
  session: Session | null;
  user: CustomerUser | null;
  hotel: Hotel | null;
  isAuthenticated: boolean;
  signIn: (payload: LoginRequest) => Promise<Session>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({children}: {children: React.ReactNode}) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [session, setSession] = useState<Session | null>(null);

  // ── Auto-login on app start ──
  useEffect(() => {
    let active = true;
    (async () => {
      const restored = await authRepository.restoreSession();
      if (!active) {
        return;
      }
      if (restored) {
        setSession(restored);
        setStatus('authenticated');
      } else {
        setSession(null);
        setStatus('unauthenticated');
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // ── React to 401s bubbled from the api layer ──
  useEffect(() => {
    return authEvents.onUnauthorized(() => {
      setSession(null);
      setStatus('unauthenticated');
    });
  }, []);

  const signIn = useCallback(async (payload: LoginRequest) => {
    const next = await authRepository.login(payload);
    setSession(next);
    setStatus('authenticated');
    return next;
  }, []);

  const signOut = useCallback(async () => {
    try {
      await authRepository.logout();
    } catch (error) {
      logger.warn('auth', 'Sign-out error (ignored)', error);
    }
    setSession(null);
    setStatus('unauthenticated');
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      session,
      user: session?.user ?? null,
      hotel: session?.hotel ?? null,
      isAuthenticated: status === 'authenticated',
      signIn,
      signOut,
    }),
    [status, session, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an <AuthProvider>');
  }
  return ctx;
}
