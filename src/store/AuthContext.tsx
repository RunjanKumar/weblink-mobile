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
import {queryClient} from '../services/queryClient';
import type {AuthStatus, LoginRequest, Session} from '../models/auth.model';
import type {CustomerUser, Hotel} from '../models/user.model';

interface AuthContextValue {
  status: AuthStatus;
  session: Session | null;
  user: CustomerUser | null;
  hotel: Hotel | null;
  isAuthenticated: boolean;
  signIn: (payload: LoginRequest) => Promise<Session>;
  /** In-room TV: sign in with the guest token the backend handed the TV. */
  signInWithToken: (token: string) => Promise<Session>;
  signOut: () => Promise<void>;
  /** In-room TV: forget the guest on this device only (no logout call). */
  resetLocal: () => Promise<void>;
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
  // Cached queries belong to the guest who just lost their session; drop them
  // so the next guest (on a shared TV) never sees them.
  useEffect(() => {
    return authEvents.onUnauthorized(() => {
      queryClient.clear();
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

  const signInWithToken = useCallback(async (token: string) => {
    const next = await authRepository.loginWithToken(token);
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
    queryClient.clear();
    setSession(null);
    setStatus('unauthenticated');
  }, []);

  const resetLocal = useCallback(async () => {
    await authRepository.clearLocal();
    queryClient.clear();
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
      signInWithToken,
      signOut,
      resetLocal,
    }),
    [status, session, signIn, signInWithToken, signOut, resetLocal],
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
