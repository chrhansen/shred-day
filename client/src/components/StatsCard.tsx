
import { Card, CardContent } from "@/components/ui/card";

interface StatsCardProps {
  label: string;
  value: string | number;
}

export function StatsCard({ label, value }: StatsCardProps) {
  return (
    <Card className="overflow-hidden bg-gradient-to-br from-white to-slate-50 shadow-lg border-0 transition-all hover:shadow-xl">
      <CardContent className="p-6">
        <p className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
          {value}
        </p>
        <p className="text-sm font-medium text-slate-500 mt-2">{label}</p>
      </CardContent>
    </Card>
  );
}
