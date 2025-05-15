import { API_BASE_URL, defaultFetchOptions, handleApiError, AuthenticationError } from './skiService'; // Assuming skiService has these common utilities
import { type PhotoImport, type DraftDay as UIDraftDay } from '@/types/ski';

const PHOTO_IMPORTS_API_PATH = '/api/v1/photo_imports';

/**
 * Creates a new photo import session on the server.
 */
async function createPhotoImport(): Promise<PhotoImport> {
  const response = await fetch(`${API_BASE_URL}${PHOTO_IMPORTS_API_PATH}`, {
    ...defaultFetchOptions,
    method: 'POST',
    // No body needed as per the current backend controller create action
  });

  if (response.status === 401) {
    throw new AuthenticationError('User not authenticated');
  }
  if (!response.ok) {
    await handleApiError(response);
  }
  return await response.json() as PhotoImport;
}

/**
 * Fetches details of a specific photo import session.
 */
async function getPhotoImport(importId: string): Promise<PhotoImport> {
  const response = await fetch(`${API_BASE_URL}${PHOTO_IMPORTS_API_PATH}/${importId}`, {
    ...defaultFetchOptions,
    method: 'GET',
  });

  if (response.status === 401) {
    throw new AuthenticationError('User not authenticated');
  }
  if (!response.ok) {
    await handleApiError(response);
  }
  return await response.json() as PhotoImport;
}

/**
 * Uploads a photo and associates it with a specific photo import session.
 */
async function addPhotoToImport(importId: string, file: File): Promise<{ id: string; preview_url: string | null; full_url: string; filename: string | null }> {
  const formData = new FormData();
  formData.append('file', file);

  const customHeaders = new Headers(); // Initialize as Headers object
  customHeaders.append('Accept', 'application/json');

  // Safely check for and copy Authorization header if it exists in defaultFetchOptions
  if (defaultFetchOptions.headers) {
    const tempHeaders = new Headers(defaultFetchOptions.headers); // Normalize to Headers object to safely get() values
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

  const response = await fetch(`${API_BASE_URL}${PHOTO_IMPORTS_API_PATH}/${importId}/photos`, requestOptions);

  if (response.status === 401) {
    throw new AuthenticationError('User not authenticated');
  }
  if (!response.ok) {
    await handleApiError(response);
  }
  return await response.json(); // Expects the created photo object with preview_url etc.
}

/**
 * Updates a photo within a specific photo import session.
 */
async function updatePhotoInImport(
  importId: string,
  photoId: string,
  updateData: { taken_at?: string; resort_id?: string }
): Promise<{ id: string; preview_url: string | null; full_url: string; filename: string | null; taken_at?: string | null; resort?: any | null; latitude?: number | null; longitude?: number | null; exif_state?: string | null; }> {
  const response = await fetch(`${API_BASE_URL}${PHOTO_IMPORTS_API_PATH}/${importId}/photos/${photoId}`, {
    ...defaultFetchOptions, // Ensures Content-Type: application/json
    method: 'PATCH',
    body: JSON.stringify({ photo: updateData }), // Backend expects params nested under 'photo' key
  });

  if (response.status === 401) {
    throw new AuthenticationError('User not authenticated');
  }
  if (!response.ok) {
    await handleApiError(response);
  }
  return await response.json(); // Expects the updated photo object
}

/**
 * Deletes a photo from a specific photo import session.
 */
async function deletePhotoFromImport(importId: string, photoId: string): Promise<void> {
  const customHeaders = new Headers(); // Initialize as Headers object
  customHeaders.append('Accept', 'application/json');

  // Safely check for and copy Authorization header
  if (defaultFetchOptions.headers) {
    const tempHeaders = new Headers(defaultFetchOptions.headers);
    const authHeader = tempHeaders.get('Authorization');
    if (authHeader) {
      customHeaders.append('Authorization', authHeader);
    }
    // Copy other necessary headers from defaultFetchOptions if needed (e.g., X-CSRF-Token)
  }

  const response = await fetch(`${API_BASE_URL}${PHOTO_IMPORTS_API_PATH}/${importId}/photos/${photoId}`, {
    // Do not spread defaultFetchOptions directly if it contains Content-Type for DELETE
    credentials: defaultFetchOptions.credentials,
    method: 'DELETE',
    headers: customHeaders,
  });

  if (response.status === 204) { // Successfully deleted, no content
    return;
  }
  if (response.status === 401) {
    throw new AuthenticationError('User not authenticated');
  }
  if (!response.ok) {
    await handleApiError(response); // Will throw for other errors like 404, 500
  }
  // Should not happen for a successful DELETE with 204, but as a fallback:
  if (response.ok) return;

  throw new Error(`Failed to delete photo. Status: ${response.status}`);
}

/**
 * Updates the decision for a specific draft day.
 */
async function updateDraftDayDecision(
  draftDayId: string,
  decision: "merge" | "duplicate" | "skip" // Or your SkiDayUserAction type if defined globally
): Promise<UIDraftDay> { // Assuming backend returns the updated DraftDay object (UIDraftDay is from ski.ts)
  const response = await fetch(`${API_BASE_URL}/api/v1/draft_days/${draftDayId}`, {
    ...defaultFetchOptions, // For Content-Type: application/json
    method: 'PATCH',
    body: JSON.stringify({ draft_day: { decision: decision } }), // Backend expects { draft_day: { decision: ... } }
  });

  if (response.status === 401) {
    throw new AuthenticationError('User not authenticated');
  }
  if (!response.ok) {
    await handleApiError(response);
  }
  return await response.json() as UIDraftDay; // Or whatever your backend DraftDay type is named
}

/**
 * Commits the photo import, triggering backend processing of decisions.
 */
async function commitPhotoImport(importId: string): Promise<PhotoImport> {
  // The backend PhotoImportUpdateService is triggered by an update to photo_import.
  // It expects the photo_import to be in 'waiting?' state to start processing.
  // However, from the frontend, when the user hits "Save Import", the import is likely
  // in 'ready_for_review' or 'waiting' (if they made decisions without all photos processed).
  // We will PATCH to status: 'committed' to signify the user's intent to finalize.
  // The backend service will then take over, potentially moving through 'processing' to 'completed'.
  const response = await fetch(`${API_BASE_URL}${PHOTO_IMPORTS_API_PATH}/${importId}`, {
    ...defaultFetchOptions,
    method: 'PATCH',
    body: JSON.stringify({ photo_import: { status: 'committed' } }),
  });

  if (response.status === 401) {
    throw new AuthenticationError('User not authenticated');
  }
  if (!response.ok) {
    await handleApiError(response);
  }
  return await response.json() as PhotoImport; // Expects the updated PhotoImport object
}

// Future functions might include:
// - getPhotoImportDraftDays(importId: string): Promise<DraftDay[]>

export const photoImportService = {
  createPhotoImport,
  getPhotoImport,
  addPhotoToImport,
  updatePhotoInImport,
  deletePhotoFromImport,
  updateDraftDayDecision,
  commitPhotoImport,
};
