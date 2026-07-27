import {apiClient} from './axios';
import {ENDPOINTS} from './endpoints';
import type {ApiResponse} from '../models/api.model';
import type {CustomerProfile} from '../models/user.model';

/**
 * Customer (guest) data API. Requires an authenticated token (attached by the
 * axios request interceptor).
 */
export const customerApi = {
  /** GET /v1/customer/login/profile — the signed-in guest's profile + booking. */
  async getProfile(): Promise<ApiResponse<CustomerProfile>> {
    const {data} = await apiClient.get<ApiResponse<CustomerProfile>>(
      ENDPOINTS.CUSTOMER_PROFILE,
    );
    return data;
  },
};
