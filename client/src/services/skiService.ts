import { SkiStats, UserCredentials, UserInfo, UserSignUp, Ski, SkiDayEntry, SkiDayDetail } from '@/types/ski';
import { format } from 'date-fns'; // Import format

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

  async logDay(dayData: { date: string; resort_id: string; ski_ids: string[]; activity: string; photo_ids: string[] }): Promise<SkiDayDetail> {
    const response = await fetch(`${API_BASE_URL}/api/v1/days`, {
      ...defaultFetchOptions,
      method: 'POST',
      body: JSON.stringify({ day: dayData }),
    });
    if (!response.ok) await handleApiError(response);
    const responseData = await response.json();
    return responseData;
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

  async updateSki(skiId: string, skiData: { name: string }): Promise<Ski> {
    const response = await fetch(`${API_BASE_URL}/api/v1/skis/${skiId}`, {
      ...defaultFetchOptions,
      method: 'PATCH',
      body: JSON.stringify({ ski: skiData }),
    });
    if (!response.ok) await handleApiError(response);
    return await response.json();
  },

  async deleteSki(skiId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/v1/skis/${skiId}`, {
      ...defaultFetchOptions,
      method: 'DELETE',
    });
    if (!response.ok) await handleApiError(response);
  },

  // get all ski days
  async getDays(): Promise<SkiDayEntry[]> {
    const response = await fetch(`${API_BASE_URL}/api/v1/days`, {
      ...defaultFetchOptions,
      method: 'GET',
    });
    if (!response.ok) await handleApiError(response);
    return await response.json();
  },

  // get a single ski day by ID
  async getDay(dayId: string): Promise<SkiDayDetail> {
    const response = await fetch(`${API_BASE_URL}/api/v1/days/${dayId}`, {
      ...defaultFetchOptions,
      method: 'GET',
    });
    if (!response.ok) await handleApiError(response);
    const dayData = await response.json();
    // Return the raw response matching SkiDayDetail
    return dayData;
  },

  async updateDay(
    dayId: string,
    dayData: Partial<Omit<SkiDayDetail, 'id' | 'resort' | 'photos' | 'skis'>> &
             { resort_id?: string; ski_ids?: string[]; activity?: string; photo_ids?: string[] }
  ): Promise<SkiDayDetail> {
    const response = await fetch(`${API_BASE_URL}/api/v1/days/${dayId}`, {
      ...defaultFetchOptions,
      method: 'PATCH',
      body: JSON.stringify({ day: dayData }),
    });
    if (!response.ok) await handleApiError(response);
    const updatedDayData = await response.json();
    return updatedDayData;
  },

  async deleteDay(dayId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/v1/days/${dayId}`, {
      ...defaultFetchOptions,
      method: 'DELETE',
    });
    if (response.status === 204) {
      return;
    }
    if (!response.ok) {
       await handleApiError(response); // Try standard error handling
    }
     console.warn('Unexpected status code after DELETE:', response.status);
  },

  // --- NEW Photo Service Methods ---

  async uploadPhoto(file: File): Promise<{ id: string; preview_url: string | null; full_url: string | null; filename: string }> {
    const formData = new FormData();
    formData.append('file', file);

    // Use custom RequestInit for this multipart/form-data request
    const requestOptions: RequestInit = {
      // Inherit credentials if needed, but override headers
      credentials: defaultFetchOptions.credentials,
      method: 'POST',
      headers: {
        // Remove Content-Type, let browser set it for FormData
        'Accept': 'application/json',
        // TODO: Add Auth/CSRF headers if required by backend
      },
      body: formData,
    };

    const response = await fetch(`${API_BASE_URL}/api/v1/photos`, requestOptions);
    if (!response.ok) await handleApiError(response); // Use standard error handler
    return await response.json(); // Return the serialized photo data
  },

  async deletePhoto(photoId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/v1/photos/${photoId}`, {
      ...defaultFetchOptions, // Use default options (like credentials)
      headers: {
          // Override default Content-Type if needed, but usually not for DELETE
          'Accept': 'application/json',
          // TODO: Add Auth/CSRF headers if required
      },
      method: 'DELETE',
    });
    // Check for 204 No Content explicitly for success
    if (response.status === 204) {
      return; // Success
    }
    // Handle other errors (including 404, 401, etc.)
    if (!response.ok) {
      await handleApiError(response);
    }
    // Log unexpected statuses if needed
    console.warn('Unexpected status code after DELETE photo:', response.status);
    // Optionally throw an error for unexpected non-error statuses?
    // throw new Error(`Unexpected status ${response.status} deleting photo`);
  },
  // --- END NEW Photo Service Methods ---

};
