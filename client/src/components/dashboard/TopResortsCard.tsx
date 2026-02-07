import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mountain } from "lucide-react";

type ResortStat = {
  name: string;
  days: number;
  country: string;
};

type TopResortsCardProps = {
  resorts: ResortStat[];
};

export function TopResortsCard({ resorts }: TopResortsCardProps) {
  const maxDays = Math.max(1, ...resorts.map((r) => r.days));

  return (
    <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-slate-50">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-slate-700 flex items-center gap-2">
          <Mountain className="h-4 w-4 text-indigo-500" />
          Top Resorts
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        {resorts.slice(0, 5).map((resort, index) => (
          <div key={`${resort.name}-${resort.country}`} className="flex items-center gap-3">
            <span className="text-sm font-bold text-indigo-500 w-5">
              {index + 1}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline justify-between mb-1">
                <span className="text-sm font-medium text-slate-700 truncate">
                  {resort.name}
                </span>
                <span className="text-xs text-slate-500 ml-2">
                  {resort.days}d
                </span>
              </div>
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-blue-500 rounded-full transition-all"
                  style={{ width: `${(resort.days / maxDays) * 100}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

