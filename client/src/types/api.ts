// API Request and Response types

// Generic API error response structure
export interface ApiErrorResponse {
  error?: string;
  errors?: Record<string, string[]>;
  message?: string;
}

// Request parameter types
export type QueryParams = Record<string, string | number | boolean | undefined>;

// Request body types - can be JSON object, FormData, or other
export type RequestBody = Record<string, unknown> | FormData | string | null;

// API Client request options
export interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  body?: RequestBody;
  params?: QueryParams;
}

// Photo upload response type
export interface PhotoUploadResponse {
  id: string;
  preview_url: string | null;
  full_url: string;
  filename: string | null;
  taken_at?: string | null;
  resort?: Resort | null;
  latitude?: number | null;
  longitude?: number | null;
  exif_state?: 'pending' | 'extracted' | 'missing' | null;
}

// Resort type (moved from resortService.ts for reuse)
export interface Resort {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  country: string;
  region: string;
  created_at: string;
  updated_at: string;
}

// Google Sign-In response
export interface GoogleSignInResponse {
  url: string;
}

// Text import types
export interface TextImport {
  id: string;
  user_id: string;
  status: 'waiting' | 'processing' | 'committed' | 'canceled' | 'failed';
  original_text?: string | null;
  created_at: string;
  updated_at: string;
  draft_days?: DraftDay[];
}

export interface DraftDay {
  id: string;
  date: string;
  decision?: 'pending' | 'merge' | 'duplicate' | 'skip';
  resort?: Resort | null;
  photos?: ServerPhoto[];
  original_text?: string | null;
  day_id?: string | null;
  skiDayExists?: boolean;
}

export interface ServerPhoto {
  id: string;
  preview_url: string | null;
  full_url: string | null;
  filename: string | null;
  taken_at?: string | null;
  resort?: Resort | null;
  latitude?: number | null;
  longitude?: number | null;
  exif_state?: 'pending' | 'extracted' | 'missing' | null;
  draft_day_id?: string | null;
}

// CSV Export types
export interface CsvExportOptions {
  column_ids: string[];
  season_offset?: number;
}

// Generic response wrapper for paginated results
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
}