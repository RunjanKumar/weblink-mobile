import {apiClient} from './axios';
import {ENDPOINTS} from './endpoints';
import type {ApiResponse} from '../models/api.model';
import type {
  ForgotPasswordRequest,
  LoginRequest,
  LoginResponseData,
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
   * POST /v1/customer/forgot-password — PLANNED endpoint (see WEBLINK_ISSUES.md).
   * The repository handles a 404 gracefully until the backend ships this.
   */
  async forgotPassword(payload: ForgotPasswordRequest): Promise<ApiResponse<unknown>> {
    const {data} = await apiClient.post<ApiResponse<unknown>>(
      ENDPOINTS.FORGOT_PASSWORD,
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
