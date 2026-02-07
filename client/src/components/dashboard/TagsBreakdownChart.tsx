import { Pie, PieChart, Cell, Legend, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tags } from "lucide-react";

type TagDatum = {
  name: string;
  count: number;
};

type TagsBreakdownChartProps = {
  data: TagDatum[];
  maxVisible?: number;
};

const COLORS = [
  "#4f46e5",
  "#06b6d4",
  "#8b5cf6",
  "#f59e0b",
  "#10b981",
  "#94a3b8",
];

function processTagsData(data: TagDatum[], maxVisible: number): TagDatum[] {
  if (data.length <= maxVisible) return data;

  const sorted = [...data].sort((a, b) => b.count - a.count);
  const top = sorted.slice(0, maxVisible);
  const rest = sorted.slice(maxVisible);

  if (rest.length > 0) {
    top.push({
      name: "Other",
      count: rest.reduce((sum, t) => sum + t.count, 0),
    });
  }

  return top;
}

export function TagsBreakdownChart({
  data,
  maxVisible = 5,
}: TagsBreakdownChartProps) {
  const processed = processTagsData(data, maxVisible);
  const total = processed.reduce((sum, d) => sum + d.count, 0);

  if (total === 0) {
    return (
      <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-slate-50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold text-slate-700 flex items-center gap-2">
            <Tags className="h-4 w-4 text-indigo-500" />
            Top Tags
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-sm text-slate-500 text-center py-8">
            No tags used yet
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-slate-50">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-slate-700 flex items-center gap-2">
          <Tags className="h-4 w-4 text-indigo-500" />
          Top Tags
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="h-[160px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={processed}
                cx="50%"
                cy="50%"
                innerRadius={35}
                outerRadius={55}
                paddingAngle={3}
                dataKey="count"
              >
                {processed.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Legend
                layout="vertical"
                align="right"
                verticalAlign="middle"
                formatter={(value, entry) => {
                  const maybePayload = (entry as unknown as { payload?: { count?: number } })
                    .payload;
                  const count =
                    typeof maybePayload?.count === "number" ? maybePayload.count : 0;

                  return (
                    <span className="text-xs text-slate-600">
                      {value} ({Math.round((count / total) * 100)}%)
                    </span>
                  );
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
