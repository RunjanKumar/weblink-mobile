import {folioApi} from '../api/folio.api';
import type {GuestFolio} from '../models/folio.model';

export const folioRepository = {
  /** Current stay's bill, or null when the envelope carries no data. */
  async getGuestFolio(hotelId: string): Promise<GuestFolio | null> {
    const res = await folioApi.getGuestFolio(hotelId);
    return res.data ?? null;
  },
};
