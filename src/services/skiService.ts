
import { SkiDay, SkiStats } from '@/types/ski';

export const skiService = {
  async getStats(): Promise<SkiStats> {
    // Cursor will implement this to fetch from your API
    throw new Error('Not implemented');
  },

  async logDay(day: Omit<SkiDay, 'id'>): Promise<SkiDay> {
    // Cursor will implement this to send to your API
    throw new Error('Not implemented');
  }
};
