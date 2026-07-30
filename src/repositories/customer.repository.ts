import {customerApi} from '../api/customer.api';
import type {CustomerProfile} from '../models/user.model';

/**
 * Domain-facing customer data access. Unwraps the API envelope and enforces the
 * invariant that a profile always has a user.
 */
export const customerRepository = {
  async getProfile(): Promise<CustomerProfile> {
    const res = await customerApi.getProfile();
    if (!res.data?.user) {
      throw new Error(res.message || 'Could not load your profile.');
    }
    return res.data;
  },
};
