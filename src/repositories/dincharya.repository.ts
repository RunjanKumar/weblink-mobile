import {dincharyaApi} from '../api/dincharya.api';
import type {GuestDincharya} from '../models/dincharya.model';

const EMPTY: GuestDincharya = {day: null, publishedDates: []};

export const dincharyaRepository = {
  /** The guest's published day (or the nearest one); empty when nothing is published. */
  async getMine(hotelId: string, date?: string): Promise<GuestDincharya> {
    const res = await dincharyaApi.getMine(hotelId, date);
    const data = res.data ?? EMPTY;
    return {...data, publishedDates: data.publishedDates ?? [], day: data.day ?? null};
  },
};
