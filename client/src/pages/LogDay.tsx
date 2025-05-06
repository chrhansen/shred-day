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

const ACTIVITIES = ["Friends", "Training"];

// Define the new state structure for photos
interface PhotoPreview {
  id: string; // Client-side unique ID for React key and updates
  originalFile: File | null; // Keep original file ref for potential retry, null for existing photos
  previewUrl: string | null; // URL for display (from backend response)
  serverId: string | null; // ID from backend after successful upload
  uploadStatus: 'pending' | 'uploading' | 'completed' | 'failed'; // Upload tracking
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
  const [isUploading, setIsUploading] = useState<boolean>(false); // General upload tracking state
  const [isDraggingOver, setIsDraggingOver] = useState<boolean>(false);

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
    mutationFn: (data: { date: string; resort_id: string; ski_id: string; activity: string; photo_ids: string[] }) =>
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
    mutationFn: (data: { date: string; resort_id: string; ski_id: string; activity: string; photo_ids: string[] }) =>
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

  // --- Process Selected Files (Input/Drop) ---
  const processFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const filesArray = Array.from(files);
    const initialPreviews: PhotoPreview[] = filesArray.map(file => ({
      id: crypto.randomUUID(),
      originalFile: file,
      previewUrl: null,
      serverId: null,
      uploadStatus: 'pending',
    }));

    setPhotos(prev => [...prev, ...initialPreviews]);
    // isUploading state will be set by useEffect

    // Trigger uploads
    const uploadPromises = initialPreviews.map(preview =>
      uploadPhoto(preview.id, preview.originalFile)
    );

    // Wait for all attempts to settle (though UI updates happen individually)
    await Promise.allSettled(uploadPromises);
    // Final isUploading state determined by useEffect
  };
  // --- End Process Selected Files ---

  // Effect to update global isUploading state
  useEffect(() => {
    const anyUploading = photos.some(p => p.uploadStatus === 'uploading');
    setIsUploading(anyUploading);
  }, [photos]);

  // Original handler for file input click
  const handlePhotoChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    await processFiles(event.target.files);
    if (event.target) {
        event.target.value = ''; // Reset file input
    }
  };

  // --- Drag and Drop Handlers ---
  const handleDragOver = (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault(); // Necessary to allow dropping
    setIsDraggingOver(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLLabelElement>) => {
     event.preventDefault();
     setIsDraggingOver(false);
  };

  const handleDrop = async (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault(); // Prevent default browser behavior (opening file)
    setIsDraggingOver(false);
    await processFiles(event.dataTransfer.files);
  };
  // --- End Drag and Drop Handlers ---

  // --- Remove Photo Handler (Now calls service) ---
  const removePhoto = async (clientSideId: string) => {
    const photoToRemove = photos.find(p => p.id === clientSideId);
    if (!photoToRemove) return;

    const serverId = photoToRemove.serverId;
    const uploadStatus = photoToRemove.uploadStatus;
    const currentPreviewUrl = photoToRemove.previewUrl;

    // Optimistically remove from UI
    setPhotos(prev => prev.filter(p => p.id !== clientSideId));

    // Attempt backend deletion ONLY if it was successfully uploaded
    if (serverId && uploadStatus === 'completed') {
      try {
        // Call the service function
        await skiService.deletePhoto(serverId);
        toast.info('Photo removed.');

      } catch (error) {
        console.error('Error deleting photo:', error);
        toast.error('Could not delete photo from server. Please try again.');
        // Re-add photo to UI upon failure?
        // setPhotos(prev => [...prev, photoToRemove]); // Consider race conditions/state mismatch if re-adding
      }
    }

    // Revoke preview URL if it existed
    if (currentPreviewUrl) {
        URL.revokeObjectURL(currentPreviewUrl);
    }
  };
  // --- End Remove Photo Handler ---

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
      setSelectedSki(dayToEdit.ski.id);
      setSelectedActivity(dayToEdit.activity);
      setSelectedResort(dayToEdit.resort);

      // Map existing photo data from the fetched day
      const existingPhotos: PhotoPreview[] = dayToEdit.photos?.map((p: any) => ({
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
        setSelectedSki(null);
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
    if (!selectedResort || selectedSki === null || !selectedActivity) {
      toast.error("Please select a resort, skis, and activity.");
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
        ski_id: selectedSki,
        activity: selectedActivity,
        photo_ids: successfullyUploadedPhotoIds
    };

    if (isEditMode) {
      // Prepare update payload (plain object) - Already done above
      // const updatePayload = { ... };
      updateDay(payload); // Pass plain object
    } else {
      // Prepare create payload (plain object) - Already done above
      // const formData = new FormData(); ... // Remove FormData creation
      saveDay(payload); // Pass plain object
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
        {/* Header with Back/Settings Buttons */}
        <div className="flex justify-between items-center mb-4">
          <Button
            variant="ghost"
            className="text-slate-600 hover:text-slate-800"
            onClick={() => navigate(-1)} // Simpler back navigation
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
                        selected={selectedSki === ski.id}
                        onClick={() => setSelectedSki(ski.id)}
                        data-testid={`ski-option-${ski.name.toLowerCase().replace(/\s+/g, '-')}`}
                        disabled={isProcessing || isLoading}
                      />
                    ))}
                  </>
                ) : (
                  null // Show Add button if list is empty
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

          {/* Photo Upload Section */}
          <div className="space-y-2">
            <Label htmlFor="photo-upload" className="text-slate-700 font-medium">Add Photos (optional)</Label>
            <div className="flex items-center space-x-2">
              {/* Dropzone Label */}
              <Label
                htmlFor="photo-upload"
                data-testid="photo-dropzone-label"
                className={`flex items-center justify-center w-full h-24 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-blue-500 hover:bg-slate-50 transition-colors ${
                  isDraggingOver ? 'border-blue-600 bg-blue-50' : ''
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <div className="text-center text-slate-500">
                  <ImagePlus className="mx-auto h-8 w-8" />
                  <span>Click or drag to upload</span>
                </div>
                {/* Hidden File Input */}
                <Input
                  id="photo-upload"
                  type="file"
                  multiple
                  accept="image/*" // Accept all image types, backend handles validation/conversion
                  className="sr-only"
                  onChange={handlePhotoChange}
                  disabled={isProcessing}
                />
              </Label>
            </div>
            {/* Photo Preview Grid */}
            {photos.length > 0 && (
              <div className="grid grid-cols-3 gap-2 pt-2">
                {photos.map((photo) => (
                  <div key={photo.id} className="relative group w-full h-20" data-testid="photo-preview">
                    {/* Completed & Preview Available */}
                    {photo.uploadStatus === 'completed' && photo.previewUrl ? (
                      <img
                        src={photo.previewUrl}
                        alt={`preview ${photo.originalFile?.name || photo.serverId}`}
                        className="w-full h-full object-cover rounded-md"
                        onError={(e) => {
                           const target = e.target as HTMLImageElement;
                           target.style.display = 'none';
                           const parent = target.closest('[data-testid="photo-preview"]');
                           const fallback = parent?.querySelector('[data-fallback-id="' + photo.id + '"]');
                           if (fallback) (fallback as HTMLElement).style.display = 'flex';
                        }}
                      />
                    // Failed Upload
                    ) : photo.uploadStatus === 'failed' ? (
                      <div className="w-full h-full bg-red-100 rounded-md flex flex-col items-center justify-center text-center text-xs text-red-600 p-1 font-medium">
                         <X className="h-4 w-4 mb-1" />
                         <span className="break-words">Upload Failed</span>
                      </div>
                    // Uploading
                    ) : photo.uploadStatus === 'uploading' ? (
                       <div className="w-full h-full bg-slate-100 rounded-md flex items-center justify-center text-center text-xs text-slate-400 p-1 animate-pulse">
                         <Loader2 className="h-5 w-5 animate-spin" />
                       </div>
                    // Fallback (Pending, Completed w/o URL)
                    ) : (
                      <div
                         data-fallback-id={photo.id}
                         className="w-full h-full bg-slate-100 rounded-md items-center justify-center text-center text-xs text-slate-500 p-1"
                         style={{ display: (photo.uploadStatus === 'completed' && !photo.previewUrl) || photo.uploadStatus === 'pending' ? 'flex' : 'none' }}
                      >
                         <span className="break-words">Preview N/A</span>
                      </div>
                    )}
                    {/* Remove Button Overlay */}
                    {(photo.uploadStatus === 'completed' || photo.uploadStatus === 'failed') && (
                      <button
                        type="button"
                        onClick={() => removePhoto(photo.id)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100"
                        aria-label="Remove photo"
                        disabled={isProcessing} // Disable if main form is saving OR photos are uploading
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
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
