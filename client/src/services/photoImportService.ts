import { apiClient } from '@/lib/apiClient';
import { type PhotoImport, type DraftDay as UIDraftDay } from '@/types/ski';
import type { PhotoUploadResponse } from '@/types/api';

const PHOTO_IMPORTS_API_PATH = '/api/v1/photo_imports';

/**
 * Creates a new photo import session on the server.
 */
async function createPhotoImport(): Promise<PhotoImport> {
  return apiClient.post<PhotoImport>(PHOTO_IMPORTS_API_PATH);
}

/**
 * Fetches details of a specific photo import session.
 */
async function getPhotoImport(importId: string): Promise<PhotoImport> {
  return apiClient.get<PhotoImport>(`${PHOTO_IMPORTS_API_PATH}/${importId}`);
}

/**
 * Uploads a photo and associates it with a specific photo import session.
 */
async function addPhotoToImport(importId: string, file: File): Promise<{ id: string; preview_url: string | null; full_url: string; filename: string | null }> {
  const formData = new FormData();
  formData.append('file', file);
  return apiClient.uploadFormData(`${PHOTO_IMPORTS_API_PATH}/${importId}/photos`, formData);
}

/**
 * Updates a photo within a specific photo import session.
 */
async function updatePhotoInImport(
  importId: string,
  photoId: string,
  updateData: { taken_at?: string; resort_id?: string }
): Promise<PhotoUploadResponse> {
  return apiClient.patch(`${PHOTO_IMPORTS_API_PATH}/${importId}/photos/${photoId}`, { photo: updateData });
}

/**
 * Deletes a photo from a specific photo import session.
 */
async function deletePhotoFromImport(importId: string, photoId: string): Promise<void> {
  await apiClient.delete(`${PHOTO_IMPORTS_API_PATH}/${importId}/photos/${photoId}`);
}

/**
 * Updates the decision for a specific draft day.
 */
async function updateDraftDayDecision(
  draftDayId: string,
  decision: "merge" | "duplicate" | "skip"
): Promise<UIDraftDay> {
  return apiClient.patch<UIDraftDay>(`/api/v1/draft_days/${draftDayId}`, { draft_day: { decision } });
}

/**
 * Commits the photo import, triggering backend processing of decisions.
 */
async function commitPhotoImport(importId: string): Promise<PhotoImport> {
  return apiClient.patch<PhotoImport>(`${PHOTO_IMPORTS_API_PATH}/${importId}`, { photo_import: { status: 'committed' } });
}

/**
 * Cancels and deletes a photo import session.
 */
async function cancelPhotoImport(importId: string): Promise<void> {
  await apiClient.delete(`${PHOTO_IMPORTS_API_PATH}/${importId}`);
}

export const photoImportService = {
  createPhotoImport,
  getPhotoImport,
  addPhotoToImport,
  updatePhotoInImport,
  deletePhotoFromImport,
  updateDraftDayDecision,
  commitPhotoImport,
  cancelPhotoImport,
};