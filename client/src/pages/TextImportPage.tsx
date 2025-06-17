import { Button } from "@/components/ui/button";
import { X, Loader2 } from "lucide-react";
import { TextDraftDayList } from "../components/TextDraftDayList";
import SeasonDropdown from "@/components/SeasonDropdown";
import { useAuth } from "@/contexts/AuthContext";
import { getSeasonDisplayName, getFormattedSeasonDateRange } from "@/utils/seasonFormatters";
import { TextInputSection } from "@/components/TextInputSection";
import { FileUploadSection } from "@/components/FileUploadSection";
import { ImportConfirmationDialogs } from "@/components/ImportConfirmationDialogs";
import { useTextImport } from "@/hooks/useTextImport";

export default function TextImportPage() {
  const { user } = useAuth();
  const {
    // State
    inputText,
    selectedFile,
    textImport,
    draftDays,
    showDrafts,
    selectedSeason,
    isConfirmCommitOpen,
    setIsConfirmCommitOpen,
    commitSummary,
    isConfirmCancelOpen,
    setIsConfirmCancelOpen,
    
    // Loading states
    isLoadingExisting,
    isProcessing,
    isCommitting,
    isCancelling,
    
    // Actions
    handleParse,
    handleDraftEdit,
    handleCommit,
    confirmAndCommitImport,
    handleCancel,
    confirmAndCancelImport,
    handleSeasonChange,
    handleTextChange,
    handleFileSelect,
  } = useTextImport();

  // Season dropdown data
  const seasonStartDay = user?.season_start_day || '09-01';
  const seasonsDataForDropdown = [];
  for (let offset = 0; offset >= -4; offset--) {
    const displayName = getSeasonDisplayName(offset);
    const dateRange = getFormattedSeasonDateRange(offset, seasonStartDay);
    seasonsDataForDropdown.push({ value: offset.toString(), label: `${displayName} (${dateRange})` });
  }
  const selectedSeasonDisplayName = getSeasonDisplayName(selectedSeason);

  // Loading state
  if (isLoadingExisting) {
    return (
      <div className="min-h-screen bg-white p-4 flex items-center justify-center">
        <div className="flex items-center text-slate-500">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Loading text import...
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

        <h1 className="text-2xl font-bold text-slate-800 mb-8 text-center" data-testid="text-import-title">
          Import Ski Days from Text/CSV
        </h1>

        {!showDrafts ? (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="space-y-4">
              <TextInputSection
                inputText={inputText}
                selectedFile={selectedFile}
                onChange={handleTextChange}
                isDisabled={isProcessing}
              />

              <div className="flex items-center gap-4">
                <div className="flex-1 h-px bg-slate-200"></div>
                <span className="text-sm text-slate-500">OR</span>
                <div className="flex-1 h-px bg-slate-200"></div>
              </div>

              <FileUploadSection
                selectedFile={selectedFile}
                inputText={inputText}
                onFileSelect={handleFileSelect}
                isDisabled={isProcessing}
              />
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-medium text-slate-700">Select Season</h3>
              <SeasonDropdown
                seasons={seasonsDataForDropdown}
                selectedValue={selectedSeason.toString()}
                onValueChange={(value) => handleSeasonChange(parseInt(value, 10))}
              />
              <p className="text-xs text-slate-500">
                Imported days will be assigned to the {selectedSeasonDisplayName} season
              </p>
            </div>

            <Button
              onClick={handleParse}
              disabled={(!inputText.trim() && !selectedFile) || isProcessing}
              className="w-full"
              data-testid="parse-button"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Parsing...
                </>
              ) : (
                'Parse and Create Draft Days'
              )}
            </Button>

            <div className="text-sm text-slate-600 space-y-2">
              <p className="font-medium">Supported formats:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Jan 15 - Skied at Whistler</li>
                <li>September 21, Stubai, Atomic S9, with Viggo</li>
                <li>2025-02-01: Revelstoke powder day</li>
                <li>CSV files with date and resort columns</li>
              </ul>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <TextDraftDayList
              draftDays={draftDays}
              onDraftEdit={handleDraftEdit}
            />

            <div className="flex justify-between items-center pt-6 border-t">
              <div className="text-sm text-slate-600">
                {draftDays.filter(d => d.decision !== 'skip').length} of {draftDays.length} days to import
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleCancel}
                  disabled={isCommitting || isCancelling}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCommit}
                  disabled={
                    draftDays.filter(d => d.decision !== 'skip').length === 0 || 
                    isCommitting || 
                    isCancelling
                  }
                >
                  {isCommitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    `Commit ${draftDays.filter(d => d.decision !== 'skip').length} Days`
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        <ImportConfirmationDialogs
          isConfirmCommitOpen={isConfirmCommitOpen}
          setIsConfirmCommitOpen={setIsConfirmCommitOpen}
          commitSummary={commitSummary}
          onConfirmCommit={confirmAndCommitImport}
          isConfirmCancelOpen={isConfirmCancelOpen}
          setIsConfirmCancelOpen={setIsConfirmCancelOpen}
          onConfirmCancel={confirmAndCancelImport}
        />
      </div>
    </div>
  );
}