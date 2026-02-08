import { Card, CardContent } from "@/components/ui/card";
import { Flame, TrendingUp } from "lucide-react";

type SeasonStatsCardProps = {
  totalDays: number;
  uniqueResorts: number;
  longestStreak: number;
};

export function SeasonStatsCard({
  totalDays,
  uniqueResorts,
  longestStreak,
}: SeasonStatsCardProps) {
  return (
    <Card className="border-0 shadow-lg bg-gradient-to-br from-indigo-600 to-blue-600 text-white">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-4xl font-bold" data-testid="days-skied-value">
              {totalDays}
            </p>
            <p className="text-sm text-indigo-200">days this season</p>
          </div>
          <div className="text-right space-y-1">
            <div className="flex items-center justify-end gap-1.5 text-indigo-200">
              <TrendingUp className="h-3.5 w-3.5" />
              <span className="text-sm" data-testid="resorts-visited-value">
                {uniqueResorts} resorts
              </span>
            </div>
            <div className="flex items-center justify-end gap-1.5 text-indigo-200">
              <Flame className="h-3.5 w-3.5" />
              <span className="text-sm" data-testid="longest-streak-value">
                {longestStreak} day longest streak
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
