import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { skiService } from "@/services/skiService";
import { resortService, type Resort } from "@/services/resortService";
import { userService } from "@/services/userService";
import { toast } from "sonner";
import debounce from 'lodash.debounce';
import { type PhotoPreview } from "@/types/ski";
import { format } from "date-fns";

export function useLogDay() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { id: dayId } = useParams<{ id?: string }>();
  const isEditMode = Boolean(dayId);

  // Form state
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
  const [photos, setPhotos] = useState<PhotoPreview[]>([]);
  const [isUploading, setIsUploading] = useState<boolean>(false);

  // Queries
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

  // Fetch all days to show on calendar
  const { data: allDays } = useQuery({
    queryKey: ['days', 'all'],
    queryFn: () => skiService.getDays(),
  });

  // Create a set of dates that have ski days
  const daysWithSkiing = useMemo(() => {
    if (!allDays) return new Set<string>();
    return new Set(allDays.map(day => day.date));
  }, [allDays]);

  // Mutations
  const { mutate: saveDay, isPending: isSaving } = useMutation({
    mutationFn: (data: { date: string; resort_id: string; ski_ids: string[]; activity: string; photo_ids: string[] }) =>
      skiService.logDay(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skiStats'] });
      queryClient.invalidateQueries({ queryKey: ['recentResorts'] });
      queryClient.invalidateQueries({ queryKey: ['days'] });
      toast.success("Ski day logged successfully!");
      navigate('/');
    },
    onError: (error) => {
      console.error("Log Day error:", error);
      const message = error instanceof Error ? error.message : "Failed to log ski day";
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
      navigate('/');
    },
    onError: (error) => {
      console.error("Update Day error:", error);
      const message = error instanceof Error ? error.message : "Failed to update ski day";
      toast.error(message);
    },
  });

  const { mutate: addSki, isPending: isAddingSki } = useMutation({
    mutationFn: (name: string) => skiService.addSki({ name }),
    onSuccess: (newSki) => {
      queryClient.invalidateQueries({ queryKey: ['skis'] });
      toast.success(`Ski "${newSki.name}" added successfully!`);
      setSelectedSkis([...selectedSkis, newSki.id]);
    },
    onError: (error) => {
      console.error("Add Ski error:", error);
      const message = error instanceof Error ? error.message : "Failed to add ski";
      toast.error(message);
    },
  });

  // Resort search logic
  const fetchResorts = async (query: string) => {
    if (!query || query.trim().length < 2) {
      setSearchResults([]);
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

  // Load edit data
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
        previewUrl: p.preview_url,
        serverId: p.id,
        uploadStatus: 'completed' as const,
      })) || [];
      setPhotos(existingPhotos);
    }
  }, [isEditMode, dayId, dayToEdit]);

  // Photo upload logic
  const uploadPhoto = async (clientSideId: string, file: File) => {
    setPhotos(prev => prev.map(p => 
      p.id === clientSideId 
        ? { ...p, uploadStatus: 'uploading' as const } 
        : p
    ));
    
    try {
      const result = await skiService.uploadPhoto(file);
      
      setPhotos(prev => prev.map(p => 
        p.id === clientSideId 
          ? { 
              ...p, 
              uploadStatus: 'completed' as const,
              serverId: result.id,
              previewUrl: result.preview_url || null,
            } 
          : p
      ));
    } catch (error) {
      console.error("Photo upload error:", error);
      setPhotos(prev => prev.map(p => 
        p.id === clientSideId 
          ? { 
              ...p, 
              uploadStatus: 'failed' as const,
              errorMessage: error instanceof Error ? error.message : 'Upload failed'
            } 
          : p
      ));
      toast.error("Failed to upload photo");
    }
  };

  const handleSubmit = () => {
    if (!selectedResort || !selectedActivity || selectedSkis.length === 0) {
      toast.error("Please fill in all required fields");
      return;
    }

    const uploadedPhotoIds = photos
      .filter(p => p.uploadStatus === 'completed' && p.serverId)
      .map(p => p.serverId!);

    const formData = {
      date: date.toISOString().split('T')[0],
      resort_id: selectedResort.id,
      ski_ids: selectedSkis,
      activity: selectedActivity,
      photo_ids: uploadedPhotoIds,
    };

    if (isEditMode) {
      updateDay(formData);
    } else {
      saveDay(formData);
    }
  };

  const isProcessing = isSaving || isUpdating || isAddingSki;
  const isLoading = isLoadingSkis || isLoadingRecentResorts || isLoadingDayToEdit;

  return {
    // State
    date,
    setDate,
    displayedMonth,
    setDisplayedMonth,
    selectedResort,
    setSelectedResort,
    resortQuery,
    setResortQuery,
    searchResults,
    isSearchingResorts,
    isSearchingMode,
    setIsSearchingMode,
    activeSearchIndex,
    setActiveSearchIndex,
    selectedSkis,
    setSelectedSkis,
    selectedActivity,
    setSelectedActivity,
    photos,
    setPhotos,
    isUploading,
    setIsUploading,
    
    // Data
    userSkis,
    recentResorts,
    dayToEdit,
    isEditMode,
    dayId,
    daysWithSkiing,
    
    // Loading states
    isLoadingSkis,
    isLoadingRecentResorts,
    isLoadingDayToEdit,
    isProcessing,
    isLoading,
    
    // Errors
    skisError,
    dayToEditError,
    
    // Actions
    handleSubmit,
    addSki,
    uploadPhoto,
    debouncedSearch,
    setSearchResults,
    isAddingSki,
  };
}