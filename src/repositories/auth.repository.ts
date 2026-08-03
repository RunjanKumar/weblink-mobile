import axios from 'axios';
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
  ResetPasswordRequest,
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

/** Everything in a Session except the token, which lives in the Keychain. */
type CachedSession = Omit<Session, 'token'>;

function cacheSession(session: Session): void {
  const {token: _token, ...rest} = session;
  storage.setObject<CachedSession>(STORAGE_KEYS.SESSION, rest);
}

/**
 * True only when the SERVER rejected the credentials — the one case where the
 * stored token is genuinely worthless and must be thrown away.
 *
 * Everything else (no network, DNS failure, timeout, 500, a moved backend host)
 * says nothing about the token's validity. Treating those as a sign-out is what
 * logged guests out on every cold start whenever the API was unreachable, and
 * because the token was wiped, reconnecting did not bring the session back —
 * they had to type their password again.
 */
function isTokenRejected(error: unknown): boolean {
  if (!axios.isAxiosError(error)) {
    return false;
  }
  const status = error.response?.status;
  return status === 401 || status === 403;
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
    cacheSession(session);
    return session;
  },

  async forgotPassword(payload: ForgotPasswordRequest): Promise<string> {
    const res = await authApi.forgotPassword(payload);
    return res.message || 'A reset code has been sent to your email address.';
  },

  async resetPassword(payload: ResetPasswordRequest): Promise<string> {
    const res = await authApi.resetPassword(payload);
    return res.message || 'Your password has been updated.';
  },

  /**
   * Auto-login on app start. A signed-in guest stays signed in until one of
   * exactly three things happens: the server rejects the token (401/403, which
   * covers expiry), they sign out, or they were never signed in. A backend that
   * is merely unreachable is NOT one of them — see `isTokenRejected`.
   */
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
      const session: Session = {
        token,
        user: profile.user,
        hotel: profile.hotelData ?? null,
        booking: profile.bookRoomData?.[0] ?? null,
      };
      // Refresh the offline copy on every good start, so the fallback below
      // serves current data rather than whatever was true at login.
      cacheSession(session);
      return session;
    } catch (error) {
      if (isTokenRejected(error)) {
        // The axios interceptor has already cleared the token on a 401; doing it
        // again is harmless and also covers 403, which it does not handle.
        logger.warn('auth.repo', 'Token rejected by server — signing out', error);
        await tokenStorage.clear();
        storage.remove(STORAGE_KEYS.SESSION);
        return null;
      }

      const cached = storage.getObject<CachedSession>(STORAGE_KEYS.SESSION);
      if (cached?.user) {
        // KEEP the token. The guest opens straight into the app on cached data;
        // every screen refetches on mount, so real data lands as soon as the
        // backend answers, and a genuine 401 later signs them out properly.
        logger.warn('auth.repo', 'Profile unreachable — restoring cached session', error);
        return {token, ...cached};
      }

      // Nothing cached to show. Still keep the token: the next launch with a
      // working connection restores the session without a password.
      logger.warn('auth.repo', 'Profile unreachable and nothing cached', error);
      return null;
    }
  },

  async logout(): Promise<void> {
    await authApi.logout(); // best-effort (never throws)
    await tokenStorage.clear();
    storage.remove(STORAGE_KEYS.SESSION);
  },
};
