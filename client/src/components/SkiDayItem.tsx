import { format, getYear } from "date-fns";
// Use SkiDayEntry for the list item, and SkiDayDetailType for the detailed view
import { type SkiDayEntry, type SkiDayDetail as SkiDayDetailType } from "@/types/ski";
import { SkiDayDetail } from "@/components/SkiDayDetail";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, MoreVertical, Camera } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useCallback } from "react";
import { skiService } from "@/services/skiService";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface SkiDayItemProps {
  day: SkiDayEntry;
  onDelete: (dayId: string) => void;
}

export function SkiDayItem({ day, onDelete }: SkiDayItemProps) {
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [detailedDayData, setDetailedDayData] = useState<SkiDayDetailType | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [errorLoadingDetail, setErrorLoadingDetail] = useState<string | null>(null);
  const navigate = useNavigate();

  const initials = day.resort_name
    ? day.resort_name.split(' ').map(word => word[0]).join('')
    : '??';

  const fetchSkiDayDetails = useCallback(async (dayId: string) => {
    if (!dayId) return;
    setIsLoadingDetail(true);
    setErrorLoadingDetail(null);
    try {
      const data = await skiService.getDay(dayId);
      setDetailedDayData(data);
    } catch (err) {
      console.error("Error fetching ski day details:", err);
      setErrorLoadingDetail(err instanceof Error ? err.message : "An unknown error occurred");
      setDetailedDayData(null); // Clear previous data on error
    } finally {
      setIsLoadingDetail(false);
    }
  }, []);

  const handleItemClick = () => {
    setIsDetailOpen(true);
    // Fetch details only if they haven't been fetched yet for this day, or if an error occurred previously
    // or if isDetailOpen was false (meaning we are re-opening)
    if (!detailedDayData || errorLoadingDetail || !isDetailOpen) {
      fetchSkiDayDetails(day.id);
    }
  };

  const handleCloseDetail = () => {
    setIsDetailOpen(false);
    // Reset detailedDayData and error states to ensure fresh data on next open
    setDetailedDayData(null);
    setErrorLoadingDetail(null);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent opening detail modal
    if (window.confirm(`Are you sure you want to delete the entry for ${day.resort_name} on ${format(new Date(day.date.replace(/-/g, '/')), 'MMM d, yyyy')}?`)) {
      onDelete(day.id);
    }
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent opening detail modal
    navigate(`/days/${day.id}/edit`);
  };

  const currentYear = getYear(new Date());
  const dayDate = new Date(day.date.replace(/-/g, '/'));
  const displayDate = getYear(dayDate) === currentYear
    ? format(dayDate, 'MMM d')
    : format(dayDate, 'MMM d, yyyy');

  return (
    <>
      <div
        className="flex items-start gap-3 pb-3 pt-3 cursor-pointer hover:bg-slate-50 transition-colors"
        data-testid={`ski-day-item-${day.id}`}
        onClick={handleItemClick}
      >
        <div className="relative h-24 w-24 flex-shrink-0">
          <Avatar className="h-full w-full rounded-sm shadow-md">
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
          {day.photos && day.photos.length > 1 && (
            <div className="absolute bottom-1 right-1 bg-black/30 text-white px-1.5 py-0.5 rounded text-xs font-medium flex items-center gap-0.5">
              <Camera className="h-3 w-3" />
              <span>{day.photos.length}</span>
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0 ml-1">
          <div className="text-lg font-medium text-slate-800 truncate leading-none -mt-0.5">{day.resort_name}</div>
          <div className="text-base text-slate-500 flex items-center gap-1.5">
            <span>#{day.day_number}</span> <span className="w-1 h-1 bg-slate-300 rounded-full" /> {displayDate}
          </div>
          <div className="text-base text-slate-500 flex items-center gap-2 flex-wrap">
            {day.ski_names && day.ski_names.length > 0 && <span>{day.ski_names.join('/')}</span>}
            {day.ski_names && day.ski_names.length > 0 && day.tag_names && day.tag_names.length > 0 && (
              <span className="w-1 h-1 bg-slate-300 rounded-full" />
            )}
            {day.tag_names && day.tag_names.length > 0 && (
              <span>{day.tag_names.join(', ')}</span>
            )}
          </div>
        </div>
        {/* Vertically stacked and right-aligned for actions menu */}
        <div className="ml-auto flex self-stretch items-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full h-8 w-8 flex-shrink-0 self-center"
                data-testid={`edit-day-${day.id}`}
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-4 w-4" />
                <span className="sr-only">Actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuItem onClick={handleEditClick}>
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
      </div>
      {isDetailOpen && (
        <SkiDayDetail
          day={detailedDayData}
          isOpen={isDetailOpen}
          onClose={handleCloseDetail}
          isLoading={isLoadingDetail}
          error={errorLoadingDetail}
        />
      )}
    </>
  );
}
