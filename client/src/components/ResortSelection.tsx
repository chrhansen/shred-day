import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SelectionPill } from "@/components/SelectionPill";
import { ResortSearchDropdown } from "@/components/ResortSearchDropdown";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, Loader2, Plus, Search, X } from "lucide-react";
import type { Resort } from "@/services/resortService";

const COUNTRIES = [
  "Afghanistan", "Albania", "Algeria", "Andorra", "Argentina", "Armenia", "Australia", "Austria", "Azerbaijan",
  "Belarus", "Belgium", "Bolivia", "Bosnia and Herzegovina", "Brazil", "Bulgaria",
  "Canada", "Chile", "China", "Colombia", "Croatia", "Czech Republic",
  "Denmark",
  "Ecuador", "Estonia",
  "Finland", "France",
  "Georgia", "Germany", "Greece", "Greenland",
  "Hungary",
  "Iceland", "India", "Iran", "Iraq", "Ireland", "Israel", "Italy",
  "Japan",
  "Kazakhstan", "Kosovo", "Kyrgyzstan",
  "Latvia", "Lebanon", "Liechtenstein", "Lithuania", "Luxembourg",
  "Mexico", "Moldova", "Mongolia", "Montenegro", "Morocco",
  "Nepal", "Netherlands", "New Zealand", "North Macedonia", "Norway",
  "Pakistan", "Peru", "Poland", "Portugal",
  "Romania", "Russia",
  "Serbia", "Slovakia", "Slovenia", "South Africa", "South Korea", "Spain", "Sweden", "Switzerland",
  "Tajikistan", "Turkey", "Turkmenistan",
  "Ukraine", "United Kingdom", "United States", "Uzbekistan",
  "Venezuela"
];

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
  onCreateResort: (data: { name: string; country: string }) => Promise<Resort | null>;
  isCreatingResort: boolean;
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
  onCreateResort,
  isCreatingResort,
}: ResortSelectionProps) {
  const [isAddingResort, setIsAddingResort] = useState(false);
  const [newResortName, setNewResortName] = useState("");
  const [newResortCountry, setNewResortCountry] = useState("");

  const visibleResorts = useMemo(() => {
    const resorts = recentResorts ?? [];
    if (selectedResort && !resorts.some((resort) => resort.id === selectedResort.id)) {
      return [...resorts, selectedResort];
    }
    return resorts;
  }, [recentResorts, selectedResort]);

  useEffect(() => {
    if (!isSearchingMode) {
      setIsAddingResort(false);
      setNewResortName("");
      setNewResortCountry("");
    }
  }, [isSearchingMode]);

  const showNoResults = resortQuery.trim().length >= 2 && !isSearchingResorts && searchResults.length === 0;

  const handleStartAddResort = () => {
    setNewResortName(resortQuery.trim());
    setNewResortCountry("");
    setIsAddingResort(true);
  };

  const handleBackToSearch = () => {
    setIsAddingResort(false);
  };

  const handleCreateResort = async () => {
    const trimmedName = newResortName.trim();
    if (!trimmedName || !newResortCountry) return;
    const createdResort = await onCreateResort({ name: trimmedName, country: newResortCountry });
    if (createdResort) {
      setIsAddingResort(false);
      setNewResortName("");
      setNewResortCountry("");
    }
  };

  return (
    <div>
      <h2 className="text-lg font-medium text-slate-800 mb-4">Ski Resort</h2>
      <div className="flex flex-wrap gap-2 items-center">
        {isLoadingRecentResorts ? (
          <div className="flex items-center text-slate-500 w-full">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading recent...
          </div>
        ) : (
          visibleResorts.map((resort) => (
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
                disabled={isDisabled || isAddingResort || isCreatingResort}
                autoFocus={!isAddingResort}
                data-testid="resort-search-input"
                className="pr-10"
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={onSearchModeToggle}
                className="absolute right-1 top-1 h-7 w-7 p-0"
                disabled={isDisabled || isCreatingResort}
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
              ) : showNoResults ? (
                <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg">
                  {!isAddingResort ? (
                    <div className="px-4 py-3">
                      <p className="text-sm text-slate-500 text-center mb-3">No resorts found</p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full justify-start"
                        onClick={handleStartAddResort}
                        disabled={isDisabled}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add "{resortQuery}" as new resort
                      </Button>
                    </div>
                  ) : (
                    <div className="p-3 space-y-3">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={handleBackToSearch}
                          disabled={isDisabled}
                        >
                          <ChevronLeft className="h-4 w-4 text-slate-500" />
                        </Button>
                        <span className="font-medium text-sm text-slate-700">Add new resort</span>
                      </div>
                      <div className="space-y-2">
                        <Input
                          placeholder="Resort name"
                          value={newResortName}
                          onChange={(e) => setNewResortName(e.target.value)}
                          disabled={isDisabled}
                          autoFocus
                        />
                        <Select value={newResortCountry} onValueChange={setNewResortCountry} disabled={isDisabled}>
                          <SelectTrigger>
                            <SelectValue placeholder="Country" />
                          </SelectTrigger>
                          <SelectContent className="max-h-48">
                            {COUNTRIES.map((country) => (
                              <SelectItem key={country} value={country}>
                                {country}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        onClick={handleCreateResort}
                        disabled={isDisabled || isCreatingResort || !newResortName.trim() || !newResortCountry}
                        className="w-full"
                      >
                        {isCreatingResort ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Adding...
                          </>
                        ) : (
                          <>
                            <Plus className="h-4 w-4 mr-2" />
                            Add resort
                          </>
                        )}
                      </Button>
                    </div>
                  )}
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
