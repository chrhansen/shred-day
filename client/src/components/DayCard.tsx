import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { SkiDayEntry } from '@/types/ski';
import { Calendar, MapPin, MountainSnow, Users } from 'lucide-react'; // Example icons
import { format } from 'date-fns'; // For date formatting

interface DayCardProps {
  day: SkiDayEntry;
}

export const DayCard: React.FC<DayCardProps> = ({ day }) => {
  // Basic date formatting, adjust as needed
  const formattedDate = format(new Date(day.date), 'PPP'); // e.g., Sep 21st, 2024

  return (
    <Card className="overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
      <CardContent className="p-0 flex">
        {/* Image Placeholder */}
        <div className="w-24 h-full bg-slate-200 flex items-center justify-center flex-shrink-0">
          <MountainSnow className="h-10 w-10 text-slate-400" />
        </div>
        {/* Details */}
        <div className="p-4 space-y-1 flex-grow">
          <div className="flex items-center text-sm text-slate-600 mb-1">
            <Calendar className="h-4 w-4 mr-1.5 flex-shrink-0" />
            <span>{formattedDate}</span>
          </div>
          <h3 className="text-lg font-semibold text-slate-800 truncate" title={day.resort_name}> {day.resort_name}</h3>
          <div className="flex items-center text-sm text-slate-500">
            <MapPin className="h-3.5 w-3.5 mr-1.5 flex-shrink-0" />
            <span className="truncate" title={day.ski_names.join(', ')}>
              {day.ski_names.join(', ')}
            </span>
          </div>
          {day.labels && day.labels.length > 0 && (
            <div className="flex items-center text-sm text-slate-500">
              <Users className="h-3.5 w-3.5 mr-1.5 flex-shrink-0" />
              <span>{day.labels.map((label) => label.name).join(', ')}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
