import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { textImportService, type TextImport } from "@/services/textImportService";
import { type DraftDay } from "@/types/ski";
import { toast } from "sonner";

export function useTextImport() {
  const navigate = useNavigate();
  const { importId } = useParams<{ importId: string }>();
  const queryClient = useQueryClient();
  
  // State
  const [inputText, setInputText] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [textImport, setTextImport] = useState<TextImport | null>(null);
  const [draftDays, setDraftDays] = useState<DraftDay[]>([]);
  const [showDrafts, setShowDrafts] = useState(false);
  const [selectedSeason, setSelectedSeason] = useState<number>(0);
  const [isConfirmCommitOpen, setIsConfirmCommitOpen] = useState(false);
  const [commitSummary, setCommitSummary] = useState({ newDays: 0, mergeDays: 0, skippedDays: 0 });
  const [isConfirmCancelOpen, setIsConfirmCancelOpen] = useState(false);

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

  // Mutations
  const { mutate: createAndProcessImport, isPending: isProcessing } = useMutation({
    mutationFn: async ({ text, file, seasonOffset }: { text?: string; file?: File; seasonOffset: number }) => {
      return await textImportService.createAndProcessTextImport(text, file, seasonOffset);
    },
    onSuccess: (data) => {
      setTextImport(data);
      setDraftDays(data.draft_days || []);
      setShowDrafts(true);
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
    mutationFn: ({ id, decision }: { id: string; decision: "merge" | "duplicate" | "skip" }) =>
      textImportService.updateDraftDayDecision(id, decision),
    onSuccess: (updatedDraft) => {
      setDraftDays(prev => prev.map(day => 
        day.id === updatedDraft.id ? { ...day, ...updatedDraft } : day
      ));
    },
    onError: (error) => {
      toast.error(`Failed to update decision: ${error.message}`);
    },
  });

  const { mutate: updateDraftDayDetails } = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: { date?: string; resort_id?: string } }) =>
      textImportService.updateDraftDay(id, updates),
    onSuccess: (updatedDraft) => {
      setDraftDays(prev => prev.map(day => 
        day.id === updatedDraft.id ? { ...day, ...updatedDraft } : day
      ));
    },
    onError: (error) => {
      toast.error(`Failed to update draft day: ${error.message}`);
    },
  });

  // Actions
  const handleParse = async () => {
    if (!inputText.trim() && !selectedFile) {
      toast.error("Please provide text or select a file");
      return;
    }

    createAndProcessImport({
      text: inputText.trim() || undefined,
      file: selectedFile || undefined,
      seasonOffset: selectedSeason,
    });
  };

  const handleDraftEdit = (id: string, updatedDay: Partial<DraftDay>) => {
    if ('decision' in updatedDay) {
      const decision = updatedDay.decision as "merge" | "duplicate" | "skip";
      updateDraftDayDecision({ id, decision });
    }
    
    if ('date' in updatedDay || 'resort' in updatedDay) {
      const updates: { date?: string; resort_id?: string } = {};
      if ('date' in updatedDay && updatedDay.date) {
        updates.date = updatedDay.date;
      }
      if ('resort' in updatedDay && updatedDay.resort) {
        updates.resort_id = updatedDay.resort.id;
      }
      updateDraftDayDetails({ id, updates });
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
    if (textImport && draftDays.length > 0) {
      setIsConfirmCancelOpen(true);
    } else {
      navigate("/");
    }
  };

  const confirmAndCancelImport = () => {
    setIsConfirmCancelOpen(false);
    if (textImport) {
      cancelImportMutation();
    } else {
      navigate("/");
    }
  };

  const handleSeasonChange = (seasonOffset: number) => {
    setSelectedSeason(seasonOffset);
  };

  const handleTextChange = (value: string) => {
    setInputText(value);
    if (value && selectedFile) {
      setSelectedFile(null);
    }
  };

  const handleFileSelect = (file: File | null) => {
    setSelectedFile(file);
    if (file) {
      setInputText("");
    }
  };

  return {
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
  };
}