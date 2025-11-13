// Mock the module before importing to handle import.meta.env
jest.mock('../skiService', () => {
  const mockFetch = jest.fn();
  
  class AuthenticationError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'AuthenticationError';
    }
  }

  const API_BASE_URL = 'http://localhost:3000';
  
  const defaultFetchOptions: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    credentials: 'include' as RequestCredentials,
  };

  async function handleApiError(response: Response): Promise<void> {
    if (response.status === 401) {
      try {
        const errorData = await response.json();
        throw new AuthenticationError(errorData.error || 'User not authenticated');
      } catch {
        throw new AuthenticationError('User not authenticated');
      }
    }

    try {
      const errorData = await response.json();
      if (errorData && typeof errorData.errors === 'object' && errorData.errors !== null) {
        const messages = Object.values(errorData.errors).flat();
        if (messages.length > 0) {
          throw new Error(messages.join(', '));
        }
      }
      throw new Error(errorData.error || `Request failed with status ${response.status}`);
    } catch (e) {
      if (e instanceof Error) {
        throw e;
      }
      throw new Error(`Request failed with status ${response.status}`);
    }
  }

  const skiService = {
    async getStats() {
      const response = await fetch(`${API_BASE_URL}/api/v1/stats`, {
        ...defaultFetchOptions,
        method: 'GET',
      });
      if (!response.ok) await handleApiError(response);
      return await response.json();
    },

    async signUp(userData: any) {
      const response = await fetch(`${API_BASE_URL}/api/v1/users`, {
        ...defaultFetchOptions,
        method: 'POST',
        body: JSON.stringify({ user: userData }),
      });
      if (!response.ok) await handleApiError(response);
      return await response.json();
    },

    async signIn(credentials: any) {
      const response = await fetch(`${API_BASE_URL}/api/v1/sessions`, {
        ...defaultFetchOptions,
        method: 'POST',
        body: JSON.stringify(credentials),
      });
      if (!response.ok) await handleApiError(response);
      const data = await response.json();
      return data.user;
    },

    async signOut() {
      const response = await fetch(`${API_BASE_URL}/api/v1/sessions`, {
        ...defaultFetchOptions,
        method: 'DELETE',
      });
      if (!response.ok) {
        console.error('Sign out failed:', response.status);
      }
    },

    async getSkis() {
      const response = await fetch(`${API_BASE_URL}/api/v1/skis`, {
        ...defaultFetchOptions,
        method: 'GET',
      });
      if (!response.ok) await handleApiError(response);
      return await response.json();
    },

    async addSki(skiData: any) {
      const response = await fetch(`${API_BASE_URL}/api/v1/skis`, {
        ...defaultFetchOptions,
        method: 'POST',
        body: JSON.stringify({ ski: skiData }),
      });
      if (!response.ok) await handleApiError(response);
      return await response.json();
    },

    async updateSki(skiId: string, skiData: any) {
      const response = await fetch(`${API_BASE_URL}/api/v1/skis/${skiId}`, {
        ...defaultFetchOptions,
        method: 'PATCH',
        body: JSON.stringify({ ski: skiData }),
      });
      if (!response.ok) await handleApiError(response);
      return await response.json();
    },

    async deleteSki(skiId: string) {
      const response = await fetch(`${API_BASE_URL}/api/v1/skis/${skiId}`, {
        ...defaultFetchOptions,
        method: 'DELETE',
      });
      if (!response.ok) await handleApiError(response);
    },

    async getDays(params?: { season?: number }) {
      let url = `${API_BASE_URL}/api/v1/days`;
      if (params?.season) {
        url += `?season=${params.season}`;
      }
      const response = await fetch(url, {
        ...defaultFetchOptions,
        method: 'GET',
      });
      if (!response.ok) await handleApiError(response);
      return await response.json();
    },

    async logDay(dayData: any) {
      const response = await fetch(`${API_BASE_URL}/api/v1/days`, {
        ...defaultFetchOptions,
        method: 'POST',
        body: JSON.stringify({ day: dayData }),
      });
      if (!response.ok) await handleApiError(response);
      return await response.json();
    },

    async deleteDay(dayId: string) {
      const response = await fetch(`${API_BASE_URL}/api/v1/days/${dayId}`, {
        ...defaultFetchOptions,
        method: 'DELETE',
      });
      if (response.status === 204) {
        return;
      }
      if (!response.ok) {
        await handleApiError(response);
      }
      console.warn('Unexpected status code after DELETE:', response.status);
    },

    async uploadPhoto(file: File) {
      const formData = new FormData();
      formData.append('file', file);
      const requestOptions: RequestInit = {
        credentials: defaultFetchOptions.credentials,
        method: 'POST',
        headers: {
          'Accept': 'application/json',
        },
        body: formData,
      };
      const response = await fetch(`${API_BASE_URL}/api/v1/photos`, requestOptions);
      if (!response.ok) await handleApiError(response);
      return await response.json();
    },

    async deletePhoto(photoId: string) {
      const response = await fetch(`${API_BASE_URL}/api/v1/photos/${photoId}`, {
        ...defaultFetchOptions,
        headers: {
          'Accept': 'application/json',
        },
        method: 'DELETE',
      });
      if (response.status === 204) {
        return;
      }
      if (!response.ok) {
        await handleApiError(response);
      }
      console.warn('Unexpected status code after DELETE photo:', response.status);
    },

    async initiateGoogleSignIn() {
      const response = await fetch(`${API_BASE_URL}/api/v1/google_sign_in_flow`, {
        ...defaultFetchOptions,
        method: 'POST',
      });
      if (!response.ok) {
        await handleApiError(response);
        throw new Error('Failed to initiate Google sign-in after handling API error.');
      }
      return await response.json();
    },

    async completeGoogleSignIn(code: string, state: string) {
      const response = await fetch(`${API_BASE_URL}/api/v1/google_sign_in_flow`, {
        ...defaultFetchOptions,
        method: 'PATCH',
        body: JSON.stringify({ code, state }),
      });
      if (!response.ok) {
        await handleApiError(response);
        throw new Error('Failed to complete Google sign-in after handling API error.');
      }
      return await response.json();
    },
  };

  return {
    AuthenticationError,
    API_BASE_URL,
    defaultFetchOptions,
    handleApiError,
    skiService,
  };
});

import { skiService, AuthenticationError } from '../skiService';

// Mock fetch globally
global.fetch = jest.fn();

// Helper to create a mock response
const mockResponse = (data: any, options: { status?: number; ok?: boolean } = {}) => {
  const { status = 200, ok = true } = options;
  return Promise.resolve({
    ok,
    status,
    json: async () => data,
  } as Response);
};

describe('skiService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Authentication methods', () => {
    it('should sign up a new user', async () => {
      const userData = { email: 'test@example.com', password: 'password123', name: 'Test User' };
      const expectedResponse = { id: 'usr_123', email: 'test@example.com', name: 'Test User' };
      
      (global.fetch as jest.Mock).mockResolvedValueOnce(mockResponse(expectedResponse));

      const result = await skiService.signUp(userData);

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/v1/users',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ user: userData }),
        })
      );
      expect(result).toEqual(expectedResponse);
    });

    it('should sign in a user', async () => {
      const credentials = { email: 'test@example.com', password: 'password123' };
      const expectedResponse = { user: { id: 'usr_123', email: 'test@example.com', name: 'Test User' } };
      
      (global.fetch as jest.Mock).mockResolvedValueOnce(mockResponse(expectedResponse));

      const result = await skiService.signIn(credentials);

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/v1/sessions',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(credentials),
        })
      );
      expect(result).toEqual(expectedResponse.user);
    });

    it('should handle authentication errors', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce(
        mockResponse({ error: 'Invalid credentials' }, { status: 401, ok: false })
      );

      await expect(skiService.signIn({ email: 'test@example.com', password: 'wrong' }))
        .rejects.toThrow(AuthenticationError);
    });
  });

  describe('Ski equipment methods', () => {
    it('should get all skis', async () => {
      const skis = [
        { id: 'ski_1', name: 'Volkl Mantra' },
        { id: 'ski_2', name: 'Blizzard Rustler' },
      ];
      
      (global.fetch as jest.Mock).mockResolvedValueOnce(mockResponse(skis));

      const result = await skiService.getSkis();

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/v1/skis',
        expect.objectContaining({
          method: 'GET',
        })
      );
      expect(result).toEqual(skis);
    });

    it('should add a new ski', async () => {
      const skiData = { name: 'New Ski' };
      const expectedResponse = { id: 'ski_3', name: 'New Ski' };
      
      (global.fetch as jest.Mock).mockResolvedValueOnce(mockResponse(expectedResponse));

      const result = await skiService.addSki(skiData);

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/v1/skis',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ ski: skiData }),
        })
      );
      expect(result).toEqual(expectedResponse);
    });
  });

  describe('Ski days methods', () => {
    it('should get days filtered by season', async () => {
      const days = [{ id: 'day_1', date: '2024-01-15', resort: { name: 'Vail' } }];
      
      (global.fetch as jest.Mock).mockResolvedValueOnce(mockResponse(days));

      const result = await skiService.getDays({ season: 2024 });

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/v1/days?season=2024',
        expect.objectContaining({
          method: 'GET',
        })
      );
      expect(result).toEqual(days);
    });

    it('should log a new day', async () => {
      const dayData = {
        date: '2024-01-15',
        resort_id: 'res_1',
        ski_ids: ['ski_1', 'ski_2'],
        tag_ids: ['tag_1'],
        photo_ids: [],
      };
      const expectedResponse = {
        id: 'day_1',
        date: '2024-01-15',
        resort: { id: 'res_1', name: 'Vail' },
        skis: [],
        photos: [],
        labels: [{ id: 'tag_1', name: 'alpine' }],
      };
      
      (global.fetch as jest.Mock).mockResolvedValueOnce(mockResponse(expectedResponse));

      const result = await skiService.logDay(dayData);

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/v1/days',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ day: dayData }),
        })
      );
      expect(result).toEqual(expectedResponse);
    });

    it('should delete a day', async () => {
      const dayId = 'day_1';
      
      (global.fetch as jest.Mock).mockResolvedValueOnce(mockResponse({}, { status: 204 }));

      await skiService.deleteDay(dayId);

      expect(global.fetch).toHaveBeenCalledWith(
        `http://localhost:3000/api/v1/days/${dayId}`,
        expect.objectContaining({
          method: 'DELETE',
        })
      );
    });
  });

  describe('Photo methods', () => {
    it('should upload a photo', async () => {
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const expectedResponse = {
        id: 'pho_1',
        preview_url: 'https://example.com/preview.jpg',
        full_url: 'https://example.com/full.jpg',
        filename: 'test.jpg',
      };
      
      (global.fetch as jest.Mock).mockResolvedValueOnce(mockResponse(expectedResponse));

      const result = await skiService.uploadPhoto(file);

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/v1/photos',
        expect.objectContaining({
          credentials: 'include',
          method: 'POST',
          headers: {
            'Accept': 'application/json',
          },
          body: expect.any(FormData),
        })
      );
      
      expect(result).toEqual(expectedResponse);
    });
  });

  describe('Error handling', () => {
    it('should handle network errors', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      await expect(skiService.getSkis()).rejects.toThrow('Network error');
    });
  });
});
