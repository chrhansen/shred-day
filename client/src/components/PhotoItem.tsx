import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { Calendar, Edit as EditIcon, Trash2, Search, Loader2, X as XIcon, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { type SkiPhoto } from "@/types/ski";
import { resortService, type Resort } from "@/services/resortService";
import debounce from 'lodash.debounce';
import { toast } from "sonner";

interface PhotoItemProps {
  photo: SkiPhoto;
  onUpdate: (id: string, updates: { date?: Date | null; resortId?: string | null; resortName?: string | null }) => void;
  onDeletePhoto?: (photoId: string) => void;
}

export function PhotoItem({ photo, onUpdate, onDeletePhoto }: PhotoItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedResortName, setEditedResortName] = useState(photo.resort || "");
  const [selectedResortId, setSelectedResortId] = useState<string | null>(photo.originalResortId || null);
  const [editedDate, setEditedDate] = useState<Date | null>(photo.date ? new Date(photo.date) : null);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  // State for the calendar's currently displayed month
  const [displayedCalendarMonth, setDisplayedCalendarMonth] = useState<Date>( // Initialize to photo's date month or today
    photo.date ? new Date(photo.date) : new Date()
  );

  const [resortSearchQuery, setResortSearchQuery] = useState("");
  const [resortSearchResults, setResortSearchResults] = useState<Resort[]>([]);
  const [isSearchingResorts, setIsSearchingResorts] = useState(false);
  const [showResortSearchResults, setShowResortSearchResults] = useState(false);

  const debouncedResortSearch = useCallback(
    debounce(async (query: string) => {
      if (query.length < 2) {
        setResortSearchResults([]);
        setIsSearchingResorts(false);
        setShowResortSearchResults(false);
        return;
      }
      setIsSearchingResorts(true);
      try {
        const results = await resortService.searchResorts(query);
        setResortSearchResults(results);
        setShowResortSearchResults(true);
      } catch (error) {
        toast.error("Failed to search resorts");
        setResortSearchResults([]);
      } finally {
        setIsSearchingResorts(false);
      }
    }, 300),
    []
  );

  useEffect(() => {
    if (resortSearchQuery) {
      debouncedResortSearch(resortSearchQuery);
    }
    return () => debouncedResortSearch.cancel();
  }, [resortSearchQuery, debouncedResortSearch]);

  const handleResortInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    setEditedResortName(newName);
    if (newName === "") {
        setSelectedResortId(null);
        setShowResortSearchResults(false);
    } else {
        setResortSearchQuery(newName);
    }
  };

  const handleSelectResort = (resort: Resort) => {
    setEditedResortName(resort.name);
    setSelectedResortId(resort.id);
    setResortSearchResults([]);
    setShowResortSearchResults(false);
    setResortSearchQuery("");
  };

  const handleSave = () => {
    let finalResortId = selectedResortId;
    if (editedResortName && !finalResortId && editedResortName !== photo.resort) {
        finalResortId = null;
    } else if (!editedResortName) {
        finalResortId = null;
    }

    onUpdate(photo.id, {
      resortId: finalResortId,
      resortName: editedResortName,
      date: editedDate,
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedResortName(photo.resort || "");
    setSelectedResortId(photo.originalResortId || null);
    const initialDate = photo.date ? new Date(photo.date) : null;
    setEditedDate(initialDate);
    setDisplayedCalendarMonth(initialDate || new Date()); // Reset displayed month on cancel
    setIsEditing(false);
    setResortSearchQuery("");
    setResortSearchResults([]);
    setShowResortSearchResults(false);
  };

  useEffect(() => {
    if (!isEditing) {
        setEditedResortName(photo.resort || "");
        setSelectedResortId(photo.originalResortId || null);
        const initialDate = photo.date ? new Date(photo.date) : null;
        setEditedDate(initialDate);
        setDisplayedCalendarMonth(initialDate || new Date()); // Sync displayed month when photo prop changes
    }
  }, [photo, isEditing]);

  // When a date is selected, update the displayed month to match
  const handleDateSelect = (selectedDate: Date | undefined | null) => {
    setEditedDate(selectedDate || null);
    if (selectedDate) {
      setDisplayedCalendarMonth(selectedDate);
    }
    setIsDatePickerOpen(false);
  }

  const handleDeleteClick = () => {
    if (onDeletePhoto && photo.serverId) {
      onDeletePhoto(photo.serverId);
    }
  };

  return (
    <div className="p-3 border-b border-slate-100 flex flex-row gap-3 items-start">
      <div className="w-24 h-24 bg-slate-100 rounded-sm shadow-md overflow-hidden flex-shrink-0">
        <img
          src={photo.url}
          alt={`Photo from ${photo.resort}`}
          className="w-full h-full object-cover rounded-sm"
        />
      </div>

      <div className="flex-grow min-w-0" data-testid={`photo-processed-${photo.id}`}>
        {isEditing ? (
          <div className="space-y-3">
            <div className="relative">
              <label htmlFor={`resort-${photo.id}`} className="block text-sm font-medium text-slate-700 mb-1">
                Resort Name
              </label>
              <div className="relative">
                <Input
                  id={`resort-${photo.id}`}
                  value={editedResortName}
                  onChange={handleResortInputChange}
                  onFocus={() => resortSearchQuery && resortSearchResults.length > 0 && setShowResortSearchResults(true)}
                  placeholder="Type to search resorts..."
                  className="w-full"
                />
                {isSearchingResorts && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 animate-spin" />}
              </div>
              {showResortSearchResults && resortSearchResults.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                  {resortSearchResults.map((resort) => (
                    <button
                      key={resort.id}
                      className="block w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-100"
                      onClick={() => handleSelectResort(resort)}
                    >
                      {resort.name} <span className="text-xs text-slate-400">({resort.region}, {resort.country})</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Date
              </label>
              <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <Calendar className="mr-2 h-4 w-4" />
                    {editedDate ? format(editedDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={editedDate}
                    month={displayedCalendarMonth}
                    onMonthChange={setDisplayedCalendarMonth}
                    onSelect={handleDateSelect}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex justify-end gap-2 mt-2">
              <Button type="button" variant="ghost" onClick={handleCancel}>Cancel</Button>
              <Button type="button" onClick={handleSave}>Save Changes</Button>
            </div>
          </div>
        ) : (
          <>
            <h3 className="font-medium text-slate-800">
              {photo.resort || <span className="italic text-slate-500">No resort</span>}
            </h3>
            <p className="text-sm text-slate-600">
              {photo.date ? format(new Date(photo.date), "PPP") : <span className="italic text-slate-500">No date</span>}
            </p>
            <div className="flex gap-2 mt-2">
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-1 border-slate-200"
                data-testid={`photo-edit-button-${photo.id}`}
                onClick={() => setIsEditing(true)}
              >
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </Button>
              {onDeletePhoto && (
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-1 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                  data-testid={`photo-delete-button-${photo.id}`}
                  onClick={handleDeleteClick}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Image
                </Button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
