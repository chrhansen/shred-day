import { ColumnConfig } from '@/components/ColumnSelector';
import { API_BASE_URL, defaultFetchOptions, handleApiError } from './skiService'; // Import helpers

export interface SeasonData {
  id: string; // Will be numeric like "0", "-1"
  day_count: number;
}

export interface CsvExportPageData {
  seasons: SeasonData[];
  columns: ColumnConfig[];
}

const getExportPageData = async (): Promise<CsvExportPageData> => {
  const response = await fetch(`${API_BASE_URL}/api/v1/csv_export`, {
    ...defaultFetchOptions,
    method: 'GET',
  });
  if (!response.ok) await handleApiError(response);
  return await response.json();
};

// Placeholder for the actual export function
const downloadCsvFile = async (selectedSeasonIds: string[], columns: ColumnConfig[]): Promise<Blob> => {
  const response = await fetch(`${API_BASE_URL}/api/v1/csv_export`, {
    ...defaultFetchOptions,
    method: 'POST',
    body: JSON.stringify({ season_ids: selectedSeasonIds, columns }),
  });
  if (!response.ok) await handleApiError(response);
  return await response.blob(); // Expecting a blob (the CSV file) from the server
};

export const csvExportService = {
  getExportPageData,
  downloadCsvFile,
};
