import { RefreshControl, ScrollView, View } from "react-native";
import { useRef } from "react";
import { router, useScrollToTop } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../../contexts/auth";
import { useSeason } from "../../contexts/season";
import { SeasonHeader } from "../../components/season-picker";
import { Button, EmptyState, Notice, Skeleton, colors } from "../../components/ui";
import { SeasonTotal } from "../../components/stats/season-total";
import { MonthBars } from "../../components/stats/month-bars";
import { TopResorts, TagDonut, SkiUsage } from "../../components/stats/breakdowns";
import { ResortMapCard } from "../../components/stats/resort-map-card";
import { seasonMonths } from "../../lib/season-charts";
import { shred } from "../../services/shred";
import type { SeasonStats } from "../../lib/types";
import { radius } from "../../theme";

export default function StatsScreen() {
  const scroll = useRef<ScrollView>(null);
  useScrollToTop(scroll);
  const { user } = useAuth();
  const { season, setSeason } = useSeason();
  const query = useQuery({ queryKey: ["stats", season, user?.id], queryFn: () => shred.stats(season), enabled: Boolean(user) });
  return <View style={{ flex: 1, backgroundColor: colors.surfaceSubtle }}>
    <SeasonHeader value={season} onChange={setSeason} />
    <ScrollView ref={scroll} contentContainerStyle={{ padding: 16, paddingBottom: 24, gap: 14 }}
      refreshControl={<RefreshControl tintColor={colors.primary} refreshing={query.isRefetching}
        onRefresh={() => void query.refetch()} />}>
      {query.isPending && <View accessibilityLabel="Loading your season" accessibilityRole="progressbar" style={{ gap: 14 }}>
        <Skeleton height={108} borderRadius={radius.xl} />
        <Skeleton height={248} borderRadius={radius.xl} />
        <Skeleton height={280} borderRadius={radius.xl} />
      </View>}
      {query.error && <Notice title="Couldn't load your season" error={query.error} onRetry={() => void query.refetch()} />}
      {query.data && (query.data.summary.totalDays ? <SeasonCharts key={`${user?.id}-${season}`} stats={query.data} />
        : <EmptyState icon="chart" title="No stats for this season"
          description="Log a day and your totals, months, resorts and gear will show up here."
          action={<Button variant="pill" icon="plus" title="Log a Day" onPress={() => router.push("/log")} />} />)}
    </ScrollView>
  </View>;
}
function SeasonCharts({ stats }: { stats: SeasonStats }) {
  return <>
    <SeasonTotal summary={stats.summary} />
    <MonthBars months={seasonMonths(stats.daysPerMonth, stats.season.startDate)} />
    <ResortMapCard resorts={stats.resorts} />
    <TopResorts resorts={stats.resorts} />
    <TagDonut tags={stats.tags} />
    <SkiUsage skis={stats.skis} />
  </>;
}
