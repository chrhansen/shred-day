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
      // No body needed for GET
    });
    if (!response.ok) {
      // TODO: Handle unauthorized (401) specifically?
      throw new Error('Failed to fetch ski stats');
    }
    const stats: SkiStats = await response.json();
    return stats;
  },

  async logDay(day: Omit<SkiDay, 'id'>): Promise<SkiDay> {
    const response = await fetch(`${API_BASE_URL}/api/v1/days`, {
      ...defaultFetchOptions,
      method: 'POST',
      body: JSON.stringify({ day }), // Ensure payload matches expected format if Rails expects { day: { ... } }
    });
    if (!response.ok) {
      // TODO: Handle unauthorized (401) specifically?
      throw new Error('Failed to log ski day via API');
    }
    const createdDay: SkiDay = await response.json();
    return createdDay;
  },

  async signUp(userData: UserSignUp): Promise<UserInfo> {
    const response = await fetch(`${API_BASE_URL}/api/v1/users`, {
      ...defaultFetchOptions,
      method: 'POST',
      body: JSON.stringify({ user: userData }), // Rails often expects params nested under model name
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ errors: ['Sign up failed with status ' + response.status] }));
      throw new Error(errorData.errors?.join(', ') || 'Unknown sign up error');
    }
    const user: UserInfo = await response.json();
    return user;
  },

  async signIn(credentials: UserCredentials): Promise<UserInfo> {
    const response = await fetch(`${API_BASE_URL}/api/v1/session`, {
      ...defaultFetchOptions,
      method: 'POST',
      body: JSON.stringify(credentials), // Session controller likely expects flat params
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Sign in failed with status ' + response.status }));
      throw new Error(errorData.error || 'Invalid email or password');
    }
    // The session controller returns { message: '...', user: { ... } }
    const data = await response.json();
    return data.user;
  },

  async signOut(): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/v1/session`, {
      ...defaultFetchOptions,
      method: 'DELETE',
    });

    if (!response.ok) {
      // Handle potential errors during sign out, though often less critical
      console.error('Sign out failed:', response.status);
      // Optionally throw an error or handle gracefully
    }
    // No return value needed, session is cleared server-side
  }
};
