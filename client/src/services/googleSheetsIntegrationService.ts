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
    const response = await apiClient.get<{ integration?: GoogleSheetIntegrationStatus; connected?: boolean }>("/api/v1/google_sheet_integration");
    if (response.integration) return response.integration;
    return { connected: response.connected ?? false };
  },

  async startConnect(): Promise<{ url: string }> {
    return apiClient.post<{ url: string }>("/api/v1/google_sheet_integration");
  },

  async completeConnect(code: string, state: string): Promise<GoogleSheetIntegrationStatus> {
    const response = await apiClient.patch<{ integration: GoogleSheetIntegrationStatus }>("/api/v1/google_sheet_integration", { code, state });
    return response.integration;
  },

  async disconnect(): Promise<void> {
    await apiClient.delete("/api/v1/google_sheet_integration");
  },
};
