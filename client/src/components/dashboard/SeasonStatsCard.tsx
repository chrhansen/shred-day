import { Card, CardContent } from "@/components/ui/card";
import { Flame, Target, TrendingUp } from "lucide-react";

type SeasonStatsCardProps = {
  totalDays: number;
  uniqueResorts: number;
  currentStreak: number;
  seasonGoalDays: number;
};

export function SeasonStatsCard({
  totalDays,
  uniqueResorts,
  currentStreak,
  seasonGoalDays,
}: SeasonStatsCardProps) {
  const safeGoal = Math.max(seasonGoalDays, 1);
  const progress = Math.min((totalDays / safeGoal) * 100, 100);

  return (
    <Card className="border-0 shadow-lg bg-gradient-to-br from-indigo-600 to-blue-600 text-white">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
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
              <span className="text-sm" data-testid="current-streak-value">
                {currentStreak} day streak
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1">
              <Target className="h-3 w-3" />
              <span>Season Goal</span>
            </div>
            <span data-testid="season-goal-value">
              {totalDays}/{seasonGoalDays}
            </span>
          </div>
          <div className="h-2 bg-indigo-800/50 rounded-full overflow-hidden">
            <div
              className="h-full bg-white/90 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
