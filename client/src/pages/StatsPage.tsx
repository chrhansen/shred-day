import Navbar from "@/components/Navbar";
import PageMeta from "@/components/PageMeta";
import { Logo } from "@/components/Logo";
import { SeasonSelector } from "@/components/dashboard/SeasonSelector";
import { SeasonStatsCard } from "@/components/dashboard/SeasonStatsCard";
import { DaysPerMonthChart } from "@/components/dashboard/DaysPerMonthChart";
import { ResortMap } from "@/components/dashboard/ResortMap";
import { TopResortsCard } from "@/components/dashboard/TopResortsCard";
import { TagsBreakdownChart } from "@/components/dashboard/TagsBreakdownChart";
import { SkisUsageCard } from "@/components/dashboard/SkisUsageCard";
import { useAuth } from "@/contexts/AuthContext";
import { dashboardService } from "@/services/dashboardService";
import { getSeasonDateObjects } from "@/utils/seasonFormatters";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

export default function StatsPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const seasonStartDay = user?.season_start_day || "09-01";
  const availableSeasonOffsets = user?.available_seasons || [0];

  const [selectedSeason, setSelectedSeason] = useState<string>(() => {
    const seasonParam = searchParams.get("season");
    if (seasonParam === null) return "0";
    const n = Number.parseInt(seasonParam, 10);
    return Number.isNaN(n) ? "0" : n.toString();
  });

  useEffect(() => {
    const seasonParam = searchParams.get("season");
    const n = seasonParam === null ? 0 : Number.parseInt(seasonParam, 10);
    const next = Number.isNaN(n) ? "0" : n.toString();
    if (next !== selectedSeason) setSelectedSeason(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const seasons = useMemo(() => {
    return availableSeasonOffsets.map((offset) => {
      const { startDate, endDate } = getSeasonDateObjects(offset, seasonStartDay);
      const startYear = startDate.getFullYear();
      const endYear = endDate.getFullYear();
      return {
        value: offset.toString(),
        label: `${startYear}/${String(endYear).slice(-2)} Season`,
      };
    });
  }, [availableSeasonOffsets, seasonStartDay]);

  const selectedSeasonOffset = Number.parseInt(selectedSeason, 10) || 0;

  const { data: dashboard, isLoading } = useQuery({
    queryKey: ["dashboard", selectedSeasonOffset],
    queryFn: () => dashboardService.getSeasonDashboard(selectedSeasonOffset),
    enabled: !!user,
  });

  const handleSeasonChange = (seasonValue: string) => {
    setSelectedSeason(seasonValue);

    const n = Number.parseInt(seasonValue, 10);
    if (Number.isNaN(n) || n === 0) {
      searchParams.delete("season");
      setSearchParams(searchParams, { replace: true });
      return;
    }

    searchParams.set("season", seasonValue);
    setSearchParams(searchParams, { replace: true });
  };

  const seasonStartMonthIndex = (() => {
    const [mm] = seasonStartDay.split("-");
    const m = Number.parseInt(mm, 10);
    return Number.isNaN(m) ? 8 : Math.min(Math.max(m - 1, 0), 11);
  })();

  return (
    <>
      <PageMeta title="Stats · Shred Day" description="Review your ski stats and trends." />

      <div className="min-h-screen bg-slate-50 pb-8">
        <Navbar
          centerContent={<Logo className="justify-center gap-2" />}
          rightContent={
            <SeasonSelector
              seasons={seasons}
              selectedSeason={selectedSeason}
              onSeasonChange={handleSeasonChange}
            />
          }
        />

        <div className="max-w-md mx-auto px-4 pt-4 space-y-4">
          <SeasonStatsCard
            totalDays={isLoading ? 0 : dashboard?.summary.totalDays ?? 0}
            uniqueResorts={isLoading ? 0 : dashboard?.summary.uniqueResorts ?? 0}
            currentStreak={isLoading ? 0 : dashboard?.summary.currentStreak ?? 0}
            seasonGoalDays={isLoading ? 50 : dashboard?.summary.seasonGoalDays ?? 50}
          />

          <DaysPerMonthChart
            data={dashboard?.daysPerMonth ?? []}
            seasonStartMonth={seasonStartMonthIndex}
          />

          <ResortMap resorts={dashboard?.resorts ?? []} />

          <TopResortsCard
            resorts={(dashboard?.resorts ?? []).map((r) => ({
              name: r.name,
              country: r.country,
              days: r.daysSkied,
            }))}
          />

          <TagsBreakdownChart data={dashboard?.tags ?? []} />

          <SkisUsageCard skis={dashboard?.skis ?? []} />
        </div>
      </div>
    </>
  );
}

