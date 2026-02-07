import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SwatchBook } from "lucide-react";

type SkiUsage = {
  name: string;
  days: number;
};

type SkisUsageCardProps = {
  skis: SkiUsage[];
};

export function SkisUsageCard({ skis }: SkisUsageCardProps) {
  const totalDays = skis.reduce((sum, s) => sum + s.days, 0);
  const colors = [
    "#4f46e5",
    "#06b6d4",
    "#8b5cf6",
    "#f59e0b",
    "#10b981",
    "#f43f5e",
  ];

  if (skis.length === 0 || totalDays === 0) {
    return (
      <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-slate-50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold text-slate-700 flex items-center gap-2">
            <SwatchBook className="h-4 w-4 text-indigo-500" />
            Skis Used
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-sm text-slate-500 text-center py-4">
            No skis logged yet
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-slate-50">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-slate-700 flex items-center gap-2">
          <SwatchBook className="h-4 w-4 text-indigo-500" />
          Skis Used
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        <div className="h-6 flex rounded-full overflow-hidden">
          {skis.map((ski, index) => (
            <div
              key={ski.name}
              className="h-full transition-all"
              style={{
                width: `${(ski.days / totalDays) * 100}%`,
                backgroundColor: colors[index % colors.length],
              }}
              title={`${ski.name}: ${ski.days} days`}
            />
          ))}
        </div>

        <div className="space-y-1.5">
          {skis.map((ski, index) => (
            <div key={ski.name} className="flex items-center gap-2">
              <div
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: colors[index % colors.length] }}
              />
              <span className="text-xs text-slate-700 flex-1 truncate">
                {ski.name}
              </span>
              <span className="text-xs text-slate-500 font-medium">
                {ski.days} days
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
