import { SkiDay, SkiStats } from '@/types/ski';

export const skiService = {
  async getStats(): Promise<SkiStats> {
    // TODO: Implement fetching stats from your API
    console.warn('getStats not implemented - returning placeholder data');
    // Placeholder structure, replace with actual fetch and data
    return { totalDays: 0, uniqueResorts: 0, mostUsedSki: "N/A" };
  },

  async logDay(day: Omit<SkiDay, 'id'>): Promise<SkiDay> {
    const response = await fetch('https://example.com/days', {
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
