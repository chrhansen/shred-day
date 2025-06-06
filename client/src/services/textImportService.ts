import { API_BASE_URL, defaultFetchOptions, handleApiError, AuthenticationError } from './skiService';
import { type DraftDay } from '@/types/ski';

const TEXT_IMPORTS_API_PATH = '/api/v1/text_imports';

export interface TextImport {
  id: string;
  user_id: string;
  status: "waiting" | "processing" | "committed" | "canceled" | "failed";
  original_text?: string | null;
  created_at: string;
  updated_at: string;
  draft_days?: DraftDay[];
}

/**
 * Creates a new text import session on the server.
 */
async function createTextImport(): Promise<TextImport> {
  const response = await fetch(`${API_BASE_URL}${TEXT_IMPORTS_API_PATH}`, {
    ...defaultFetchOptions,
    method: 'POST',
  });

  if (response.status === 401) {
    throw new AuthenticationError('User not authenticated');
  }
  if (!response.ok) {
    await handleApiError(response);
  }
  return await response.json() as TextImport;
}

/**
 * Creates a new text import session and processes text/file to create draft days.
 */
async function createAndProcessTextImport(text?: string, file?: File, seasonOffset?: number): Promise<TextImport> {
  const formData = new FormData();

  if (text) {
    formData.append('text', text);
  }
  if (file) {
    formData.append('file', file);
  }
  if (seasonOffset !== undefined) {
    formData.append('season_offset', seasonOffset.toString());
  }

  const customHeaders = new Headers();
  customHeaders.append('Accept', 'application/json');

  if (defaultFetchOptions.headers) {
    const tempHeaders = new Headers(defaultFetchOptions.headers);
    const authHeader = tempHeaders.get('Authorization');
    if (authHeader) {
      customHeaders.append('Authorization', authHeader);
    }
  }

  const requestOptions: RequestInit = {
    credentials: defaultFetchOptions.credentials,
    method: 'POST',
    headers: customHeaders,
    body: formData,
  };

  const response = await fetch(`${API_BASE_URL}${TEXT_IMPORTS_API_PATH}`, requestOptions);

  if (response.status === 401) {
    throw new AuthenticationError('User not authenticated');
  }
  if (!response.ok) {
    await handleApiError(response);
  }
  return await response.json() as TextImport;
}

/**
 * Fetches details of a specific text import session.
 */
async function getTextImport(importId: string): Promise<TextImport> {
  const response = await fetch(`${API_BASE_URL}${TEXT_IMPORTS_API_PATH}/${importId}`, {
    ...defaultFetchOptions,
    method: 'GET',
  });

  if (response.status === 401) {
    throw new AuthenticationError('User not authenticated');
  }
  if (!response.ok) {
    await handleApiError(response);
  }
  return await response.json() as TextImport;
}

/**
 * Processes text or file to create draft days.
 */
async function processTextImport(importId: string, text?: string, file?: File): Promise<TextImport> {
  const formData = new FormData();

  if (text) {
    formData.append('text', text);
  }
  if (file) {
    formData.append('file', file);
  }

  const customHeaders = new Headers();
  customHeaders.append('Accept', 'application/json');

  if (defaultFetchOptions.headers) {
    const tempHeaders = new Headers(defaultFetchOptions.headers);
    const authHeader = tempHeaders.get('Authorization');
    if (authHeader) {
      customHeaders.append('Authorization', authHeader);
    }
  }

  const requestOptions: RequestInit = {
    credentials: defaultFetchOptions.credentials,
    method: 'PATCH',
    headers: customHeaders,
    body: formData,
  };

  const response = await fetch(`${API_BASE_URL}${TEXT_IMPORTS_API_PATH}/${importId}/process`, requestOptions);

  if (response.status === 401) {
    throw new AuthenticationError('User not authenticated');
  }
  if (!response.ok) {
    await handleApiError(response);
  }
  return await response.json() as TextImport;
}

/**
 * Updates the decision for a specific draft day.
 */
async function updateDraftDayDecision(
  draftDayId: string,
  decision: "merge" | "duplicate" | "skip"
): Promise<DraftDay> {
  const response = await fetch(`${API_BASE_URL}/api/v1/draft_days/${draftDayId}`, {
    ...defaultFetchOptions,
    method: 'PATCH',
    body: JSON.stringify({ draft_day: { decision: decision } }),
  });

  if (response.status === 401) {
    throw new AuthenticationError('User not authenticated');
  }
  if (!response.ok) {
    await handleApiError(response);
  }
  return await response.json() as DraftDay;
}

/**
 * Updates a draft day's details (date, resort).
 */
async function updateDraftDay(
  draftDayId: string,
  updates: { date?: string; resort_id?: string }
): Promise<DraftDay> {
  const response = await fetch(`${API_BASE_URL}/api/v1/draft_days/${draftDayId}`, {
    ...defaultFetchOptions,
    method: 'PATCH',
    body: JSON.stringify({ draft_day: updates }),
  });

  if (response.status === 401) {
    throw new AuthenticationError('User not authenticated');
  }
  if (!response.ok) {
    await handleApiError(response);
  }
  return await response.json() as DraftDay;
}

/**
 * Commits the text import, triggering backend processing of decisions.
 */
async function commitTextImport(importId: string): Promise<TextImport> {
  const response = await fetch(`${API_BASE_URL}${TEXT_IMPORTS_API_PATH}/${importId}`, {
    ...defaultFetchOptions,
    method: 'PATCH',
    body: JSON.stringify({ text_import: { status: 'committed' } }),
  });

  if (response.status === 401) {
    throw new AuthenticationError('User not authenticated');
  }
  if (!response.ok) {
    await handleApiError(response);
  }
  return await response.json() as TextImport;
}

/**
 * Cancels and deletes a text import session.
 */
async function cancelTextImport(importId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}${TEXT_IMPORTS_API_PATH}/${importId}`, {
    ...defaultFetchOptions,
    method: 'DELETE',
    headers: {
      'Accept': 'application/json',
      ...(defaultFetchOptions.headers instanceof Headers ?
          (defaultFetchOptions.headers.get('Authorization') ? { 'Authorization': defaultFetchOptions.headers.get('Authorization')! } : {}) :
          ((defaultFetchOptions.headers as Record<string, string>)?.Authorization ? { 'Authorization': (defaultFetchOptions.headers as Record<string, string>).Authorization } : {})
      ),
    }
  });

  if (response.status === 204) {
    return;
  }
  if (response.status === 401) {
    throw new AuthenticationError('User not authenticated');
  }
  if (!response.ok) {
    await handleApiError(response);
  }
  if (response.ok) return;

  throw new Error(`Failed to cancel text import. Status: ${response.status}`);
}

export const textImportService = {
  createTextImport,
  createAndProcessTextImport,
  getTextImport,
  processTextImport,
  updateDraftDayDecision,
  updateDraftDay,
  commitTextImport,
  cancelTextImport,
};
