import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  type TooltipProps,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type MonthDatum = {
  month: string; // "Jan", "Feb", ...
  days: number;
};

type DaysPerMonthChartProps = {
  data: MonthDatum[];
  seasonStartMonth?: number; // 0-11, default Sep (8)
};

function generateSeasonData(data: MonthDatum[], seasonStartMonth: number): Array<{
  month: string;
  fullMonth: string;
  days: number;
}> {
  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const fullMonthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const byMonth = new Map(data.map((d) => [d.month, d.days]));
  const seasonMonths = [];

  for (let i = 0; i < 12; i++) {
    const monthIndex = (seasonStartMonth + i) % 12;
    const monthAbbr = monthNames[monthIndex];
    seasonMonths.push({
      month: monthAbbr,
      fullMonth: fullMonthNames[monthIndex],
      days: byMonth.get(monthAbbr) ?? 0,
    });
  }

  return seasonMonths;
}

type SeasonPoint = { month: string; fullMonth: string; days: number };

function CustomTooltip({ active, payload }: TooltipProps<number, string>) {
  if (active && payload && payload.length) {
    const d = payload[0]?.payload as SeasonPoint | undefined;
    if (!d) return null;
    return (
      <div className="bg-slate-800 text-white px-3 py-2 rounded-lg shadow-lg text-sm">
        <p className="font-medium">{d.fullMonth}</p>
        <p className="text-slate-300">
          {d.days} {d.days === 1 ? "day" : "days"}
        </p>
      </div>
    );
  }
  return null;
}

export function DaysPerMonthChart({
  data,
  seasonStartMonth = 8,
}: DaysPerMonthChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const seasonData = useMemo(
    () => generateSeasonData(data, seasonStartMonth),
    [data, seasonStartMonth]
  );
  const maxDays = Math.max(0, ...seasonData.map((d) => d.days));

  return (
    <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-slate-50">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-slate-700">
          Days Per Month
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="h-[180px] -ml-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={seasonData}
              margin={{ top: 8, right: 8, left: -20, bottom: 0 }}
              onMouseLeave={() => setActiveIndex(null)}
            >
              <XAxis
                dataKey="month"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: "#64748b" }}
                interval={0}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: "#64748b" }}
                allowDecimals={false}
              />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{ fill: "rgba(79, 70, 229, 0.1)" }}
              />
              <Bar
                dataKey="days"
                radius={[4, 4, 0, 0]}
                onMouseEnter={(_, index) => setActiveIndex(index)}
                style={{ cursor: "pointer" }}
              >
                {seasonData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={
                      activeIndex === index
                        ? "#3730a3"
                        : entry.days === maxDays && maxDays > 0
                          ? "#4f46e5"
                          : entry.days > 0
                            ? "#a5b4fc"
                            : "#e2e8f0"
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
