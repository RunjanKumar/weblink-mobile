import {authApi} from '../api/auth.api';
import {customerApi} from '../api/customer.api';
import {tokenStorage} from '../services/secureStorage.service';
import {storage} from '../services/storage.service';
import {STORAGE_KEYS} from '../constants/storageKeys';
import {logger} from '../services/logger';
import type {
  ForgotPasswordRequest,
  LoginRequest,
  LoginResponseData,
  Session,
} from '../models/auth.model';

function toSession(data: LoginResponseData, token: string): Session {
  return {
    token,
    user: data.user,
    hotel: data.hotelData ?? null,
    booking: data.bookRoomData?.[0] ?? null,
  };
}

/**
 * Orchestrates auth API + secure storage. This is the only layer that both talks
 * to the network AND touches persistence — keeping side effects out of the API
 * and the ViewModel.
 */
export const authRepository = {
  async login(payload: LoginRequest): Promise<Session> {
    const res = await authApi.loginByEmail(payload);
    const data = res.data;
    if (!data?.token || !data.user) {
      throw new Error(res.message || 'Login failed. Please try again.');
    }
    // Persist the token BEFORE any authenticated call so the interceptor sees it.
    await tokenStorage.set(data.token);
    const session = toSession(data, data.token);
    storage.setObject(STORAGE_KEYS.USER_PROFILE, session.user);
    return session;
  },

  async forgotPassword(payload: ForgotPasswordRequest): Promise<string> {
    const res = await authApi.forgotPassword(payload);
    return res.message || 'If an account exists for that email, a reset link has been sent.';
  },

  /** Auto-login: restore + validate a persisted token on app start. */
  async restoreSession(): Promise<Session | null> {
    const token = await tokenStorage.load();
    if (!token) {
      return null;
    }
    try {
      const res = await customerApi.getProfile();
      const profile = res.data;
      if (!profile?.user) {
        throw new Error('Profile unavailable');
      }
      return {
        token,
        user: profile.user,
        hotel: profile.hotelData ?? null,
        booking: profile.bookRoomData?.[0] ?? null,
      };
    } catch (error) {
      logger.warn('auth.repo', 'Session restore failed — clearing token', error);
      await tokenStorage.clear();
      return null;
    }
  },

  async logout(): Promise<void> {
    await authApi.logout(); // best-effort (never throws)
    await tokenStorage.clear();
    storage.remove(STORAGE_KEYS.USER_PROFILE);
  },
};
