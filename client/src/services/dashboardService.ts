import { apiClient } from "@/lib/apiClient";
import type { SeasonDashboard } from "@/types/dashboard";

export const dashboardService = {
  async getSeasonDashboard(seasonOffset: number): Promise<SeasonDashboard> {
    return apiClient.get<SeasonDashboard>("/api/v1/dashboard", {
      season: seasonOffset === 0 ? undefined : seasonOffset,
    });
  },
};
