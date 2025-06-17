import { apiClient } from '@/lib/apiClient';
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
  return apiClient.post<TextImport>(TEXT_IMPORTS_API_PATH);
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

  return apiClient.uploadFormData<TextImport>(TEXT_IMPORTS_API_PATH, formData);
}

/**
 * Fetches details of a specific text import session.
 */
async function getTextImport(importId: string): Promise<TextImport> {
  return apiClient.get<TextImport>(`${TEXT_IMPORTS_API_PATH}/${importId}`);
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

  return apiClient.uploadFormData<TextImport>(`${TEXT_IMPORTS_API_PATH}/${importId}/process`, formData);
}

/**
 * Updates the decision for a specific draft day.
 */
async function updateDraftDayDecision(
  draftDayId: string,
  decision: "merge" | "duplicate" | "skip"
): Promise<DraftDay> {
  return apiClient.patch<DraftDay>(`/api/v1/draft_days/${draftDayId}`, { draft_day: { decision } });
}

/**
 * Updates a draft day's details (date, resort).
 */
async function updateDraftDay(
  draftDayId: string,
  updates: { date?: string; resort_id?: string }
): Promise<DraftDay> {
  return apiClient.patch<DraftDay>(`/api/v1/draft_days/${draftDayId}`, { draft_day: updates });
}

/**
 * Commits the text import, triggering backend processing of decisions.
 */
async function commitTextImport(importId: string): Promise<TextImport> {
  return apiClient.patch<TextImport>(`${TEXT_IMPORTS_API_PATH}/${importId}`, { text_import: { status: 'committed' } });
}

/**
 * Cancels and deletes a text import session.
 */
async function cancelTextImport(importId: string): Promise<void> {
  await apiClient.delete(`${TEXT_IMPORTS_API_PATH}/${importId}`);
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