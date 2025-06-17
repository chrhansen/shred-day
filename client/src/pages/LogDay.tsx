import { useState, useEffect, useCallback } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { SelectionPill } from "@/components/SelectionPill";
import { Input } from "@/components/ui/input";
import { ChevronLeft, Loader2, Plus, Check, X, Search } from "lucide-react";
import { ResortSearchDropdown } from "@/components/ResortSearchDropdown";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { skiService } from "@/services/skiService";
import { resortService, Resort } from "@/services/resortService";
import { userService } from "@/services/userService";
import { toast } from "sonner";
import debounce from 'lodash.debounce';
import { format } from "date-fns";
import { type PhotoPreview } from "@/types/ski";
import { InteractivePhotoUploader } from "@/components/InteractivePhotoUploader";

const ACTIVITIES = ["Friends", "Training"];

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
  const [activeSearchIndex, setActiveSearchIndex] = useState(-1);
  const [selectedSkis, setSelectedSkis] = useState<string[]>([]);
  const [selectedActivity, setSelectedActivity] = useState<string>("");
  const [isAddingSkiInline, setIsAddingSkiInline] = useState(false);
  const [newInlineSkiName, setNewInlineSkiName] = useState("");
  const [photos, setPhotos] = useState<PhotoPreview[]>([]);
  const [isUploading, setIsUploading] = useState<boolean>(false); // General upload tracking state

  const { data: userSkis, isLoading: isLoadingSkis, error: skisError } = useQuery({
    queryKey: ['skis'],
    queryFn: skiService.getSkis,
  });

  const { data: recentResorts, isLoading: isLoadingRecentResorts } = useQuery({
    queryKey: ['recentResorts'],
    queryFn: userService.getRecentResorts,
  });

  // Fetch day details for editing
  const { data: dayToEdit, isLoading: isLoadingDayToEdit, error: dayToEditError } = useQuery({
    queryKey: ['day', dayId],
    // Assuming skiService.getDay includes photo data with id, preview_url, full_url
    queryFn: () => skiService.getDay(dayId!),
    enabled: isEditMode,
  });

  const { mutate: saveDay, isPending: isSaving } = useMutation({
    mutationFn: (data: { date: string; resort_id: string; ski_ids: string[]; activity: string; photo_ids: string[] }) =>
      skiService.logDay(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skiStats'] });
      queryClient.invalidateQueries({ queryKey: ['recentResorts'] });
      queryClient.invalidateQueries({ queryKey: ['days'] }); // Invalidate days list
      toast.success("Ski day logged successfully!");
      navigate('/');
    },
    onError: (error) => {
      console.error("Log Day error:", error);
      const message = error instanceof Error ? error.message : "Failed to log ski day";
      // TODO: Parse backend validation errors if possible
      toast.error(message);
    },
  });

  const { mutate: updateDay, isPending: isUpdating } = useMutation({
    mutationFn: (data: { date: string; resort_id: string; ski_ids: string[]; activity: string; photo_ids: string[] }) =>
        skiService.updateDay(dayId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skiStats'] });
      queryClient.invalidateQueries({ queryKey: ['days'] });
      queryClient.invalidateQueries({ queryKey: ['day', dayId] });
      toast.success("Ski day updated successfully!");
      navigate('/'); // Navigate to list view after update
    },
    onError: (error) => {
      console.error("Update Day error:", error);
      const message = error instanceof Error ? error.message : "Failed to update ski day";
      // TODO: Parse backend validation errors if possible
      toast.error(message);
    },
  });

  const { mutate: addSki, isPending: isAddingSki } = useMutation({
    mutationFn: skiService.addSki,
    onSuccess: (newSki) => {
      queryClient.invalidateQueries({ queryKey: ['skis'] });
      toast.success(`Ski "${newSki.name}" added successfully!`);
      setNewInlineSkiName("");
      setIsAddingSkiInline(false);
      setSelectedSkis(prevSkis => [...prevSkis, newSki.id]);
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
    setActiveSearchIndex(-1);
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
    setActiveSearchIndex(-1);
  };

  // --- Upload Photo Function (Now calls service) ---
  const uploadPhoto = async (clientSideId: string, file: File) => {
    setPhotos(currentPhotos =>
      currentPhotos.map(p =>
        p.id === clientSideId ? { ...p, uploadStatus: 'uploading' } : p
      )
    );

    try {
      // Call the service function
      const result = await skiService.uploadPhoto(file);

      // Update photo state with server ID and preview URL from service response
      setPhotos(currentPhotos =>
        currentPhotos.map(p =>
          p.id === clientSideId
            ? { ...p, uploadStatus: 'completed', serverId: result.id, previewUrl: result.preview_url }
            : p
        )
      );

    } catch (error) {
      console.error('Error uploading photo:', error);
      toast.error(`Failed to upload ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setPhotos(currentPhotos =>
        currentPhotos.map(p =>
          p.id === clientSideId ? { ...p, uploadStatus: 'failed' } : p
        )
      );
    }
  };
  // --- End Upload Photo Function ---

  // Callback for InteractivePhotoUploader when files are selected
  const handleFilesSelected = async (files: File[]) => {
    if (!files || files.length === 0) return;
    await processFiles(files); // processFiles now takes File[]
  };

  // Adjust processFiles to accept File[] directly
  const processFiles = async (filesArray: File[]) => {
    if (!filesArray || filesArray.length === 0) return;

    const initialPreviews: PhotoPreview[] = filesArray.map(file => ({
      id: crypto.randomUUID(),
      originalFile: file,
      previewUrl: null, // Set to null, will be populated by server response
      serverId: null,
      uploadStatus: 'uploading',
    }));

    setPhotos(prev => [...prev, ...initialPreviews]);

    const uploadPromises = initialPreviews.map(preview =>
      uploadPhoto(preview.id, preview.originalFile!) // originalFile should exist here
    );
    await Promise.allSettled(uploadPromises);
  };

  // Remove photo now just needs the clientSideId
  const handleRemovePhoto = async (clientSideId: string) => {
    const photoToRemove = photos.find(p => p.id === clientSideId);
    if (!photoToRemove) return;

    const serverId = photoToRemove.serverId;
    const uploadStatus = photoToRemove.uploadStatus;

    setPhotos(prev => prev.filter(p => p.id !== clientSideId));

    if (serverId && uploadStatus === 'completed') {
      try {
        await skiService.deletePhoto(serverId);
        toast.info('Photo removed from server.');
      } catch (error) {
        console.error('Error deleting photo from server:', error);
        toast.error('Could not delete photo from server.');
      }
    }
  };

  const handleSaveInlineSki = () => {
    if (!newInlineSkiName.trim()) {
      toast.error("Please enter a ski name.");
      return;
    }
    addSki({ name: newInlineSkiName.trim() });
  };

  // Effect to load data in Edit mode or reset for New mode
  useEffect(() => {
    if (isEditMode && dayToEdit) {
      const editDate = new Date(dayToEdit.date.replace(/-/g, '/'));
      setDate(editDate);
      setDisplayedMonth(editDate);
      setSelectedSkis(dayToEdit.skis ? dayToEdit.skis.map(ski => ski.id) : []);
      setSelectedActivity(dayToEdit.activity);
      setSelectedResort(dayToEdit.resort);

      // Map existing photo data from the fetched day
      const existingPhotos: PhotoPreview[] = dayToEdit.photos?.map((p) => ({
        id: crypto.randomUUID(),
        originalFile: null,
        previewUrl: p.preview_url, // Use preview URL from serializer
        serverId: p.id,
        uploadStatus: 'completed',
      })) || [];
      setPhotos(existingPhotos);
    }
    if (!isEditMode) {
        const today = new Date();
        setDate(today);
        setDisplayedMonth(today);
        setSelectedResort(null);
        setSelectedSkis([]);
        setSelectedActivity("");
        setResortQuery("");
        setIsSearchingMode(false);
        setPhotos([]); // Clear photos
        setIsUploading(false); // Reset upload state
    }
  }, [isEditMode, dayId, dayToEdit]);

  const isSelectedResortRecent = selectedResort && recentResorts?.some(r => r.id === selectedResort.id);

  // Determine if main action is blocked
  const isLoading = isLoadingSkis || isLoadingRecentResorts || (isEditMode && isLoadingDayToEdit);
  const isProcessing = isSaving || isUpdating || isAddingSki || isUploading; // Include photo uploading

  // --- Main Save/Update Handler ---
  const handleSave = () => {
    if (!selectedResort || selectedSkis.length === 0 || !selectedActivity) {
      toast.error("Please select a resort, at least one pair of skis, and an activity.");
      return;
    }

    // Prevent saving if photos are still uploading
    if (isUploading) {
      toast.warning("Please wait for photos to finish uploading.");
      return;
    }

    const formattedDate = format(date, 'yyyy-MM-dd');

    // Get IDs of successfully uploaded photos
    const successfullyUploadedPhotoIds = photos
      .filter(p => p.uploadStatus === 'completed' && p.serverId)
      .map(p => p.serverId!);

    // Prepare plain object payload for both create and update
    const payload = {
        date: formattedDate,
        resort_id: selectedResort.id,
        ski_ids: selectedSkis,
        activity: selectedActivity,
        photo_ids: successfullyUploadedPhotoIds
    };

    if (isEditMode) {
      updateDay(payload);
    } else {
      saveDay(payload);
    }
  };
  // --- End Main Save/Update Handler ---

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
         <Button onClick={() => navigate('/')}>Go Back</Button>
       </div>
     );
   }

  return (
    <div className="min-h-screen bg-white p-4 flex justify-center">
      <div className="w-full max-w-md mx-auto space-y-6">
        {/* Header with Cancel Button */}
        <div className="flex justify-between items-center">
          <Button
            variant="ghost"
            className="text-slate-600 hover:text-slate-800"
            onClick={() => navigate(-1)}
            disabled={isProcessing}
          >
            <ChevronLeft className="h-4 w-4" />
            Cancel
          </Button>
        </div>

        {/* Form Title */}
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

        {/* Form Sections */}
        <div className="space-y-8">
          {/* Resort Selection */}
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
                      searchResults.length > 0 ? (
                        <ResortSearchDropdown
                          results={searchResults}
                          isVisible={true}
                          onSelect={handleSelectResortFromSearch}
                          onClose={() => { setIsSearchingMode(false); setResortQuery(''); setSearchResults([]); }}
                          activeIndex={activeSearchIndex}
                          onActiveIndexChange={setActiveSearchIndex}
                        />
                      ) : (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg">
                          <p className="text-sm text-slate-500 px-4 py-2">(No resorts match "{resortQuery}")</p>
                        </div>
                      )
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

          {/* Ski Selection */}
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
                        selected={selectedSkis.includes(ski.id)}
                        onClick={() => {
                          setSelectedSkis(prevSelectedSkis =>
                            prevSelectedSkis.includes(ski.id)
                              ? prevSelectedSkis.filter(id => id !== ski.id)
                              : [...prevSelectedSkis, ski.id]
                          );
                        }}
                        data-testid={`ski-option-${ski.name.toLowerCase().replace(/\s+/g, '-')}`}
                        disabled={isProcessing || isLoading}
                      />
                    ))}
                  </>
                ) : null
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
                    {isAddingSki ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
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

          {/* Activity Selection */}
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

          {/* Photo Upload Section - Replaced with InteractivePhotoUploader */}
          <InteractivePhotoUploader
            photos={photos}
            onFilesSelected={handleFilesSelected}
            onRemovePhoto={handleRemovePhoto}
            isProcessing={isProcessing}
            acceptedFileTypes="image/jpeg,image/png,image/gif,image/heic,image/heif" // Example
          />
        </div>

        {/* Save/Update Button */}
        <div className="pt-4">
          <Button
            className="w-full h-12 text-lg bg-blue-600 hover:bg-blue-700"
            onClick={handleSave}
            disabled={isProcessing || isLoading} // isProcessing includes isUploading
            data-testid="save-day-button"
          >
            {/* Show upload progress or saving state */}
            {isUploading ? (
                 <><Loader2 className="h-6 w-6 animate-spin mr-2" /> Uploading Photos...</>
            ) : isSaving || isUpdating ? (
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
