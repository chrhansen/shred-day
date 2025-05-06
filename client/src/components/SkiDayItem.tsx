import { format } from "date-fns";
// Assuming SkiDayEntry is the correct type, adjust if needed
import { type SkiDayEntry as SkiDay } from "@/types/ski";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, MoreVertical } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface SkiDayItemProps {
  day: SkiDay;
  onDelete: (dayId: string) => void;
}

export function SkiDayItem({ day, onDelete }: SkiDayItemProps) {
  const navigate = useNavigate();

  // Extract initials from resort name
  const initials = day.resort_name
    ? day.resort_name.split(' ').map(word => word[0]).join('')
    : '??';

  const handleDeleteClick = () => {
    if (window.confirm(`Are you sure you want to delete the entry for ${day.resort_name} on ${format(new Date(day.date.replace(/-/g, '/')), 'MMM d, yyyy')}?`)) {
      onDelete(day.id);
    }
  };

  return (
    <div
      className="flex items-center gap-3 pb-3 pt-3"
      data-testid={`ski-day-item-${day.id}`}
    >
      <Avatar className="h-24 w-24 rounded-sm shadow-md flex-shrink-0">
        {day.photos && day.photos.length > 0 ? (
          <img
            src={day.photos[0].preview_url}
            alt={`${day.resort_name} photo`}
            className="h-full w-full object-cover rounded-sm"
          />
        ) : (
          <AvatarFallback className="bg-slate-100 text-slate-500 text-lg rounded-sm">
            {initials}
          </AvatarFallback>
        )}
      </Avatar>
      <div className="flex-1 min-w-0 ml-1">
        <div className="text-lg font-medium text-slate-800 truncate">{day.resort_name}</div>
        <div className="text-base text-slate-500">{format(new Date(day.date.replace(/-/g, '/')), 'MMM d, yyyy')}</div>
        <div className="text-base text-slate-500 flex items-center gap-2 flex-wrap">
          {day.ski_name && <span>{day.ski_name}</span>}
          {day.ski_name && day.activity && <span className="w-1 h-1 bg-slate-300 rounded-full" />}
          {day.activity && <span>{day.activity}</span>}
        </div>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full h-8 w-8 flex-shrink-0"
            data-testid={`edit-day-${day.id}`}
          >
            <MoreVertical className="h-4 w-4" />
            <span className="sr-only">Actions</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => navigate(`/days/${day.id}/edit`)}>
            <Pencil className="mr-2 h-4 w-4" />
            <span>Edit</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={handleDeleteClick}
            className="text-red-600 focus:text-red-700 focus:bg-red-50"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            <span>Delete</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
