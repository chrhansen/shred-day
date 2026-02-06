import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { InteractivePhotoUploader } from "@/components/InteractivePhotoUploader";
import { ResortSelection } from "@/components/ResortSelection";
import { SkiSelection } from "@/components/SkiSelection";
import { TagSelection } from "@/components/TagSelection";
import { Textarea } from "@/components/ui/textarea";
import { useLogDay } from "@/hooks/useLogDay";
import type { PhotoPreview } from "@/types/ski";
import PageMeta from "@/components/PageMeta";

export default function LogDay() {
  const navigate = useNavigate();
  const {
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
    selectedTagIds,
    notes,
    setNotes,
    photos,
    setPhotos,
    isUploading,
    setIsUploading,
    deletingTagId,
    
    // Data
    userSkis,
    recentResorts,
    userTags,
    isEditMode,
    daysWithSkiing,
    
    // Loading states
    isLoadingSkis,
    isLoadingRecentResorts,
    isLoadingDayToEdit,
    isLoadingTags,
    isProcessing,
    isLoading,
    
    // Errors
    skisError,
    tagsError,
    dayToEditError,
    
    // Actions
    handleSubmit,
    addSki,
    uploadPhoto,
    setSearchResults,
    isAddingSki,
    toggleTagSelection,
    createTag,
    removeTag,
    isAddingTag,
    isDeletingTag,
    suggestResort,
    isCreatingResort,
  } = useLogDay();

  // Event handlers
  const handleToggleRecentResort = (resort: typeof recentResorts[0]) => {
    if (selectedResort?.id === resort.id) {
      setSelectedResort(null);
    } else {
      setSelectedResort(resort);
      setIsSearchingMode(false);
      setResortQuery('');
    }
  };

  const handleSelectResortFromSearch = (resort: typeof searchResults[0]) => {
    setSelectedResort(resort);
    setIsSearchingMode(false);
    setResortQuery('');
    setSearchResults([]);
  };

  const handleToggleSki = (skiId: string) => {
    setSelectedSkis(prev => 
      prev.includes(skiId)
        ? prev.filter(id => id !== skiId)
        : [...prev, skiId]
    );
  };

  const handleToggleTag = (tagId: string) => {
    toggleTagSelection(tagId);
  };

  const handleAddTag = (tagName: string) => {
    createTag(tagName);
  };

  const handleDeleteTag = (tagId: string) => {
    removeTag(tagId);
  };

  const handlePhotosChange = (newPhotos: typeof photos) => {
    setPhotos(newPhotos);
    
    // Check if any photos need uploading
    const photosToUpload = newPhotos.filter(p => 
      p.uploadStatus === 'uploading' && p.originalFile && !p.serverId
    );
    
    if (photosToUpload.length > 0 && !isUploading) {
      setIsUploading(true);
      Promise.all(
        photosToUpload.map(photo => uploadPhoto(photo.id, photo.originalFile!))
      ).finally(() => setIsUploading(false));
    }
  };

  const formIsValid = Boolean(selectedResort) && selectedSkis.length > 0;
  const pageTitle = isEditMode ? "Edit Day · Shred Day" : "Log Day · Shred Day";
  const pageDescription = isEditMode ? "Edit a logged ski day." : "Log a new ski day.";

  // Loading states
  if (isLoading && isEditMode) {
    return (
      <>
        <PageMeta title={pageTitle} description={pageDescription} />
        <div className="min-h-screen bg-white p-4 flex items-center justify-center">
          <div className="flex items-center text-slate-500">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Loading ski day...
          </div>
        </div>
      </>
    );
  }

  // Error states
  if (skisError) {
    return (
      <>
        <PageMeta title={pageTitle} description={pageDescription} />
        <div className="min-h-screen bg-white p-4 flex items-center justify-center">
          <div className="text-center">
            <p className="text-red-600 mb-4">Failed to load skis data</p>
            <Button onClick={() => navigate('/')}>Go Back</Button>
          </div>
        </div>
      </>
    );
  }

  if (tagsError) {
    return (
      <>
        <PageMeta title={pageTitle} description={pageDescription} />
        <div className="min-h-screen bg-white p-4 flex items-center justify-center">
          <div className="text-center">
            <p className="text-red-600 mb-4">Failed to load tags</p>
            <Button onClick={() => navigate('/')}>Go Back</Button>
          </div>
        </div>
      </>
    );
  }

  if (isEditMode && dayToEditError) {
    return (
      <>
        <PageMeta title={pageTitle} description={pageDescription} />
        <div className="min-h-screen bg-white p-4 flex items-center justify-center">
          <div className="text-center">
            <p className="text-red-600 mb-4">Failed to load ski day</p>
            <Button onClick={() => navigate('/')}>Go Back</Button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <PageMeta title={pageTitle} description={pageDescription} />
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
            modifiers={{
              hasSkiDay: (date) => daysWithSkiing.has(format(date, 'yyyy-MM-dd'))
            }}
            modifiersClassNames={{
              hasSkiDay: "bg-blue-100 font-bold text-blue-900"
            }}
          />
        </div>

        {/* Form Sections */}
        <div className="space-y-8">
          {/* Resort Selection */}
          <ResortSelection
            selectedResort={selectedResort}
            recentResorts={recentResorts}
            isLoadingRecentResorts={isLoadingRecentResorts}
            isSearchingMode={isSearchingMode}
            resortQuery={resortQuery}
            searchResults={searchResults}
            isSearchingResorts={isSearchingResorts}
            activeSearchIndex={activeSearchIndex}
            isDisabled={isProcessing || isLoading}
            onToggleRecent={handleToggleRecentResort}
            onSearchModeToggle={() => setIsSearchingMode(!isSearchingMode)}
            onQueryChange={setResortQuery}
            onSelectFromSearch={handleSelectResortFromSearch}
            onSearchIndexChange={setActiveSearchIndex}
            onCreateResort={suggestResort}
            isCreatingResort={isCreatingResort}
          />

          {/* Ski Selection */}
          <SkiSelection
            userSkis={userSkis}
            selectedSkis={selectedSkis}
            isLoadingSkis={isLoadingSkis}
            isDisabled={isProcessing || isLoading}
            onToggleSki={handleToggleSki}
            onAddSki={addSki}
            isAddingSki={isAddingSki}
          />

          {/* Tag Selection */}
          <TagSelection
            tags={userTags}
            selectedTagIds={selectedTagIds}
            isLoading={isLoadingTags}
            isDisabled={isProcessing || isLoading}
            deletingTagId={deletingTagId}
            onToggleTag={handleToggleTag}
            onAddTag={handleAddTag}
            onDeleteTag={handleDeleteTag}
            isAddingTag={isAddingTag}
            isDeletingTag={isDeletingTag}
          />

          <div>
            <h2 className="text-lg font-medium text-slate-800 mb-4">
              Comment <span className="text-sm font-normal text-slate-400">(optional)</span>
            </h2>
            <Textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Add a note about this ski day..."
              className="min-h-[120px] resize-none"
              disabled={isProcessing || isLoading}
              data-testid="day-notes-input"
            />
          </div>

          {/* Photo Upload Section */}
          <div>
            <h2 className="text-lg font-medium text-slate-800 mb-4">Upload Photos (Optional)</h2>
            <InteractivePhotoUploader
              photos={photos}
              onFilesSelected={(files) => {
                const newPhotos = files.map(file => ({
                  id: crypto.randomUUID(),
                  originalFile: file,
                  previewUrl: null,
                  serverId: null,
                  uploadStatus: 'uploading' as const,
                }));
                handlePhotosChange([...photos, ...newPhotos]);
              }}
              onRemovePhoto={(id) => {
                setPhotos(prev => prev.filter(p => p.id !== id));
              }}
              isProcessing={isProcessing || isLoading}
            />
          </div>

          {/* Submit Button */}
          <Button
            onClick={handleSubmit}
            disabled={!formIsValid || isProcessing || isUploading}
            className="w-full"
            data-testid="save-day-button"
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isEditMode ? 'Updating...' : 'Saving...'}
              </>
            ) : (
              <>
                {isEditMode ? 'Update Ski Day' : 'Save Ski Day'}
              </>
            )}
          </Button>
        </div>
      </div>
      </div>
    </>
  );
}
