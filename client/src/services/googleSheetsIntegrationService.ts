import { apiClient } from "@/lib/apiClient";

export type GoogleSheetIntegrationStatus = {
  connected: boolean;
  status?: string;
  sheet_url?: string;
  last_error?: string | null;
  last_synced_at?: string | null;
};

export const googleSheetsIntegrationService = {
  async getStatus(): Promise<GoogleSheetIntegrationStatus> {
    return apiClient.get<GoogleSheetIntegrationStatus>("/api/v1/google_sheet_integration");
  },

  async startConnect(): Promise<{ url: string }> {
    return apiClient.post<{ url: string }>("/api/v1/google_sheet_integration");
  },

  async completeConnect(code: string, state: string): Promise<{ connected: boolean; sheet_url?: string }> {
    return apiClient.patch("/api/v1/google_sheet_integration", { code, state });
  },

  async disconnect(): Promise<void> {
    await apiClient.delete("/api/v1/google_sheet_integration");
  },
};
