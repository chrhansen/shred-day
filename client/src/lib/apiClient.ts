// Custom error for authentication issues
export class AuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

// Custom error for validation issues
export class ValidationError extends Error {
  errors: Record<string, string[]>;
  
  constructor(errors: Record<string, string[]>) {
    const messages = Object.values(errors).flat();
    super(messages.join(', '));
    this.name = 'ValidationError';
    this.errors = errors;
  }
}

import { API_BASE_URL } from '@/lib/config';
import type { QueryParams, RequestBody } from '@/types/api';

// Default options for fetch requests
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
    // Handle login/auth failure specifically
    try {
      const errorData = await response.json();
      throw new AuthenticationError(errorData.error || 'User not authenticated');
    } catch (error) {
      if (error instanceof AuthenticationError) throw error;
      throw new AuthenticationError('User not authenticated');
    }
  }

  // Handle other errors (like 422 validation)
  try {
    const errorData = await response.json();

    // Check if Rails validation errors object exists
    if (errorData && typeof errorData.errors === 'object' && errorData.errors !== null) {
      throw new ValidationError(errorData.errors);
    }

    // Fallback for other JSON errors
    throw new Error(errorData.error || `Request failed with status ${response.status}`);

  } catch (error) {
    // Re-throw known errors (AuthenticationError, ValidationError)
    if (error instanceof AuthenticationError || error instanceof ValidationError) {
      throw error;
    }
    // Check if this was an error we just threw (has specific error message)
    if (error instanceof Error && error.message && !error.message.includes('JSON')) {
      throw error;
    }
    // Fallback if response is not JSON or parsing fails
    throw new Error(`Request failed with status ${response.status}`);
  }
}

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

interface ApiRequestOptions {
  method?: HttpMethod;
  body?: RequestBody;
  headers?: Record<string, string>;
  skipAuth?: boolean;
  params?: QueryParams;
}

interface ApiClientConfig {
  baseUrl?: string;
  defaultHeaders?: Record<string, string>;
}

export class ApiClient {
  private baseUrl: string;
  private defaultHeaders: Record<string, string>;

  constructor(config: ApiClientConfig = {}) {
    this.baseUrl = config.baseUrl || API_BASE_URL;
    this.defaultHeaders = config.defaultHeaders || {};
  }

  // Build URL with query parameters
  private buildUrl(endpoint: string, params?: QueryParams): string {
    const url = `${this.baseUrl}${endpoint}`;
    
    if (!params || Object.keys(params).length === 0) return url;

    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, String(value));
      }
    });

    const queryString = queryParams.toString();
    return queryString ? `${url}?${queryString}` : url;
  }

  // Main request method
  async request<T>(endpoint: string, options: ApiRequestOptions = {}): Promise<T> {
    const { method = 'GET', body, headers = {}, skipAuth = false } = options;

    const requestOptions: RequestInit = {
      ...defaultFetchOptions,
      method,
      headers: {
        ...defaultFetchOptions.headers,
        ...this.defaultHeaders,
        ...headers,
      },
    };

    // Handle body serialization
    if (body) {
      if (body instanceof FormData) {
        // For FormData, remove Content-Type to let browser set it with boundary
        delete (requestOptions.headers as Record<string, string>)['Content-Type'];
        requestOptions.body = body;
      } else {
        requestOptions.body = JSON.stringify(body);
      }
    }

    // Make the request
    const response = await fetch(this.buildUrl(endpoint), requestOptions);

    // Handle 204 No Content responses
    if (response.status === 204) {
      return undefined as T;
    }

    // Handle authentication errors
    if (response.status === 401 && !skipAuth) {
      await handleApiError(response);
    }

    // Handle other errors
    if (!response.ok) {
      await handleApiError(response);
    }

    // Parse and return JSON response
    return await response.json();
  }

  // Convenience methods
  async get<T>(endpoint: string, params?: QueryParams): Promise<T> {
    const url = params ? this.buildUrl(endpoint, params).replace(this.baseUrl, '') : endpoint;
    return this.request<T>(url, { method: 'GET' });
  }

  async post<T>(endpoint: string, body?: RequestBody, options?: Omit<ApiRequestOptions, 'method' | 'body'>): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'POST', body });
  }

  async patch<T>(endpoint: string, body?: RequestBody, options?: Omit<ApiRequestOptions, 'method' | 'body'>): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'PATCH', body });
  }

  async put<T>(endpoint: string, body?: RequestBody, options?: Omit<ApiRequestOptions, 'method' | 'body'>): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'PUT', body });
  }

  async delete<T>(endpoint: string, options?: Omit<ApiRequestOptions, 'method'>): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }

  // Special method for FormData uploads
  async uploadFormData<T>(endpoint: string, formData: FormData): Promise<T> {
    return this.post<T>(endpoint, formData);
  }
}

// Export a default instance
export const apiClient = new ApiClient();

// Export utility function for legacy code compatibility
export { API_BASE_URL, defaultFetchOptions, handleApiError };
