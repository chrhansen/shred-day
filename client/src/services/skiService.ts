import { SkiDay, SkiStats, UserCredentials, UserInfo, UserSignUp } from '@/types/ski';

// Determine API base URL based on environment
const API_BASE_URL = import.meta.env.DEV ? 'http://localhost:3000' : '';

// Default options for fetch requests, including credentials
const defaultFetchOptions: RequestInit = {
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  credentials: 'include', // Important: sends cookies (like session id) with requests
};

export const skiService = {
  async getStats(): Promise<SkiStats> {
    const response = await fetch(`${API_BASE_URL}/api/v1/stats`, {
      ...defaultFetchOptions,
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
    const response = await fetch(`${API_BASE_URL}/api/v1/days`, {
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
