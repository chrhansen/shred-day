import { useState } from "react";
import { SelectionPill } from "@/components/SelectionPill";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Plus, Check, X, Trash2 } from "lucide-react";
import type { Label } from "@/types/ski";

interface LabelSelectionProps {
  labels: Label[] | undefined;
  selectedLabelIds: string[];
  isLoading: boolean;
  isDisabled: boolean;
  deletingLabelId: string | null;
  onToggleLabel: (labelId: string) => void;
  onAddLabel: (labelName: string) => void;
  onDeleteLabel: (labelId: string) => void;
  isAddingLabel: boolean;
  isDeletingLabel: boolean;
}

export function LabelSelection({
  labels,
  selectedLabelIds,
  isLoading,
  isDisabled,
  deletingLabelId,
  onToggleLabel,
  onAddLabel,
  onDeleteLabel,
  isAddingLabel,
  isDeletingLabel,
}: LabelSelectionProps) {
  const [isAddingInline, setIsAddingInline] = useState(false);
  const [newLabelName, setNewLabelName] = useState("");

  const handleConfirmAdd = () => {
    const trimmed = newLabelName.trim();
    if (!trimmed) return;
    onAddLabel(trimmed);
    setNewLabelName("");
    setIsAddingInline(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleConfirmAdd();
    } else if (e.key === "Escape") {
      setIsAddingInline(false);
      setNewLabelName("");
    }
  };

  return (
    <div>
      <h2 className="text-lg font-medium text-slate-800 mb-4">Labels</h2>
      <div className="flex flex-wrap gap-2 items-center">
        {isLoading ? (
          <div className="flex items-center text-slate-500">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading labels...
          </div>
        ) : (
          labels?.map((label) => (
            <SelectionPill
              key={label.id}
              label={label.name}
              selected={selectedLabelIds.includes(label.id)}
              onClick={() => onToggleLabel(label.id)}
              disabled={isDisabled || (!!deletingLabelId && deletingLabelId !== label.id)}
              data-testid={`label-${label.name.toLowerCase().replace(/\s+/g, '-')}`}
            >
              <span
                role="button"
                aria-label={`Delete ${label.name}`}
                className="inline-flex items-center justify-center text-xs rounded-full"
                onClick={(event) => {
                  event.stopPropagation();
                  if (!isDisabled) {
                    onDeleteLabel(label.id);
                  }
                }}
              >
                {deletingLabelId === label.id && isDeletingLabel ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Trash2 className="h-3 w-3" />
                )}
              </span>
            </SelectionPill>
          ))
        )}

        {isAddingInline ? (
          <div className="flex items-center gap-1">
            <Input
              type="text"
              placeholder="Label name"
              value={newLabelName}
              onChange={(e) => setNewLabelName(e.target.value)}
              onKeyDown={handleKeyPress}
              disabled={isDisabled || isAddingLabel}
              className="h-8 w-32"
              autoFocus
            />
            <Button
              size="sm"
              variant="ghost"
              onClick={handleConfirmAdd}
              disabled={!newLabelName.trim() || isDisabled || isAddingLabel}
              className="h-8 w-8 p-0"
            >
              {isAddingLabel ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4 text-green-600" />
              )}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setIsAddingInline(false);
                setNewLabelName("");
              }}
              disabled={isDisabled || isAddingLabel}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4 text-red-600" />
            </Button>
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAddingInline(true)}
            disabled={isDisabled}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add label
          </Button>
        )}
      </div>
    </div>
  );
}
