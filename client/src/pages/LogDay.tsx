import { useState, useEffect, useCallback } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { SelectionPill } from "@/components/SelectionPill";
import { Input } from "@/components/ui/input";
import { ChevronLeft, Loader2, Plus, Check, X, Search, Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { skiService } from "@/services/skiService";
import { resortService, Resort } from "@/services/resortService";
import { userService } from "@/services/userService";
import { toast } from "sonner";
import debounce from 'lodash.debounce';

const ACTIVITIES = ["Friends", "Training"];

export default function LogDay() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [date, setDate] = useState<Date>(new Date());
  const [selectedResort, setSelectedResort] = useState<Resort | null>(null);
  const [resortQuery, setResortQuery] = useState<string>("");
  const [searchResults, setSearchResults] = useState<Resort[]>([]);
  const [isSearchingResorts, setIsSearchingResorts] = useState<boolean>(false);
  const [isSearchingMode, setIsSearchingMode] = useState<boolean>(false);
  const [selectedSki, setSelectedSki] = useState<number | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<string>("");
  const [isAddingSkiInline, setIsAddingSkiInline] = useState(false);
  const [newInlineSkiName, setNewInlineSkiName] = useState("");

  const { data: userSkis, isLoading: isLoadingSkis, error: skisError } = useQuery({
    queryKey: ['skis'],
    queryFn: skiService.getSkis,
  });

  const { data: recentResorts, isLoading: isLoadingRecentResorts } = useQuery({
    queryKey: ['recentResorts'],
    queryFn: userService.getRecentResorts,
  });

  const { mutate: saveDay, isPending } = useMutation({
    mutationFn: skiService.logDay,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skiStats'] });
      queryClient.invalidateQueries({ queryKey: ['recentResorts'] });
      toast.success("Ski day logged successfully!");
      navigate('/dashboard');
    },
    onError: () => {
      toast.error("Failed to log ski day");
    },
  });

  const { mutate: addSki, isPending: isAddingSki } = useMutation({
    mutationFn: skiService.addSki,
    onSuccess: (newSki) => {
      queryClient.invalidateQueries({ queryKey: ['skis'] });
      toast.success(`Ski "${newSki.name}" added successfully!`);
      setNewInlineSkiName("");
      setIsAddingSkiInline(false);
      setSelectedSki(newSki.id);
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to add ski");
    },
  });

  const fetchResorts = async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      setIsSearchingResorts(false);
      return;
    }
    setIsSearchingResorts(true);
    try {
      const results = await resortService.searchResorts(query);
      setSearchResults(results);
    } catch (error) {
      console.error("Error searching resorts:", error);
      toast.error("Failed to search resorts");
      setSearchResults([]);
    } finally {
      setIsSearchingResorts(false);
    }
  };

  const debouncedSearch = useCallback(debounce(fetchResorts, 300), []);

  useEffect(() => {
    if (isSearchingMode) {
      debouncedSearch(resortQuery);
    }
    return () => debouncedSearch.cancel();
  }, [resortQuery, isSearchingMode, debouncedSearch]);

  const handleResortInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = event.target.value;
    setResortQuery(newQuery);
  };

  const handleToggleRecentResort = (resort: Resort) => {
    if (selectedResort?.id === resort.id) {
      setSelectedResort(null);
    } else {
      setSelectedResort(resort);
      setIsSearchingMode(false);
      setResortQuery('');
      setSearchResults([]);
    }
  };

  const handleSelectResortFromSearch = (resort: Resort) => {
    setSelectedResort(resort);
    setIsSearchingMode(false);
    setResortQuery('');
    setSearchResults([]);
  };

  const handleSave = () => {
    if (!selectedResort || selectedSki === null || !selectedActivity) {
      toast.error("Please select a resort, skis, and activity.");
      return;
    }

    saveDay({
      date,
      resort_id: selectedResort.id,
      ski_id: selectedSki,
      activity: selectedActivity,
    });
  };

  const handleSaveInlineSki = () => {
    if (!newInlineSkiName.trim()) {
      toast.error("Please enter a ski name.");
      return;
    }
    addSki({ name: newInlineSkiName.trim() });
  };

  // Helper derived state to check if selected resort is in the recent list
  const isSelectedResortRecent = selectedResort && recentResorts?.some(r => r.id === selectedResort.id);

  return (
    <div className="min-h-screen bg-white p-4 flex justify-center">
      <div className="w-full max-w-md mx-auto space-y-6">
        <div className="flex justify-between items-center mb-4">
          <Button
            variant="ghost"
            className="text-slate-600 hover:text-slate-800"
            onClick={() => navigate(-1)}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-slate-600 hover:text-slate-800"
            onClick={() => navigate('/settings')}
            aria-label="Settings"
          >
            <Settings className="h-5 w-5" />
          </Button>
        </div>

        <div>
          <h2 className="text-lg font-medium text-slate-800 mb-4 text-center">Date</h2>
          <Calendar
            mode="single"
            selected={date}
            onSelect={(date) => date && setDate(date)}
            className="rounded-lg mx-auto"
          />
        </div>

        <div className="space-y-8">
          <div>
            <h2 className="text-lg font-medium text-slate-800 mb-4">Ski Resort</h2>
            <div className="flex flex-wrap gap-2 items-center">
              {isLoadingRecentResorts ? (
                <div className="flex items-center text-slate-500 w-full"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading recent...</div>
              ) : (
                recentResorts?.map((resort) => (
                  <SelectionPill
                    key={resort.id}
                    label={resort.name}
                    selected={selectedResort?.id === resort.id}
                    onClick={() => handleToggleRecentResort(resort)}
                    data-testid={`recent-resort-${resort.name.toLowerCase().replace(/\s+/g, '-')}`}
                  />
                ))
              )}

              {selectedResort && !isSelectedResortRecent && !isSearchingMode && (
                <SelectionPill
                  key={selectedResort.id}
                  label={selectedResort.name}
                  selected={true}
                  onClick={() => setSelectedResort(null)}
                  data-testid={`selected-resort-${selectedResort.name.toLowerCase().replace(/\s+/g, '-')}`}
                />
              )}

              {isSearchingMode ? (
                <div className="w-full space-y-2 pt-2">
                  <div className="relative">
                    <Input
                      type="text"
                      placeholder="Type to search resorts..."
                      value={resortQuery}
                      onChange={handleResortInputChange}
                      className="h-10 pl-8"
                      disabled={isPending}
                      autoFocus
                      data-testid="resort-search-input"
                    />
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    {isSearchingResorts && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 animate-spin" />
                    )}
                  </div>
                  <div className="relative w-full min-h-[1rem]">
                    {(!isSearchingResorts && resortQuery.length >= 2) && (
                      <div
                        className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg max-h-60 overflow-y-auto"
                        data-testid="resort-search-results"
                      >
                        {searchResults.length > 0 ? (
                          searchResults.map((resort) => (
                            <button
                              key={resort.id}
                              className="block w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-100"
                              onClick={() => handleSelectResortFromSearch(resort)}
                              data-testid={`resort-option-${resort.name.toLowerCase().replace(/\s+/g, '-')}`}
                            >
                              {resort.name} <span className="text-xs text-slate-400">({resort.region}, {resort.country})</span>
                            </button>
                          ))
                        ) : (
                          <p className="text-sm text-slate-500 px-4 py-2">(No resorts match "{resortQuery}")</p>
                        )}
                      </div>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setIsSearchingMode(false); setResortQuery(''); setSearchResults([]); }}
                  >
                    Cancel Search
                  </Button>
                </div>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-blue-600 hover:bg-blue-50 border-dashed border border-transparent hover:border-blue-200"
                  onClick={() => { setIsSearchingMode(true); setSelectedResort(null); }}
                  disabled={isLoadingRecentResorts}
                  data-testid="find-resort-button"
                >
                  <Search className="h-4 w-4 mr-1" /> Find resort...
                </Button>
              )}
            </div>
          </div>

          <div>
            <h2 className="text-lg font-medium text-slate-800 mb-4">Skis</h2>
            <div className="flex flex-wrap gap-2 items-center">
              {isLoadingSkis && (
                <div className="flex items-center text-slate-500 w-full">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading skis...
                </div>
              )}
              {skisError && (
                 <p className="text-red-600 w-full">Error loading skis: {skisError.message}</p>
              )}
              {!isLoadingSkis && !skisError && userSkis && (
                userSkis.length > 0 ? (
                  <>
                    {userSkis.map((ski) => (
                      <SelectionPill
                        key={ski.id}
                        label={ski.name}
                        selected={selectedSki === ski.id}
                        onClick={() => setSelectedSki(ski.id)}
                        data-testid={`ski-option-${ski.name.toLowerCase().replace(/\s+/g, '-')}`}
                      />
                    ))}
                  </>
                ) : (
                  null
                )
              )}
              {!isLoadingSkis && !skisError && !isAddingSkiInline && (
                 <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-blue-600 hover:bg-blue-50"
                    onClick={() => setIsAddingSkiInline(true)}
                    disabled={isAddingSki}
                 >
                    <Plus className="h-4 w-4 mr-1" /> Add
                 </Button>
              )}
              {isAddingSkiInline && (
                <div className="flex gap-2 items-center w-full sm:w-auto">
                  <Input
                    type="text"
                    placeholder="e.g., Volkl Racetiger"
                    value={newInlineSkiName}
                    onChange={(e) => setNewInlineSkiName(e.target.value)}
                    className="h-9 flex-grow"
                    disabled={isAddingSki}
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveInlineSki()}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-green-600 hover:bg-green-50 flex-shrink-0"
                    onClick={handleSaveInlineSki}
                    disabled={isAddingSki || !newInlineSkiName.trim()}
                  >
                    {isAddingSki ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    <span className="sr-only">Save Ski</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-slate-500 hover:bg-slate-100 flex-shrink-0"
                    onClick={() => { setIsAddingSkiInline(false); setNewInlineSkiName(""); }}
                    disabled={isAddingSki}
                  >
                    <X className="h-4 w-4" />
                    <span className="sr-only">Cancel</span>
                  </Button>
                </div>
              )}
              {!isLoadingSkis && !skisError && !userSkis && !isAddingSkiInline && (
                  <p className="text-sm text-slate-500 w-full">Could not load skis.</p>
              )}
            </div>
          </div>

          <div>
            <h2 className="text-lg font-medium text-slate-800 mb-4">Activity</h2>
            <div className="flex flex-wrap gap-2">
              {ACTIVITIES.map((activity) => (
                <SelectionPill
                  key={activity}
                  label={activity}
                  selected={selectedActivity === activity}
                  onClick={() => setSelectedActivity(activity)}
                  data-testid={`activity-${activity.toLowerCase()}`}
                />
              ))}
            </div>
          </div>
        </div>

        <Button
          onClick={handleSave}
          disabled={isPending}
          className="w-full h-14 text-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg transition-all hover:shadow-xl mt-8"
          data-testid="save-button"
        >
          {isPending ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
          ) : (
            "Save"
          )}
        </Button>
      </div>
    </div>
  );
}
