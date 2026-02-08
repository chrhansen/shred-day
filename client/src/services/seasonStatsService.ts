import { apiClient } from "@/lib/apiClient";
import type { SeasonStats } from "@/types/seasonStats";

export const seasonStatsService = {
  async getSeasonStats(seasonOffset: number): Promise<SeasonStats> {
    return apiClient.get<SeasonStats>("/api/v1/stats", {
      season: seasonOffset === 0 ? undefined : seasonOffset,
    });
  },
};
