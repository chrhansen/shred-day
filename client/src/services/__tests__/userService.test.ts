// Mock the skiService module to handle import.meta.env
jest.mock('../skiService', () => ({
  API_BASE_URL: 'http://localhost:3000',
  defaultFetchOptions: {
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    credentials: 'include',
  },
  handleApiError: jest.fn(async (response: Response) => {
    const errorData = await response.json();
    throw new Error(errorData.error || `Request failed with status ${response.status}`);
  }),
}));

import { userService } from '../userService';

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

describe('userService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getRecentResorts', () => {
    it('should fetch recent resorts successfully', async () => {
      const resorts = [
        { id: 'res_1', name: 'Vail', latitude: 39.6061, longitude: -106.3550 },
        { id: 'res_2', name: 'Aspen', latitude: 39.1911, longitude: -106.8175 },
      ];
      
      (global.fetch as jest.Mock).mockResolvedValueOnce(mockResponse(resorts));

      const result = await userService.getRecentResorts();

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/v1/recent_resorts',
        expect.objectContaining({
          method: 'GET',
          credentials: 'include',
        })
      );
      expect(result).toEqual(resorts);
    });

    it('should handle authentication errors', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce(
        mockResponse({ error: 'Not authenticated' }, { status: 401, ok: false })
      );

      await expect(userService.getRecentResorts()).rejects.toThrow('Not authenticated');
    });

    it('should handle server errors', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce(
        mockResponse({ error: 'Server error' }, { status: 500, ok: false })
      );

      await expect(userService.getRecentResorts()).rejects.toThrow('Server error');
    });

    it('should handle network errors', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      await expect(userService.getRecentResorts()).rejects.toThrow('Network error');
    });
  });
});