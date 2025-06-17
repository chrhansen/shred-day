import { ColumnConfig } from '@/components/ColumnSelector';
import { apiClient, API_BASE_URL } from '@/lib/apiClient';

export interface SeasonData {
  id: string; // Will be numeric like "0", "-1"
  day_count: number;
}

export interface CsvExportPageData {
  seasons: SeasonData[];
  columns: ColumnConfig[];
}

const getExportPageData = async (): Promise<CsvExportPageData> => {
  return apiClient.get<CsvExportPageData>('/api/v1/csv_export');
};

// Special handling for CSV download - need to use fetch directly to get blob
const downloadCsvFile = async (selectedSeasonIds: string[], columns: ColumnConfig[]): Promise<Blob> => {
  const response = await fetch(`${API_BASE_URL}/api/v1/csv_export`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'text/csv',
    },
    credentials: 'include',
    body: JSON.stringify({ season_ids: selectedSeasonIds, columns }),
  });
  
  if (!response.ok) {
    throw new Error(`Export failed with status ${response.status}`);
  }
  
  return await response.blob(); // Expecting a blob (the CSV file) from the server
};

export const csvExportService = {
  getExportPageData,
  downloadCsvFile,
};