import { SkiDay, SkiStats } from '@/types/ski';

export const skiService = {
  async getStats(): Promise<SkiStats> {
    const response = await fetch('/api/v1/stats', {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch ski stats');
    }

    const stats: SkiStats = await response.json();
    return stats;
  },

  async logDay(day: Omit<SkiDay, 'id'>): Promise<SkiDay> {
    const response = await fetch('/api/v1/days', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(day),
    });

    if (!response.ok) {
      // Consider more specific error handling based on response status/body
      throw new Error('Failed to log ski day via API');
    }

    // Assuming the API returns the created ski day object with an ID
    const createdDay: SkiDay = await response.json();
    return createdDay;
  }
};
