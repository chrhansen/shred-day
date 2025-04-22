import { SkiDay, SkiStats, UserCredentials, UserInfo, UserSignUp, Ski } from '@/types/ski';

// Custom error for authentication issues
export class AuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

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

// Helper function for handling API errors
async function handleApiError(response: Response): Promise<void> {
  if (response.status === 401) {
    throw new AuthenticationError('User not authenticated');
  }
  // Attempt to parse JSON error response from Rails
  try {
    const errorData = await response.json();
    const errorMessage = errorData.errors?.join(', ') || errorData.error || `Request failed with status ${response.status}`;
    throw new Error(errorMessage);
  } catch (e) {
    // Fallback if response is not JSON or parsing fails
    throw new Error(`Request failed with status ${response.status}`);
  }
}

export const skiService = {
  async getStats(): Promise<SkiStats> {
    const response = await fetch(`${API_BASE_URL}/api/v1/stats`, {
      ...defaultFetchOptions,
      method: 'GET',
    });
    if (!response.ok) await handleApiError(response); // Use helper
    return await response.json();
  },

  async logDay(day: Omit<SkiDay, 'id'>): Promise<SkiDay> {
    const response = await fetch(`${API_BASE_URL}/api/v1/days`, {
      ...defaultFetchOptions,
      method: 'POST',
      body: JSON.stringify({ day }),
    });
    if (!response.ok) await handleApiError(response); // Use helper
    return await response.json();
  },

  async signUp(userData: UserSignUp): Promise<UserInfo> {
    const response = await fetch(`${API_BASE_URL}/api/v1/users`, {
      ...defaultFetchOptions,
      method: 'POST',
      body: JSON.stringify({ user: userData }),
    });
    if (!response.ok) await handleApiError(response); // Use helper
    return await response.json();
  },

  async signIn(credentials: UserCredentials): Promise<UserInfo> {
    const response = await fetch(`${API_BASE_URL}/api/v1/session`, {
      ...defaultFetchOptions,
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    if (!response.ok) await handleApiError(response); // Use helper
    const data = await response.json();
    return data.user;
  },

  async signOut(): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/v1/session`, {
      ...defaultFetchOptions,
      method: 'DELETE',
    });
    if (!response.ok) {
      // Don't throw auth error on sign out failure, just log
      console.error('Sign out failed:', response.status);
    }
  },

  // --- Ski Equipment Methods ---

  async getSkis(): Promise<Ski[]> {
    const response = await fetch(`${API_BASE_URL}/api/v1/skis`, {
      ...defaultFetchOptions,
      method: 'GET',
    });
    if (!response.ok) await handleApiError(response); // Use helper
    return await response.json();
  },

  async addSki(skiData: { name: string }): Promise<Ski> {
    const response = await fetch(`${API_BASE_URL}/api/v1/skis`, {
      ...defaultFetchOptions,
      method: 'POST',
      body: JSON.stringify({ ski: skiData }), // Nest under 'ski' key for Rails params
    });
    if (!response.ok) await handleApiError(response); // Use helper
    return await response.json();
  },

  async updateSki(skiId: number, skiData: { name: string }): Promise<Ski> {
    const response = await fetch(`${API_BASE_URL}/api/v1/skis/${skiId}`, {
      ...defaultFetchOptions,
      method: 'PATCH', // Or PUT
      body: JSON.stringify({ ski: skiData }), // Nest under 'ski' key
    });
    if (!response.ok) await handleApiError(response); // Use helper
    return await response.json();
  },

  async deleteSki(skiId: number): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/v1/skis/${skiId}`, {
      ...defaultFetchOptions,
      method: 'DELETE',
    });
    if (!response.ok) await handleApiError(response); // Use helper
    // No response body expected for DELETE 204 No Content
  },
};
