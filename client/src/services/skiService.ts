import { SkiDay, SkiStats, UserCredentials, UserInfo, UserSignUp, Ski, SkiDayEntry } from '@/types/ski';

// Custom error for authentication issues
export class AuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

// Determine API base URL based on environment
export const API_BASE_URL = import.meta.env.DEV
  ? 'http://localhost:3000'
  : import.meta.env.VITE_API_BASE_URL || '';

// Default options for fetch requests, including credentials
export const defaultFetchOptions: RequestInit = {
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  credentials: 'include', // Important: sends cookies (like session id) with requests
};

// Helper function for handling API errors
export async function handleApiError(response: Response): Promise<void> {
  if (response.status === 401) {
    // Handle login/auth failure specifically
    // Attempt to parse body for a specific error message if backend sends one
    try {
      const errorData = await response.json();
      throw new AuthenticationError(errorData.error || 'User not authenticated');
    } catch {
      throw new AuthenticationError('User not authenticated');
    }
  }

  // Handle other errors (like 422 validation)
  try {
    const errorData = await response.json();

    // Check if Rails validation errors object exists
    if (errorData && typeof errorData.errors === 'object' && errorData.errors !== null) {
      // Extract messages from the Rails errors object { field: ["msg1", "msg2"], ... }
      const messages = Object.values(errorData.errors).flat(); // Get all message strings
      if (messages.length > 0) {
        throw new Error(messages.join(', ')); // Join all messages
      }
    }

    // Fallback for other JSON errors or if errors object is empty/malformed
    throw new Error(errorData.error || `Request failed with status ${response.status}`);

  } catch (e) {
    // Fallback if response is not JSON or parsing fails
    if (e instanceof Error) {
      throw e; // Re-throw known errors (like the ones we create above)
    }
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

  // New function to get all ski days
  async getDays(): Promise<SkiDayEntry[]> {
    const response = await fetch(`${API_BASE_URL}/api/v1/days`, {
      ...defaultFetchOptions,
      method: 'GET',
    });
    if (!response.ok) await handleApiError(response);
    return await response.json();
  },
};
