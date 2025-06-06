import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, Upload, FileText, Loader2 } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { TextDraftDayList } from "../components/TextDraftDayList";
import { type DraftDay } from "@/types/ski";
import { textImportService, type TextImport } from "@/services/textImportService";
import { toast } from "sonner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import SeasonDropdown from "@/components/SeasonDropdown";
import { useAuth } from "@/contexts/AuthContext";
import { getSeasonDisplayName, getFormattedSeasonDateRange } from "@/utils/seasonFormatters";
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

export default function TextImportPage() {
  const navigate = useNavigate();
  const { importId } = useParams<{ importId: string }>();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [inputText, setInputText] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [textImport, setTextImport] = useState<TextImport | null>(null);
  const [draftDays, setDraftDays] = useState<DraftDay[]>([]);
  const [showDrafts, setShowDrafts] = useState(false);
  const [selectedSeason, setSelectedSeason] = useState<number>(0); // Default to this season
  const [isConfirmCommitOpen, setIsConfirmCommitOpen] = useState(false);
  const [commitSummary, setCommitSummary] = useState({ newDays: 0, mergeDays: 0, skippedDays: 0 });
  const [isConfirmCancelOpen, setIsConfirmCancelOpen] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  // Fetch existing text import if importId is provided
  const { data: existingTextImport, isLoading: isLoadingExisting } = useQuery({
    queryKey: ['textImport', importId],
    queryFn: () => textImportService.getTextImport(importId!),
    enabled: !!importId,
  });

  // Update state when existing text import is loaded
  useEffect(() => {
    if (existingTextImport) {
      setTextImport(existingTextImport);
      setDraftDays(existingTextImport.draft_days || []);
      setInputText(existingTextImport.original_text || "");
      setShowDrafts(true);
    }
  }, [existingTextImport]);

  const { mutate: createAndProcessImport, isPending: isProcessing } = useMutation({
    mutationFn: async ({ text, file, seasonOffset }: { text?: string; file?: File; seasonOffset: number }) => {
      return await textImportService.createAndProcessTextImport(text, file, seasonOffset);
    },
    onSuccess: (data) => {
      setTextImport(data);
      setDraftDays(data.draft_days || []);
      setShowDrafts(true);
      // Update URL to include the import ID
      navigate(`/text-imports/${data.id}`, { replace: true });
      toast.success(`Found ${data.draft_days?.length || 0} potential ski days`);
    },
    onError: (error) => {
      toast.error(`Failed to parse text/file: ${error.message}`);
    },
  });

  const { mutate: commitImport, isPending: isCommitting } = useMutation({
    mutationFn: () => textImportService.commitTextImport(textImport!.id),
    onSuccess: () => {
      toast.success(`Successfully imported ${draftDays.filter(d => d.decision && d.decision !== "skip").length} ski days`);
      queryClient.invalidateQueries({ queryKey: ['days'] });
      queryClient.invalidateQueries({ queryKey: ['skiStats'] });
      navigate("/");
    },
    onError: (error) => {
      toast.error(`Failed to commit ski days: ${error.message}`);
    },
  });

  const { mutate: cancelImportMutation, isPending: isCancelling } = useMutation({
    mutationFn: () => textImportService.cancelTextImport(textImport!.id),
    onSuccess: () => {
      toast.success("Text import canceled and deleted.");
      navigate("/");
    },
    onError: (error) => {
      toast.error(`Failed to cancel import: ${error.message}`);
    },
  });

  const { mutate: updateDraftDayDecision } = useMutation({
    mutationFn: ({ draftDayId, decision }: { draftDayId: string; decision: "merge" | "duplicate" | "skip" }) =>
      textImportService.updateDraftDayDecision(draftDayId, decision),
    onSuccess: () => {
      // Optionally refetch the text import to get the latest state
      if (importId) {
        queryClient.invalidateQueries({ queryKey: ['textImport', importId] });
      }
    },
    onError: (error) => {
      toast.error(`Failed to update decision: ${error.message}`);
    },
  });

  const { mutate: updateDraftDayDetails } = useMutation({
    mutationFn: ({ draftDayId, updates }: { draftDayId: string; updates: { date?: string; resort_id?: string } }) =>
      textImportService.updateDraftDay(draftDayId, updates),
    onSuccess: () => {
      toast.success("Draft day updated successfully!");
      if (importId) {
        queryClient.invalidateQueries({ queryKey: ['textImport', importId] });
      }
    },
    onError: (error) => {
      toast.error(`Failed to update draft day: ${error.message}`);
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setInputText("");
    }
  };

  const handleTextChange = (value: string) => {
    setInputText(value);
    if (selectedFile) {
      setSelectedFile(null);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setIsDraggingOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file) {
        setSelectedFile(file);
        setInputText("");
      }
      e.dataTransfer.clearData();
    }
  };

  const handleParse = async () => {
    if (!inputText.trim() && !selectedFile) {
      toast.error("Please enter text or select a file");
      return;
    }

    createAndProcessImport({
      text: inputText.trim() || undefined,
      file: selectedFile || undefined,
      seasonOffset: selectedSeason,
    });
  };

  const handleDraftEdit = (id: string, updatedDay: Partial<DraftDay>) => {
    // Update local state immediately
    setDraftDays(prev =>
      prev.map(day =>
        day.id === id ? { ...day, ...updatedDay } : day
      )
    );

    // If the decision changed and it's not pending, update it on the backend
    if (updatedDay.decision && updatedDay.decision !== "pending") {
      updateDraftDayDecision({ draftDayId: id, decision: updatedDay.decision });
    }
    
    // If date or resort changed, update those on the backend
    if (updatedDay.date || updatedDay.resort) {
      const updates: { date?: string; resort_id?: string } = {};
      if (updatedDay.date) {
        updates.date = updatedDay.date;
      }
      if (updatedDay.resort) {
        updates.resort_id = updatedDay.resort.id;
      }
      updateDraftDayDetails({ draftDayId: id, updates });
    }
  };

  const handleCommit = async () => {
    const newDaysCount = draftDays.filter(d => d.decision === 'duplicate').length;
    const mergeDaysCount = draftDays.filter(d => d.decision === 'merge').length;
    const skippedDaysCount = draftDays.filter(d => d.decision === 'skip').length;

    setCommitSummary({ newDays: newDaysCount, mergeDays: mergeDaysCount, skippedDays: skippedDaysCount });
    setIsConfirmCommitOpen(true);
  };

  const confirmAndCommitImport = () => {
    setIsConfirmCommitOpen(false);
    commitImport();
  };

  const handleCancel = () => {
    if (textImport) {
      // Show confirmation dialog if there's an active import (URL has importId)
      setIsConfirmCancelOpen(true);
    } else {
      // Just navigate back if no import exists (URL is just /text-import)
      navigate('/');
    }
  };

  const confirmAndCancelImport = () => {
    setIsConfirmCancelOpen(false);
    if (textImport) {
      cancelImportMutation();
    } else {
      navigate('/');
    }
  };

  const handleSeasonChange = (seasonOffsetString: string) => {
    const seasonNumber = parseInt(seasonOffsetString, 10);
    setSelectedSeason(seasonNumber);
  };

  // Prepare season data for dropdown - go back 15 years
  const seasonStartDay = user?.season_start_day || '09-01';
  const seasonsDataForDropdown = [];
  for (let offset = 0; offset >= -15; offset--) {
    const displayName = getSeasonDisplayName(offset);
    const dateRange = getFormattedSeasonDateRange(offset, seasonStartDay);
    seasonsDataForDropdown.push({ displayName, dateRange, value: offset.toString() });
  }
  const selectedSeasonDisplayName = getSeasonDisplayName(selectedSeason);

  // Loading state when fetching existing import
  if (importId && isLoadingExisting) {
    return (
      <div className="min-h-screen bg-white p-4 flex flex-col items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-lg text-slate-700">Loading text import...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <Button
            variant="ghost"
            className="text-slate-600 hover:text-slate-800"
            onClick={handleCancel}
          >
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
        </div>

        <h1 className="text-2xl font-bold text-slate-800 mb-8 text-center">
          Import Ski Days from Text/CSV
        </h1>

        {!showDrafts ? (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="space-y-4">
              <div>
                <Textarea
                  value={inputText}
                  onChange={(e) => handleTextChange(e.target.value)}
                  placeholder={`Paste your ski day entries here... Example:
Jan 15 - Skied at Whistler
Sep. 21, Stubai, Atomic S9, with Viggo
2025-02-01: Revelstoke powder day`}
                  className="min-h-[200px]"
                  disabled={!!selectedFile}
                />
              </div>

              <div className="flex items-center gap-4">
                <div className="flex-1 h-px bg-slate-200"></div>
                <span className="text-sm text-slate-500">OR</span>
                <div className="flex-1 h-px bg-slate-200"></div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Upload CSV/text file
                </label>
                <div className="space-y-2">
                  <label
                    htmlFor="file-upload-text-import"
                    className={`flex items-center justify-center w-full h-16 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-blue-500 hover:bg-slate-50 transition-colors ${
                      isDraggingOver ? 'border-blue-600 bg-blue-50' : ''
                    } ${!!inputText.trim() ? 'cursor-not-allowed opacity-70' : ''}`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  >
                    <div className="text-center text-slate-500">
                      <Upload className="mx-auto h-6 w-6 mb-1" />
                      <span className="text-sm">Click or drag to upload</span>
                    </div>
                    <Input
                      id="file-upload-text-import"
                      type="file"
                      accept=".csv,.txt,.text"
                      onChange={handleFileSelect}
                      disabled={!!inputText.trim()}
                      className="sr-only"
                    />
                  </label>
                  {selectedFile && (
                    <div className="flex items-center text-sm text-slate-600 justify-center">
                      <FileText className="h-4 w-4 mr-1" />
                      {selectedFile.name}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <Button
              onClick={handleParse}
              disabled={isProcessing || (!inputText.trim() && !selectedFile)}
              className="w-full h-14 text-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg transition-all hover:shadow-xl mt-6"
            >
              {isProcessing ? (
                <>Processing...</>
              ) : (
                <>
                  <Upload className="h-5 w-5 mr-2" />
                  Parse and Create Draft Days
                </>
              )}
            </Button>


            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Default Season for dates without year
              </label>
              <div className="flex items-center gap-2">
                <SeasonDropdown
                  selectedSeason={selectedSeasonDisplayName}
                  seasonsData={seasonsDataForDropdown}
                  onSeasonChange={handleSeasonChange}
                />
                <span className="text-sm text-slate-500">
                  (Used when no year is found in date)
                </span>
              </div>
            </div>

            <div className="bg-slate-50 rounded-lg p-4">
              <h3 className="font-medium text-slate-800 mb-2">How it works:</h3>
              <ol className="text-sm text-slate-600 space-y-1 list-decimal list-inside">
                <li>Enter text or upload a CSV/text file containing your ski day entries</li>
                <li>Our system will parse the text and extract dates and resort names</li>
                <li>Review and edit the detected ski days</li>
                <li>Choose to merge with existing days, create duplicates, or skip entries</li>
                <li>Commit your changes to add the days to your ski log</li>
              </ol>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-medium text-slate-800">
                Review Draft Days ({draftDays.length} found)
              </h2>
              <div className="flex gap-2">
                <Button
                  onClick={handleCommit}
                  disabled={draftDays.filter(d => d.decision && d.decision !== "skip").length === 0 || isCommitting}
                  size="sm"
                  className="text-sm bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md transition-all hover:shadow-lg"
                >
                  {isCommitting ? "Committing..." : `Commit ${draftDays.filter(d => d.decision && d.decision !== "skip").length} Days`}
                </Button>
              </div>
            </div>

            <TextDraftDayList
              draftDays={draftDays}
              onDraftEdit={handleDraftEdit}
            />
          </div>
        )}

        {/* Confirmation Dialogs */}
        <AlertDialog open={isConfirmCommitOpen} onOpenChange={setIsConfirmCommitOpen}>
          <AlertDialogContent data-testid="confirm-import-dialog">
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Import</AlertDialogTitle>
              <AlertDialogDescription>
                You are about to finalize this text import:
                <ul className="list-disc pl-5 mt-2 text-sm text-slate-700">
                  {commitSummary.newDays > 0 && <li>{commitSummary.newDays} new ski day(s) will be created.</li>}
                  {commitSummary.mergeDays > 0 && <li>{commitSummary.mergeDays} entry(ies) will be merged into existing ski days.</li>}
                  {commitSummary.skippedDays > 0 && <li>{commitSummary.skippedDays} entry(ies) will be skipped.</li>}
                  {commitSummary.newDays === 0 && commitSummary.mergeDays === 0 && commitSummary.skippedDays === 0 &&
                    <li>No specific actions selected for draft days. This will simply mark the import as reviewed.</li>}
                </ul>
                Are you sure you want to proceed?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmAndCommitImport} disabled={isCommitting}>
                {isCommitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Proceed with Import
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={isConfirmCancelOpen} onOpenChange={setIsConfirmCancelOpen}>
          <AlertDialogContent data-testid="confirm-cancel-dialog">
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Cancellation</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to cancel this text import? All parsed days and draft entries for this session will be deleted. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep Importing</AlertDialogCancel>
              <AlertDialogAction onClick={confirmAndCancelImport} disabled={isCancelling} className="bg-red-600 hover:bg-red-700">
                {isCancelling ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Yes, Cancel Import
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
