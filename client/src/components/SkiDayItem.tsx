import { format } from "date-fns";
// Assuming SkiDayEntry is the correct type, adjust if needed
import { type SkiDayEntry as SkiDay } from "@/types/ski";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface SkiDayItemProps {
  day: SkiDay;
}

export function SkiDayItem({ day }: SkiDayItemProps) {
  // Extract initials from resort name
  const initials = day.resort_name
    ? day.resort_name.split(' ').map(word => word[0]).join('')
    : '??';

  return (
    <div className="flex items-center gap-4 p-4">
      <Avatar className="h-20 w-20 rounded-lg shadow-md">
        <AvatarFallback className="bg-slate-100 text-slate-500 text-lg rounded-lg">
          {initials}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-slate-800 truncate">{day.resort_name}</div>
        <div className="text-sm text-slate-500">{format(new Date(day.date), 'MMM d, yyyy')}</div>
        <div className="text-sm text-slate-500 flex items-center gap-2 flex-wrap">
          {day.ski_name && <span>{day.ski_name}</span>}
          {day.ski_name && day.activity && <span className="w-1 h-1 bg-slate-300 rounded-full" />}
          {day.activity && <span>{day.activity}</span>}
        </div>
      </div>
    </div>
  );
}
