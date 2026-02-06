import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SelectionPill } from "@/components/SelectionPill";
import { ResortSearchDropdown } from "@/components/ResortSearchDropdown";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, Loader2, Plus, Search, X } from "lucide-react";
import type { Resort } from "@/services/resortService";

const COUNTRIES = [
  "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Antigua and Barbuda", "Argentina", "Armenia", "Australia", "Austria", "Azerbaijan",
  "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belgium", "Belize", "Benin", "Bhutan", "Bolivia", "Bosnia and Herzegovina", "Botswana", "Brazil", "Brunei Darussalam", "Bulgaria", "Burkina Faso", "Burundi",
  "Cabo Verde", "Cambodia", "Cameroon", "Canada", "Central African Republic", "Chad", "Chile", "China", "Colombia", "Comoros", "Congo", "Costa Rica", "Côte D'Ivoire", "Croatia", "Cuba", "Cyprus", "Czech Republic",
  "Denmark", "Djibouti", "Dominica", "Dominican Republic",
  "Ecuador", "Egypt", "El Salvador", "Equatorial Guinea", "Eritrea", "Estonia", "Eswatini", "Ethiopia",
  "Fiji", "Finland", "France",
  "Gabon", "Gambia", "Georgia", "Germany", "Ghana", "Greece", "Grenada", "Guatemala", "Guinea", "Guinea Bissau", "Guyana",
  "Haiti", "Honduras", "Hungary",
  "Iceland", "India", "Indonesia", "Iran", "Iraq", "Ireland", "Israel", "Italy",
  "Jamaica", "Japan", "Jordan",
  "Kazakhstan", "Kenya", "Kiribati", "Kuwait", "Kyrgyzstan",
  "Lao", "Latvia", "Lebanon", "Lesotho", "Liberia", "Libya", "Liechtenstein", "Lithuania", "Luxembourg",
  "Madagascar", "Malawi", "Malaysia", "Maldives", "Mali", "Malta", "Marshall Islands", "Mauritania", "Mauritius", "Mexico", "Micronesia", "Moldova", "Monaco", "Mongolia", "Montenegro", "Morocco", "Mozambique", "Myanmar",
  "Namibia", "Nauru", "Nepal", "Netherlands", "New Zealand", "Nicaragua", "Niger", "Nigeria", "North Korea", "North Macedonia", "Norway",
  "Oman",
  "Pakistan", "Palau", "Panama", "Papua New Guinea", "Paraguay", "Peru", "Philippines", "Poland", "Portugal",
  "Qatar",
  "Romania", "Russia", "Rwanda",
  "Saint Kitts and Nevis", "Saint Lucia", "Saint Vincent and the Grenadines", "Samoa", "San Marino", "Sao Tome and Principe", "Saudi Arabia", "Senegal", "Serbia", "Seychelles", "Sierra Leone", "Singapore", "Slovakia", "Slovenia", "Solomon Islands", "Somalia", "South Africa", "South Korea", "South Sudan", "Spain", "Sri Lanka", "Sudan", "Suriname", "Sweden", "Switzerland", "Syria",
  "Tajikistan", "Thailand", "Timor-Leste", "Togo", "Tonga", "Trinidad and Tobago", "Tunisia", "Turkey", "Turkmenistan", "Tuvalu", "Tanzania",
  "Uganda", "Ukraine", "United Arab Emirates (UAE)", "United Kingdom (UK)", "United States of America (USA)", "Uruguay", "Uzbekistan",
  "Vanuatu", "Venezuela", "Viet Nam",
  "Yemen",
  "Zambia", "Zimbabwe"
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

  const showSearchDropdown = resortQuery.trim().length >= 2 && !isSearchingResorts && !isAddingResort;

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
              {showSearchDropdown ? (
                <ResortSearchDropdown
                  results={searchResults}
                  isVisible={true}
                  onSelect={onSelectFromSearch}
                  activeIndex={activeSearchIndex}
                  onActiveIndexChange={onSearchIndexChange}
                  emptyState={
                    <p className="text-sm text-slate-500 text-center px-4 py-3">No resorts found</p>
                  }
                  footer={
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
                  }
                />
              ) : isSearchingResorts ? (
                <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg">
                  <p className="text-sm text-slate-500 px-4 py-2">Searching...</p>
                </div>
              ) : isAddingResort ? (
                <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg">
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
                          <SelectValue placeholder="Select Country" />
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
