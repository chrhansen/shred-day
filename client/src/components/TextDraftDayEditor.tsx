import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar, Loader2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, parseISO } from "date-fns";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { type DraftDay } from "@/types/ski";
import { resortService, type Resort } from "@/services/resortService";
import debounce from 'lodash.debounce';
import { toast } from "sonner";
import { ResortSearchDropdown } from "@/components/ResortSearchDropdown";

interface TextDraftDayEditorProps {
  day: DraftDay;
  onSave: (updatedDay: Partial<DraftDay>) => void;
  onCancel: () => void;
}

export function TextDraftDayEditor({ day, onSave, onCancel }: TextDraftDayEditorProps) {
  const [resortName, setResortName] = useState(day.resort?.name || "");
  const [selectedResortId, setSelectedResortId] = useState<string | null>(day.resort?.id || null);
  const [date, setDate] = useState<Date>(parseISO(day.date));
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  
  // Resort search states
  const [resortSearchQuery, setResortSearchQuery] = useState("");
  const [resortSearchResults, setResortSearchResults] = useState<Resort[]>([]);
  const [isSearchingResorts, setIsSearchingResorts] = useState(false);
  const [showResortSearchResults, setShowResortSearchResults] = useState(false);
  const [activeSearchIndex, setActiveSearchIndex] = useState(-1);

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
    setResortName(newName);
    setActiveSearchIndex(-1);
    if (newName === "") {
      setSelectedResortId(null);
      setShowResortSearchResults(false);
    } else {
      setResortSearchQuery(newName);
    }
  };

  const handleSelectResort = (resort: Resort) => {
    setResortName(resort.name);
    setSelectedResortId(resort.id);
    setResortSearchResults([]);
    setShowResortSearchResults(false);
    setResortSearchQuery("");
    setActiveSearchIndex(-1);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Only create a resort object if we have a selected resort from search
    const resort: Resort | undefined = selectedResortId && resortSearchResults.length === 0 ? {
      id: selectedResortId,
      name: resortName,
      country: day.resort?.country || "",
      region: day.resort?.region || "",
      latitude: day.resort?.latitude || 0,
      longitude: day.resort?.longitude || 0,
      created_at: day.resort?.created_at || "",
      updated_at: day.resort?.updated_at || ""
    } : resortSearchResults.find(r => r.id === selectedResortId) || (selectedResortId ? day.resort : undefined);

    onSave({
      resort,
      date: format(date, 'yyyy-MM-dd')
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="relative space-y-2">
        <label htmlFor="resort" className="block text-sm font-medium text-slate-700">
          Resort Name
        </label>
        <div className="relative">
          <Input
            id="resort"
            value={resortName}
            onChange={handleResortInputChange}
            onFocus={() => resortSearchQuery && resortSearchResults.length > 0 && setShowResortSearchResults(true)}
            placeholder="Type to search resorts..."
            className="w-full"
            data-testid="resort-search-input"
          />
          {isSearchingResorts && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 animate-spin" />}
        </div>
        <ResortSearchDropdown
          results={resortSearchResults}
          isVisible={showResortSearchResults}
          onSelect={handleSelectResort}
          onClose={() => setShowResortSearchResults(false)}
          activeIndex={activeSearchIndex}
          onActiveIndexChange={setActiveSearchIndex}
        />
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-slate-700">
          Date
        </label>
        <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="w-full justify-start text-left font-normal"
            >
              <Calendar className="mr-2 h-4 w-4" />
              {format(date, "PPP")}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <CalendarComponent
              mode="single"
              selected={date}
              onSelect={(newDate) => {
                if (newDate) {
                  setDate(newDate);
                  setIsDatePickerOpen(false);
                }
              }}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      {day.original_text && (
        <div className="bg-slate-50 rounded p-3 text-sm text-slate-600">
          <span className="font-medium">Original text:</span> {day.original_text}
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button 
          type="submit"
          size="sm"
          className="text-sm bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md transition-all hover:shadow-lg"
        >
          Save Changes
        </Button>
      </div>
    </form>
  );
}
