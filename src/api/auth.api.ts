import {apiClient} from './axios';
import {ENDPOINTS} from './endpoints';
import type {ApiResponse} from '../models/api.model';
import type {
  ForgotPasswordRequest,
  LoginRequest,
  LoginResponseData,
  ResetPasswordRequest,
} from '../models/auth.model';
import {logger} from '../services/logger';

/**
 * Raw auth API calls. No storage / state side effects — that belongs to the
 * repository. Each method returns the parsed response envelope.
 */
export const authApi = {
  /** POST /v1/customer/login/email — email + password sign in. */
  async loginByEmail(payload: LoginRequest): Promise<ApiResponse<LoginResponseData>> {
    const {data} = await apiClient.post<ApiResponse<LoginResponseData>>(
      ENDPOINTS.LOGIN_EMAIL,
      payload,
    );
    return data;
  },

  /**
   * POST /v1/customer/forgot-password — emails a 6-digit password-reset OTP.
   * The ViewModel still degrades gracefully on 404 for older backend deploys.
   */
  async forgotPassword(payload: ForgotPasswordRequest): Promise<ApiResponse<unknown>> {
    const {data} = await apiClient.post<ApiResponse<unknown>>(
      ENDPOINTS.FORGOT_PASSWORD,
      payload,
    );
    return data;
  },

  /** POST /v1/customer/reset-password — verifies the OTP and sets the new password. */
  async resetPassword(payload: ResetPasswordRequest): Promise<ApiResponse<unknown>> {
    const {data} = await apiClient.post<ApiResponse<unknown>>(
      ENDPOINTS.RESET_PASSWORD,
      payload,
    );
    return data;
  },

  /** POST /user/logout — best-effort server-side session teardown. */
  async logout(): Promise<void> {
    try {
      await apiClient.post(ENDPOINTS.LOGOUT);
    } catch (error) {
      // Non-fatal: local session is cleared regardless.
      logger.warn('auth.api', 'Server logout failed (ignored)', error);
    }
  },
};
