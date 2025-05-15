import { useState, useCallback, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { InteractivePhotoUploader } from "@/components/InteractivePhotoUploader";
import { PhotoList } from "@/components/PhotoList";
import { type DraftDay as UIDraftDay, type SkiPhoto, type PhotoImport, type PhotoPreview, type ServerPhoto } from "@/types/ski";
import { photoImportService } from "@/services/photoImportService";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { format as formatDateStr } from 'date-fns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Client-side representation of a DraftDay for the UI, after processing API data
interface ProcessedDraftDay extends Omit<UIDraftDay, 'date' | 'photos' | 'resort'> {
  date: Date; // Converted to Date object
  resortName: string; // Extracted for display
  resortId?: string | null;
  photos: SkiPhoto[]; // Photos mapped to SkiPhoto for PhotoItem consumption
  skiDayExists: boolean; // Added to indicate if the day exists
}

export default function PhotoImportPage() {
  const navigate = useNavigate();
  const { importId } = useParams<{ importId: string }>();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [currentPhotoImport, setCurrentPhotoImport] = useState<PhotoImport | null>(null);
  const [uploadingPhotos, setUploadingPhotos] = useState<PhotoPreview[]>([]);

  // State for display in PhotoList
  const [displayedDraftDays, setDisplayedDraftDays] = useState<ProcessedDraftDay[]>([]);
  const [displayedStrippedPhotos, setDisplayedStrippedPhotos] = useState<SkiPhoto[]>([]);

  const { data: photoImportData, isLoading: isLoadingImportDetails, error: importDetailsError, status: photoImportQueryStatus } = useQuery({
    queryKey: ['photoImport', importId],
    queryFn: () => photoImportService.getPhotoImport(importId!),
    enabled: !!importId,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (data?.status === 'committed' || data?.status === 'canceled') return false;
      if (data?.status === 'processing' || uploadingPhotos.some(p => p.uploadStatus === 'uploading' || p.uploadStatus === 'completed')) return 2000;
      if (data?.status === 'ready_for_review') return false;
      return 2000;
    },
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
  });

  // Helper to map ServerPhoto to SkiPhoto for UI components like PhotoItem
  const mapServerPhotoToSkiPhoto = (serverPhoto: ServerPhoto): SkiPhoto => ({
    id: serverPhoto.id,
    url: serverPhoto.preview_url || serverPhoto.full_url || '',
    date: serverPhoto.taken_at ? new Date(serverPhoto.taken_at) : undefined,
    resort: serverPhoto.resort?.name || undefined,
    originalResortId: serverPhoto.resort?.id || null,
    latitude: serverPhoto.latitude,
    longitude: serverPhoto.longitude,
    status: 'pending', // Default UI status for individual photo, might be overridden by group decision
    exif_state: serverPhoto.exif_state || 'missing',
    uploadStatus: 'completed', // Assumed completed if it's from server
    serverId: serverPhoto.id,
  });

  useEffect(() => {
    if (photoImportQueryStatus === 'success' && photoImportData) {
      setCurrentPhotoImport(photoImportData);

      // Process draft_days from server
      const serverDraftDays = photoImportData.draft_days || [];
      const newDisplayedDraftDays: ProcessedDraftDay[] = serverDraftDays.map(dd => ({
        ...dd, // id, decision (from server)
        date: new Date(dd.date),
        resortName: dd.resort?.name || 'Unknown Resort',
        resortId: dd.resort?.id,
        photos: (dd.photos || []).map(mapServerPhotoToSkiPhoto),
        skiDayExists: !!dd.day_id, // Set skiDayExists based on presence of day_id
      }));
      setDisplayedDraftDays(newDisplayedDraftDays);

      // Process root-level photos for the "stripped" section
      const serverRootPhotos = photoImportData.photos || [];
      const newStrippedPhotos = serverRootPhotos
        .filter(p => p.exif_state === 'missing')
        .map(mapServerPhotoToSkiPhoto);
      setDisplayedStrippedPhotos(newStrippedPhotos);

      // Remove photos from uploadingPhotos list if they are now processed by backend
      setUploadingPhotos(prevUploading => {
        const processedServerPhotoIds = new Set(
          serverRootPhotos.filter(p => p.exif_state && p.exif_state !== 'pending').map(p => p.id)
        );
        serverDraftDays.forEach(dd => {
            (dd.photos || []).forEach(p => processedServerPhotoIds.add(p.id));
        });
        return prevUploading.filter(up => !up.serverId || !processedServerPhotoIds.has(up.serverId));
      });

      if (photoImportData.status === "committed" || photoImportData.status === "canceled") {
        toast({ title: "Import session closed", description: `This import is already ${photoImportData.status}.` });
        navigate("/");
      }
    }
  }, [photoImportQueryStatus, photoImportData, navigate, toast]);

  useEffect(() => {
    if (photoImportQueryStatus === 'error' && importDetailsError) {
      toast({ title: "Error fetching import details", description: importDetailsError.message, variant: "destructive" });
      navigate("/");
    }
  }, [photoImportQueryStatus, importDetailsError, navigate, toast]);

  const handleFileUpload = useCallback(async (clientPhotoId: string, file: File) => {
    if (!importId) {
      toast({ title: "Cannot upload photo: Import session ID missing.", variant: "destructive" });
      setUploadingPhotos(prev => prev.map(p => (p.id === clientPhotoId ? { ...p, uploadStatus: 'failed' } : p)));
      return;
    }
    try {
      const serverPhotoData = await photoImportService.addPhotoToImport(importId, file);
      setUploadingPhotos(prev =>
        prev.map(p =>
          p.id === clientPhotoId
            ? { ...p, uploadStatus: 'completed', serverId: serverPhotoData.id, previewUrl: serverPhotoData.preview_url }
            : p
        )
      );
    } catch (error) {
      setUploadingPhotos(prev =>
        prev.map(p => (p.id === clientPhotoId ? { ...p, uploadStatus: 'failed', errorMessage: error.message } : p))
      );
      toast({ title: `Upload failed for ${file.name}`, description: error.message, variant: "destructive" });
    }
  }, [importId, toast]);

  const handleFilesSelectedForUpload = useCallback((files: File[]) => {
    const newPreviews: PhotoPreview[] = files.map(file => ({
      id: crypto.randomUUID(),
      originalFile: file,
      previewUrl: URL.createObjectURL(file),
      serverId: null,
      uploadStatus: 'uploading',
    }));
    setUploadingPhotos(prev => [...prev, ...newPreviews]);
    newPreviews.forEach(p => handleFileUpload(p.id, p.originalFile!));
  }, [handleFileUpload]);

  const handleRemoveUploadingPhoto = useCallback((clientPhotoId: string) => {
    const photoToRemove = uploadingPhotos.find(p => p.id === clientPhotoId);
    setUploadingPhotos(prev => prev.filter(p => p.id !== clientPhotoId));
    if (photoToRemove?.previewUrl && photoToRemove.originalFile) {
        URL.revokeObjectURL(photoToRemove.previewUrl);
    }
  }, [uploadingPhotos]);

  const handleProcessedPhotoUpdate = useCallback(async (photoId: string, updates: { date?: Date | null; resortId?: string | null; resortName?: string | null }) => {
    if (!importId) {
      toast({ title: "Error updating photo", description: "Import ID missing.", variant: "destructive" });
      return;
    }
    const payload: { taken_at?: string; resort_id?: string | null } = {};
    if (updates.date) payload.taken_at = formatDateStr(updates.date, 'yyyy-MM-dd');
    if (updates.hasOwnProperty('resortId')) payload.resort_id = updates.resortId;
    if (Object.keys(payload).length === 0 && !updates.hasOwnProperty('resortId')) {
      toast({ title: "No changes to save", variant: "default" });
      return;
    }
    try {
      await photoImportService.updatePhotoInImport(importId, photoId, payload);
      toast({ title: "Photo updated successfully!" });
      queryClient.invalidateQueries({ queryKey: ['photoImport', importId] });
    } catch (error) {
      toast({ title: "Failed to update photo", description: error.message, variant: "destructive" });
    }
  }, [importId, toast, queryClient]);

  const handleDraftDayDecisionChange = useCallback(async (draftDayId: string, decision: "merge" | "duplicate" | "skip") => {
    if (!importId) {
      toast({ title: "Error updating decision", description: "Import session ID missing.", variant: "destructive"});
      return;
    }
    try {
      // Optimistically update UI - though not strictly necessary if polling is fast or we invalidate
      // setDisplayedDraftDays(prev =>
      //   prev.map(dd => dd.id === draftDayId ? {...dd, decision: decision as UIDraftDay['decision']} : dd)
      // );

      await photoImportService.updateDraftDayDecision(draftDayId, decision);
      toast({ title: `Decision changed to: ${decision}` });
      queryClient.invalidateQueries({ queryKey: ['photoImport', importId] }); // Refetch to get confirmed state
    } catch (error) {
      toast({ title: "Failed to update decision", description: error.message, variant: "destructive" });
      // Optionally revert optimistic update here if you implemented it
    }
  }, [importId, queryClient, toast]);

  const handleDeleteProcessedPhoto = useCallback(async (photoId: string) => {
    if (!importId) {
      toast({ title: "Error deleting photo", description: "Import session ID missing.", variant: "destructive" });
      return;
    }
    try {
      await photoImportService.deletePhotoFromImport(importId, photoId);
      toast({ title: "Photo deleted successfully!" });
      queryClient.invalidateQueries({ queryKey: ['photoImport', importId] });
    } catch (error) {
      toast({ title: "Failed to delete photo", description: error.message, variant: "destructive" });
    }
  }, [importId, toast, queryClient]);

  const handleCancel = useCallback(() => { navigate("/"); }, [navigate]);

  const { mutate: commitImport, isPending: isCommittingImport } = useMutation({
    mutationFn: () => photoImportService.commitPhotoImport(importId!),
    onSuccess: (data) => {
      toast({ title: "Import committed successfully!", description: "Days have been created/updated." });
      queryClient.invalidateQueries({ queryKey: ['photoImport', importId] }); // To get final committed state
      queryClient.invalidateQueries({ queryKey: ['days'] }); // To update main days list
      queryClient.invalidateQueries({ queryKey: ['skiStats'] });
      // Optionally navigate away after a delay or if data.status is committed
      if (data.status === 'committed' || data.status === 'completed') { // 'completed' if backend uses that as final
        navigate("/");
      }
    },
    onError: (error) => {
      toast({ title: "Failed to commit import", description: error.message, variant: "destructive" });
    },
  });

  const handleSaveImport = useCallback(() => {
    const newDaysCount = displayedDraftDays.filter(dd => dd.decision === 'duplicate').length;
    const mergeDaysCount = displayedDraftDays.filter(dd => dd.decision === 'merge').length;
    const skippedDaysCount = displayedDraftDays.filter(dd => dd.decision === 'skip').length;

    setSaveSummary({ newDays: newDaysCount, mergeDays: mergeDaysCount, skippedDays: skippedDaysCount });
    setIsConfirmSaveOpen(true);
  }, [displayedDraftDays]);

  const confirmAndCommitImport = () => {
    setIsConfirmSaveOpen(false);
    commitImport();
  };

  const anyClientUploading = uploadingPhotos.some(p => p.uploadStatus === 'uploading');
  const backendIsProcessing = photoImportData?.status === 'processing';
  const showOverallSpinner = anyClientUploading || (backendIsProcessing && displayedDraftDays.length === 0 && displayedStrippedPhotos.length === 0 && uploadingPhotos.length === 0);

  const [isConfirmSaveOpen, setIsConfirmSaveOpen] = useState(false);
  const [saveSummary, setSaveSummary] = useState({ newDays: 0, mergeDays: 0, skippedDays: 0 });

  if (isLoadingImportDetails && !photoImportData) {
    return (
      <div className="min-h-screen bg-white p-4 flex flex-col items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <p className="mt-2 text-slate-600">Loading import session...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white p-4">
      <div className="max-w-3xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <Button variant="ghost" onClick={handleCancel} disabled={anyClientUploading || backendIsProcessing}>
            <ChevronLeft className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <h1 className="text-2xl font-bold text-slate-800 text-center flex-1">
            Import Photos
          </h1>
          <div className="w-auto min-w-[100px] text-right">
            {displayedDraftDays.length > 0 && displayedDraftDays.some(dd => dd.decision && dd.decision !== 'pending' && dd.decision !== 'skip') && (
                <Button onClick={handleSaveImport} disabled={anyClientUploading || backendIsProcessing || isCommittingImport}>
                    {isCommittingImport ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Save Import
                </Button>
            )}
          </div>
        </div>

        {(photoImportData?.status !== 'committed' && photoImportData?.status !== 'canceled') && (
          <div className="mb-8 p-0 rounded-lg bg-slate-50">
            <InteractivePhotoUploader
              photos={uploadingPhotos}
              onFilesSelected={handleFilesSelectedForUpload}
              onRemovePhoto={handleRemoveUploadingPhoto}
              isProcessing={anyClientUploading}
              acceptedFileTypes=".jpg,.jpeg,.png,.gif,.heic,.heif"
            />
          </div>
        )}

        {showOverallSpinner && (
            <div className="my-8 p-4 text-center">
                <Loader2 className="h-6 w-6 animate-spin text-slate-500 inline mr-2" />
                <span>{anyClientUploading ? 'Uploading photos...' : (backendIsProcessing ? 'Processing photos on server...' : 'Loading...')}</span>
            </div>
        )}

        {(displayedStrippedPhotos.length > 0 || displayedDraftDays.length > 0) && (
          <div className="mt-8">
             <div className="flex justify-between items-center mb-4">
               <h2 className="text-xl font-semibold">Review Imported Photos</h2>
             </div>
            <PhotoList
              strippedPhotos={displayedStrippedPhotos}
              draftDayGroups={displayedDraftDays}
              onPhotoUpdate={handleProcessedPhotoUpdate}
              onDraftDayDecisionChange={handleDraftDayDecisionChange}
              onDeletePhoto={handleDeleteProcessedPhoto}
            />
          </div>
        )}

        {!isLoadingImportDetails && !anyClientUploading && !backendIsProcessing && displayedStrippedPhotos.length === 0 && displayedDraftDays.length === 0 && photoImportData && (
           <div className="mt-8 p-6 text-center bg-slate-50 rounded-lg">
             <p className="text-slate-600">
                {photoImportData.status === 'ready_for_review' || photoImportData.status === 'waiting' ?
                    'Drop photos above to start your import and automatically draft days.' :
                    'Import session is in an unexpected state.'
                }
             </p>
          </div>
        )}

        <AlertDialog open={isConfirmSaveOpen} onOpenChange={setIsConfirmSaveOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Import</AlertDialogTitle>
              <AlertDialogDescription>
                You are about to finalize this photo import:
                <ul className="list-disc pl-5 mt-2 text-sm text-slate-700">
                  {saveSummary.newDays > 0 && <li>{saveSummary.newDays} new ski day(s) will be created.</li>}
                  {saveSummary.mergeDays > 0 && <li>Photos will be merged into {saveSummary.mergeDays} existing ski day(s).</li>}
                  {saveSummary.skippedDays > 0 && <li>{saveSummary.skippedDays} group(s) of photos will be skipped.</li>}
                  {saveSummary.newDays === 0 && saveSummary.mergeDays === 0 && saveSummary.skippedDays === 0 &&
                    <li>No specific actions selected for draft days. This will simply mark the import as reviewed.</li>}
                </ul>
                Are you sure you want to proceed?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmAndCommitImport} disabled={isCommittingImport}>
                {isCommittingImport ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Proceed with Import
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
