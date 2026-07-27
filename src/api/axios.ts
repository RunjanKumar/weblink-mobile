import axios, {
  AxiosError,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from 'axios';
import {config} from '../constants/config';
import {tokenStorage} from '../services/secureStorage.service';
import {authEvents} from '../services/authEvents';
import {logger} from '../services/logger';

/**
 * Single shared axios instance.
 *  - Base URL + timeout from env config.
 *  - Request interceptor attaches the raw token as `authorization` (the backend
 *    expects the raw JWT, NOT the "Bearer" scheme — matches the web app).
 *  - Response interceptor clears the session on 401 and notifies the app to
 *    reset to the Login screen (via the decoupled authEvents bus).
 */
export const apiClient: AxiosInstance = axios.create({
  baseURL: config.apiBaseUrl,
  timeout: config.apiTimeout,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(
  (request: InternalAxiosRequestConfig) => {
    const token = tokenStorage.getSync();
    if (token) {
      request.headers.set('authorization', token);
    }
    return request;
  },
  error => Promise.reject(error),
);

apiClient.interceptors.response.use(
  response => response,
  async (error: AxiosError) => {
    const status = error.response?.status;

    if (status === 401) {
      logger.warn('api', '401 Unauthorized — clearing session');
      await tokenStorage.clear();
      // NOTE: backend has no refresh-token endpoint (see WEBLINK_ISSUES.md); a
      // future refresh flow would slot in here before emitting unauthorized.
      authEvents.emitUnauthorized();
    }

    return Promise.reject(error);
  },
);
