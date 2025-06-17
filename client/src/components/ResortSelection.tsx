import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SelectionPill } from "@/components/SelectionPill";
import { ResortSearchDropdown } from "@/components/ResortSearchDropdown";
import { Loader2, Search, X } from "lucide-react";
import type { Resort } from "@/services/resortService";

interface ResortSelectionProps {
  selectedResort: Resort | null;
  recentResorts: Resort[] | undefined;
  isLoadingRecentResorts: boolean;
  isSearchingMode: boolean;
  resortQuery: string;
  searchResults: Resort[];
  isSearchingResorts: boolean;
  activeSearchIndex: number;
  isDisabled: boolean;
  onToggleRecent: (resort: Resort) => void;
  onSearchModeToggle: () => void;
  onQueryChange: (query: string) => void;
  onSelectFromSearch: (resort: Resort) => void;
  onSearchIndexChange: (index: number) => void;
}

export function ResortSelection({
  selectedResort,
  recentResorts,
  isLoadingRecentResorts,
  isSearchingMode,
  resortQuery,
  searchResults,
  isSearchingResorts,
  activeSearchIndex,
  isDisabled,
  onToggleRecent,
  onSearchModeToggle,
  onQueryChange,
  onSelectFromSearch,
  onSearchIndexChange,
}: ResortSelectionProps) {
  return (
    <div>
      <h2 className="text-lg font-medium text-slate-800 mb-4">Ski Resort</h2>
      <div className="flex flex-wrap gap-2 items-center">
        {isLoadingRecentResorts ? (
          <div className="flex items-center text-slate-500 w-full">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading recent...
          </div>
        ) : (
          recentResorts?.map((resort) => (
            <SelectionPill
              key={resort.id}
              label={resort.name}
              selected={selectedResort?.id === resort.id}
              onClick={() => onToggleRecent(resort)}
              disabled={isDisabled}
              data-testid={`recent-resort-${resort.name.toLowerCase().replace(/\s+/g, '-')}`}
            />
          ))
        )}
        
        {isSearchingMode ? (
          <div className="w-full mt-2">
            <div className="relative">
              <Input
                placeholder="Search for a resort..."
                value={resortQuery}
                onChange={(e) => onQueryChange(e.target.value)}
                disabled={isDisabled}
                autoFocus
                data-testid="resort-search-input"
                className="pr-10"
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={onSearchModeToggle}
                className="absolute right-1 top-1 h-7 w-7 p-0"
                disabled={isDisabled}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="relative">
              {searchResults.length > 0 ? (
                <ResortSearchDropdown
                  results={searchResults}
                  isVisible={true}
                  onSelect={onSelectFromSearch}
                  activeIndex={activeSearchIndex}
                  onActiveIndexChange={onSearchIndexChange}
                />
              ) : isSearchingResorts ? (
                <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg">
                  <p className="text-sm text-slate-500 px-4 py-2">Searching...</p>
                </div>
              ) : resortQuery.length >= 2 ? (
                <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg">
                  <p className="text-sm text-slate-500 px-4 py-2">(No resorts match "{resortQuery}")</p>
                </div>
              ) : null}
            </div>
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={onSearchModeToggle}
            disabled={isDisabled}
            data-testid="find-resort-button"
          >
            <Search className="h-4 w-4 mr-1" />
            Find resort
          </Button>
        )}
      </div>
    </div>
  );
}