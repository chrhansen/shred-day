import { useState, useEffect, useCallback } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { SelectionPill } from "@/components/SelectionPill";
import { Input } from "@/components/ui/input";
import { ChevronLeft, Loader2, Plus, Check, X, Search, Settings, ImagePlus } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { skiService } from "@/services/skiService";
import { resortService, Resort } from "@/services/resortService";
import { userService } from "@/services/userService";
import { toast } from "sonner";
import debounce from 'lodash.debounce';
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import heic2any from 'heic2any';

const ACTIVITIES = ["Friends", "Training"];

// Define the new state structure for photos
interface PhotoPreview {
  originalFile: File;
  previewUrl: string | null;
}

export default function LogDay() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { id: dayId } = useParams<{ id?: string }>();
  const isEditMode = Boolean(dayId);
  const [date, setDate] = useState<Date>(new Date());
  const [displayedMonth, setDisplayedMonth] = useState<Date>(new Date());
  const [selectedResort, setSelectedResort] = useState<Resort | null>(null);
  const [resortQuery, setResortQuery] = useState<string>("");
  const [searchResults, setSearchResults] = useState<Resort[]>([]);
  const [isSearchingResorts, setIsSearchingResorts] = useState<boolean>(false);
  const [isSearchingMode, setIsSearchingMode] = useState<boolean>(false);
  const [selectedSki, setSelectedSki] = useState<string | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<string>("");
  const [isAddingSkiInline, setIsAddingSkiInline] = useState(false);
  const [newInlineSkiName, setNewInlineSkiName] = useState("");
  const [photos, setPhotos] = useState<PhotoPreview[]>([]);
  const [isConvertingPhoto, setIsConvertingPhoto] = useState<boolean>(false);

  const { data: userSkis, isLoading: isLoadingSkis, error: skisError } = useQuery({
    queryKey: ['skis'],
    queryFn: skiService.getSkis,
  });

  const { data: recentResorts, isLoading: isLoadingRecentResorts } = useQuery({
    queryKey: ['recentResorts'],
    queryFn: userService.getRecentResorts,
  });

  const { data: dayToEdit, isLoading: isLoadingDayToEdit, error: dayToEditError } = useQuery({
    queryKey: ['day', dayId],
    queryFn: () => skiService.getDay(dayId!),
    enabled: isEditMode,
  });

  const { mutate: saveDay, isPending: isSaving } = useMutation({
    mutationFn: skiService.logDay,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skiStats'] });
      queryClient.invalidateQueries({ queryKey: ['recentResorts'] });
      toast.success("Ski day logged successfully!");
      navigate('/');
    },
    onError: (error) => {
      console.error("Log Day error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to log ski day");
    },
  });

  const { mutate: updateDay, isPending: isUpdating } = useMutation({
    mutationFn: (data: { date: string; resort_id: string; ski_id: string; activity: string }) =>
      skiService.updateDay(dayId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skiStats'] });
      queryClient.invalidateQueries({ queryKey: ['days'] });
      queryClient.invalidateQueries({ queryKey: ['day', dayId] });
      toast.success("Ski day updated successfully!");
      navigate('/days');
    },
    onError: (error) => {
      console.error("Update Day error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to update ski day");
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

    // Format the date correctly using date-fns, ignoring timezone conversion issues
    const formattedDate = format(date, 'yyyy-MM-dd');

    // Create FormData
    const formData = new FormData();

    // Append day data, ensuring keys match Rails strong params expectations (day[attribute])
    formData.append('day[date]', formattedDate); // Use formatted date
    formData.append('day[resort_id]', selectedResort.id);
    formData.append('day[ski_id]', selectedSki);
    formData.append('day[activity]', selectedActivity);

    // Append photos
    photos.forEach((photo) => {
      formData.append('day[photos][]', photo.originalFile);
    });

    // Call the appropriate mutation with FormData
    if (isEditMode) {
      // TODO: Implement photo handling for update mutation if needed
      console.warn("Photo updates not yet implemented for edit mode.");
      // Currently just sending non-photo data for update
      // Format date to string for updateDay service function
      updateDay({
        date: formattedDate, // Use formatted date
        resort_id: selectedResort.id,
        ski_id: selectedSki,
        activity: selectedActivity,
       });
    } else {
      // Pass FormData to the saveDay mutation
      saveDay(formData);
    }
  };

  const handleSaveInlineSki = () => {
    if (!newInlineSkiName.trim()) {
      toast.error("Please enter a ski name.");
      return;
    }
    addSki({ name: newInlineSkiName.trim() });
  };

  // Make async to handle potential conversion
  const handlePhotoChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setIsConvertingPhoto(true);
      const filesArray = Array.from(event.target.files);
      const newPhotoPreviews: PhotoPreview[] = [];

      for (const file of filesArray) {
        let previewUrl: string | null = null;
        let conversionSuccessful = false;

        try {
          // Check if it's HEIC/HEIF
          if (file.type === 'image/heic' || file.type === 'image/heif' || /\.heic$/i.test(file.name)) {
            console.log(`Converting ${file.name}...`);
            const convertedBlob = await heic2any({
              blob: file,
              toType: "image/jpeg",
              quality: 0.8, // Adjust quality as needed
            }) as Blob;
            previewUrl = URL.createObjectURL(convertedBlob);
            console.log(`Conversion complete for ${file.name}`);
            conversionSuccessful = true;
          } else {
            // For other types, use the original file directly
            previewUrl = URL.createObjectURL(file);
            conversionSuccessful = true;
          }

        } catch (conversionError) {
          console.error("Error converting photo:", conversionError);
          toast.error(`Failed to generate preview for: ${file.name}`);
          // Ensure previewUrl is null if conversion failed
          previewUrl = null;
        }

        // Always add the photo, marking preview URL as null on failure
        newPhotoPreviews.push({ originalFile: file, previewUrl: previewUrl });
      }

      setPhotos(prev => {
        // Before adding new previews, revoke URLs of existing previews to prevent memory leaks
        prev.forEach(p => URL.revokeObjectURL(p.previewUrl));
        // Combine existing previews (if needed, or just replace)
        // return [...prev, ...newPhotoPreviews]; // Append
        return newPhotoPreviews; // Replace current selection
      });

      setIsConvertingPhoto(false);
      event.target.value = ''; // Reset file input
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => {
      const photoToRemove = prev[index];
      if (photoToRemove) {
        URL.revokeObjectURL(photoToRemove.previewUrl); // Revoke URL on removal
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  useEffect(() => {
    if (isEditMode && dayToEdit) {
      // date comes as string from API, parse it
      const editDate = new Date(dayToEdit.date.replace(/-/g, '/')); // Adjust parsing if needed
      setDate(editDate);
      setDisplayedMonth(editDate);
      // Access ID from nested ski object
      setSelectedSki(dayToEdit.ski.id);
      setSelectedActivity(dayToEdit.activity);
      // Use nested resort object (already checked)
      setSelectedResort(dayToEdit.resort);
      // TODO: Populate existing photos for editing/viewing
      setPhotos([]); // Clear any existing photos for now
    }
    if (!isEditMode) {
        const today = new Date();
        setDate(today);
        setDisplayedMonth(today);
        setSelectedResort(null);
        setSelectedSki(null);
        setSelectedActivity("");
        setResortQuery("");
        setIsSearchingMode(false);
    }
  }, [isEditMode, dayId, dayToEdit]);

  const isSelectedResortRecent = selectedResort && recentResorts?.some(r => r.id === selectedResort.id);

  const isLoading = isLoadingSkis || isLoadingRecentResorts || (isEditMode && isLoadingDayToEdit);
  const isProcessing = isSaving || isUpdating || isAddingSki;

  if (isEditMode && isLoadingDayToEdit) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <span>Loading day details...</span>
      </div>
    );
  }

  if (isEditMode && dayToEditError) {
     return (
       <div className="flex flex-col justify-center items-center min-h-screen text-red-600">
         <span>Error loading day details.</span>
         <Button onClick={() => navigate('/days')}>Go Back</Button>
       </div>
     );
   }

  return (
    <div className="min-h-screen bg-white p-4 flex justify-center">
      <div className="w-full max-w-md mx-auto space-y-6">
        <div className="flex justify-between items-center mb-4">
          <Button
            variant="ghost"
            className="text-slate-600 hover:text-slate-800"
            onClick={() => {
              if (isEditMode) {
                navigate('/days');
              } else {
                navigate(-1);
              }
            }}
            disabled={isProcessing}
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
            disabled={isProcessing}
          >
            <Settings className="h-5 w-5" />
          </Button>
        </div>

        <div>
          <h1 className="text-2xl font-semibold text-slate-900 mb-6 text-center">
             {isEditMode ? 'Edit Ski Day' : 'Log New Ski Day'}
           </h1>
          <h2 className="text-lg font-medium text-slate-800 mb-4 text-center">Date</h2>
          <Calendar
            mode="single"
            selected={date}
            onSelect={(d) => d && setDate(d)}
            className="rounded-lg mx-auto"
            disabled={isProcessing || isLoading}
            month={displayedMonth}
            onMonthChange={setDisplayedMonth}
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
                    disabled={isProcessing || isLoading}
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
                  disabled={isProcessing || isLoading}
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
                      disabled={isProcessing || isLoading}
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
                    disabled={isProcessing || isLoading}
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
                  disabled={isProcessing || isLoading}
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
                        disabled={isProcessing || isLoading}
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
                    disabled={isProcessing || isLoading}
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
                    disabled={isProcessing || isLoading}
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveInlineSki()}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-green-600 hover:bg-green-50 flex-shrink-0"
                    onClick={handleSaveInlineSki}
                    disabled={isProcessing || isLoading || !newInlineSkiName.trim()}
                  >
                    {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    <span className="sr-only">Save Ski</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-slate-500 hover:bg-slate-100 flex-shrink-0"
                    onClick={() => { setIsAddingSkiInline(false); setNewInlineSkiName(""); }}
                    disabled={isProcessing || isLoading}
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
                  disabled={isProcessing || isLoading}
                />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="photo-upload" className="text-slate-700 font-medium">Add Photos (optional)</Label>
            <div className="flex items-center space-x-2">
              <Label
                htmlFor="photo-upload"
                className="flex items-center justify-center w-full h-24 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-blue-500 hover:bg-slate-50 transition-colors"
              >
                <div className="text-center text-slate-500">
                  <ImagePlus className="mx-auto h-8 w-8" />
                  <span>Click or drag to upload</span>
                </div>
                <Input
                  id="photo-upload"
                  type="file"
                  multiple
                  accept="image/*"
                  className="sr-only"
                  onChange={handlePhotoChange}
                  disabled={isProcessing || isConvertingPhoto}
                />
              </Label>
            </div>
            {photos.length > 0 && (
              <div className="grid grid-cols-3 gap-2 pt-2">
                {photos.map((photo, index) => (
                  <div key={index} className="relative group" data-testid="photo-preview">
                    {photo.previewUrl ? (
                      <img
                        src={photo.previewUrl}
                        alt={`preview ${index}`}
                        className="w-full h-20 object-cover rounded-md"
                        onLoad={() => URL.revokeObjectURL(photo.previewUrl!)}
                      />
                    ) : (
                      <div className="w-full h-20 bg-slate-100 rounded-md flex items-center justify-center text-center text-xs text-slate-500 p-1">
                        <span className="break-words">Preview not available yet</span>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => removePhoto(index)}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 opacity-75 group-hover:opacity-100 transition-opacity"
                      aria-label="Remove photo"
                      disabled={isProcessing || isConvertingPhoto}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="pt-4">
          <Button
            className="w-full h-12 text-lg bg-blue-600 hover:bg-blue-700"
            onClick={handleSave}
            disabled={isProcessing || isLoading}
            data-testid="save-day-button"
          >
            {isProcessing ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              isEditMode ? 'Update Day' : 'Save Day'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
