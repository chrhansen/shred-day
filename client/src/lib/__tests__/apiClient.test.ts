// Mock import.meta.env before importing the module
jest.mock('../apiClient', () => {
  const originalModule = jest.requireActual('../apiClient');
  
  // Mock the API_BASE_URL constant
  const API_BASE_URL = 'http://localhost:3000';
  
  return {
    ...originalModule,
    API_BASE_URL,
    apiClient: new originalModule.ApiClient({ baseUrl: API_BASE_URL }),
  };
});

import { ApiClient, AuthenticationError, ValidationError } from '../apiClient';

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

describe('ApiClient', () => {
  let apiClient: ApiClient;

  beforeEach(() => {
    jest.clearAllMocks();
    apiClient = new ApiClient({ baseUrl: 'http://localhost:3000' });
  });

  describe('request method', () => {
    it('should make a GET request with default options', async () => {
      const mockData = { id: 1, name: 'Test' };
      (global.fetch as jest.Mock).mockResolvedValueOnce(mockResponse(mockData));

      const result = await apiClient.request('/api/v1/test');

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/v1/test',
        expect.objectContaining({
          method: 'GET',
          credentials: 'include',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          }),
        })
      );
      expect(result).toEqual(mockData);
    });

    it('should handle 204 No Content responses', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce(mockResponse(null, { status: 204 }));

      const result = await apiClient.request('/api/v1/test', { method: 'DELETE' });

      expect(result).toBeUndefined();
    });

    it('should handle FormData correctly', async () => {
      const formData = new FormData();
      formData.append('file', new File(['test'], 'test.txt'));
      
      (global.fetch as jest.Mock).mockResolvedValueOnce(mockResponse({ success: true }));

      await apiClient.request('/api/v1/upload', { method: 'POST', body: formData });

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/v1/upload',
        expect.objectContaining({
          method: 'POST',
          body: formData,
          headers: expect.not.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('should handle authentication errors', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce(
        mockResponse({ error: 'Not authenticated' }, { status: 401, ok: false })
      );

      await expect(apiClient.request('/api/v1/protected')).rejects.toThrow(AuthenticationError);
    });

    it('should handle validation errors', async () => {
      const errors = {
        email: ['is invalid', 'is already taken'],
        name: ['cannot be blank'],
      };
      
      (global.fetch as jest.Mock).mockResolvedValueOnce(
        mockResponse({ errors }, { status: 422, ok: false })
      );

      try {
        await apiClient.request('/api/v1/users', { method: 'POST' });
        fail('Should have thrown ValidationError');
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        expect((error as ValidationError).errors).toEqual(errors);
        expect(error.message).toBe('is invalid, is already taken, cannot be blank');
      }
    });
  });

  describe('convenience methods', () => {
    it('should make GET requests with query parameters', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce(mockResponse({ data: [] }));

      await apiClient.get('/api/v1/items', { page: 1, limit: 10, filter: 'active' });

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/v1/items?page=1&limit=10&filter=active',
        expect.objectContaining({ method: 'GET' })
      );
    });

    it('should make POST requests with body', async () => {
      const body = { name: 'New Item', description: 'Test' };
      (global.fetch as jest.Mock).mockResolvedValueOnce(mockResponse({ id: 1, ...body }));

      await apiClient.post('/api/v1/items', body);

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/v1/items',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(body),
        })
      );
    });

    it('should make PATCH requests', async () => {
      const body = { name: 'Updated Item' };
      (global.fetch as jest.Mock).mockResolvedValueOnce(mockResponse({ id: 1, ...body }));

      await apiClient.patch('/api/v1/items/1', body);

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/v1/items/1',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify(body),
        })
      );
    });

    it('should make DELETE requests', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce(mockResponse(null, { status: 204 }));

      await apiClient.delete('/api/v1/items/1');

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/v1/items/1',
        expect.objectContaining({ method: 'DELETE' })
      );
    });

    it('should upload FormData', async () => {
      const formData = new FormData();
      formData.append('file', new File(['test'], 'test.jpg', { type: 'image/jpeg' }));
      
      (global.fetch as jest.Mock).mockResolvedValueOnce(mockResponse({ url: 'http://example.com/test.jpg' }));

      await apiClient.uploadFormData('/api/v1/photos', formData);

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/v1/photos',
        expect.objectContaining({
          method: 'POST',
          body: formData,
        })
      );
    });
  });

  describe('URL building', () => {
    it('should handle empty query parameters', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce(mockResponse({}));

      await apiClient.get('/api/v1/items', {});

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/v1/items',
        expect.any(Object)
      );
    });

    it('should filter out null and undefined query parameters', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce(mockResponse({}));

      await apiClient.get('/api/v1/items', { 
        page: 1, 
        filter: null, 
        sort: undefined, 
        active: false 
      });

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/v1/items?page=1&active=false',
        expect.any(Object)
      );
    });
  });

  describe('error handling', () => {
    it('should handle network errors', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      await expect(apiClient.get('/api/v1/test')).rejects.toThrow('Network error');
    });

    it('should handle non-JSON error responses', async () => {
      const mockFetch = global.fetch as jest.Mock;
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: jest.fn().mockRejectedValueOnce(new SyntaxError('Invalid JSON')),
      } as unknown as Response);

      await expect(apiClient.get('/api/v1/test')).rejects.toThrow('Request failed with status 500');
    });

    it('should skip auth error handling when skipAuth is true', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce(
        mockResponse({ data: 'public' }, { status: 401 })
      );

      const result = await apiClient.request('/api/v1/public', { skipAuth: true });

      expect(result).toEqual({ data: 'public' });
    });
  });

  describe('custom headers', () => {
    it('should include custom headers in requests', async () => {
      const customClient = new ApiClient({
        baseUrl: 'http://localhost:3000',
        defaultHeaders: { 'X-Custom-Header': 'test-value' },
      });

      (global.fetch as jest.Mock).mockResolvedValueOnce(mockResponse({}));

      await customClient.get('/api/v1/test');

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/v1/test',
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Custom-Header': 'test-value',
          }),
        })
      );
    });

    it('should allow overriding headers per request', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce(mockResponse({}));

      await apiClient.post('/api/v1/test', {}, { 
        headers: { 'X-Request-ID': '123' } 
      });

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/v1/test',
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Request-ID': '123',
          }),
        })
      );
    });
  });
});