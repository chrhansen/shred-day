import Navbar from "@/components/Navbar";
import PageMeta from "@/components/PageMeta";
import { SeasonStatsCard } from "@/components/stats/SeasonStatsCard";
import { DaysPerMonthChart } from "@/components/stats/DaysPerMonthChart";
import { ResortMap } from "@/components/stats/ResortMap";
import { TopResortsCard } from "@/components/stats/TopResortsCard";
import { TagsBreakdownChart } from "@/components/stats/TagsBreakdownChart";
import { SkisUsageCard } from "@/components/stats/SkisUsageCard";
import SeasonDropdown from "@/components/SeasonDropdown";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { seasonStatsService } from "@/services/seasonStatsService";
import {
  getFormattedSeasonDateRange,
  getSeasonDisplayName,
} from "@/utils/seasonFormatters";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, Plus } from "lucide-react";

export default function StatsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const seasonStartDay = user?.season_start_day || "09-01";
  const availableSeasonOffsets = user?.available_seasons || [0];

  const [selectedSeason, setSelectedSeason] = useState<number>(() => {
    const seasonParam = searchParams.get("season");
    return seasonParam ? Number.parseInt(seasonParam, 10) : 0;
  });

  useEffect(() => {
    const currentSeasonParam = searchParams.get("season");
    const expectedParam = selectedSeason === 0 ? null : selectedSeason.toString();

    if (currentSeasonParam !== expectedParam) {
      if (expectedParam === null) {
        searchParams.delete("season");
      } else {
        searchParams.set("season", expectedParam);
      }
      setSearchParams(searchParams, { replace: true });
    }
  }, [selectedSeason, searchParams, setSearchParams]);

  useEffect(() => {
    const seasonParam = searchParams.get("season");
    const nextSeason = seasonParam ? Number.parseInt(seasonParam, 10) : 0;
    const next = Number.isNaN(nextSeason) ? 0 : nextSeason;
    if (next !== selectedSeason) setSelectedSeason(next);
  }, [searchParams, selectedSeason]);

  const selectedSeasonDisplayName = getSeasonDisplayName(selectedSeason);

  const seasonsDataForDropdown = useMemo(() => {
    return availableSeasonOffsets.map((offset) => {
      const displayName = getSeasonDisplayName(offset);
      const dateRange = getFormattedSeasonDateRange(offset, seasonStartDay);
      return { displayName, dateRange, value: offset.toString() };
    });
  }, [availableSeasonOffsets, seasonStartDay]);

  const { data: seasonStats, isLoading } = useQuery({
    queryKey: ["seasonStats", selectedSeason],
    queryFn: () => seasonStatsService.getSeasonStats(selectedSeason),
    enabled: !!user,
  });

  const handleSeasonChange = (seasonValue: string) => {
    const seasonNumber = Number.parseInt(seasonValue, 10);
    setSelectedSeason(Number.isNaN(seasonNumber) ? 0 : seasonNumber);
  };

  const seasonStartMonthIndex = (() => {
    const [mm] = seasonStartDay.split("-");
    const m = Number.parseInt(mm, 10);
    return Number.isNaN(m) ? 8 : Math.min(Math.max(m - 1, 0), 11);
  })();

  const newDayTarget = selectedSeason !== undefined ? `/new?season=${selectedSeason}` : "/new";

  const newDayButton = (
    <Button
      onClick={() => navigate(newDayTarget)}
      size="sm"
      className="text-sm bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md transition-all hover:shadow-lg"
    >
      <Plus className="mr-1.0 h-4 w-4" />
      New Day
    </Button>
  );

  return (
    <>
      <PageMeta title="Stats · Shred Day" description="Review your ski stats and trends." />

      <div className="min-h-screen bg-slate-50 pb-8">
        <Navbar
          rightContent={newDayButton}
          centerContent={
            !user ? (
              <Loader2 className="h-5 w-5 animate-spin text-slate-700" />
            ) : (
              <SeasonDropdown
                selectedSeason={selectedSeasonDisplayName}
                seasonsData={seasonsDataForDropdown}
                onSeasonChange={handleSeasonChange}
              />
            )
          }
        />

        <div className="max-w-md mx-auto px-4 pt-4 space-y-4">
          <SeasonStatsCard
            totalDays={isLoading ? 0 : seasonStats?.summary.totalDays ?? 0}
            uniqueResorts={isLoading ? 0 : seasonStats?.summary.uniqueResorts ?? 0}
            longestStreak={isLoading ? 0 : seasonStats?.summary.longestStreak ?? 0}
          />

          <DaysPerMonthChart
            data={seasonStats?.daysPerMonth ?? []}
            seasonStartMonth={seasonStartMonthIndex}
          />

          <ResortMap resorts={seasonStats?.resorts ?? []} />

          <TopResortsCard
            resorts={(seasonStats?.resorts ?? []).map((r) => ({
              name: r.name,
              country: r.country,
              days: r.daysSkied,
            }))}
          />

          <TagsBreakdownChart data={seasonStats?.tags ?? []} />

          <SkisUsageCard skis={seasonStats?.skis ?? []} />
        </div>
      </div>
    </>
  );
}
