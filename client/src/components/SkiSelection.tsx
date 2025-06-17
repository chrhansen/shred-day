import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SelectionPill } from "@/components/SelectionPill";
import { Loader2, Plus, Check, X } from "lucide-react";
import type { Ski } from "@/types/ski";

interface SkiSelectionProps {
  userSkis: Ski[] | undefined;
  selectedSkis: string[];
  isLoadingSkis: boolean;
  isDisabled: boolean;
  onToggleSki: (skiId: string) => void;
  onAddSki: (name: string) => void;
  isAddingSki: boolean;
}

export function SkiSelection({
  userSkis,
  selectedSkis,
  isLoadingSkis,
  isDisabled,
  onToggleSki,
  onAddSki,
  isAddingSki,
}: SkiSelectionProps) {
  const [isAddingSkiInline, setIsAddingSkiInline] = useState(false);
  const [newInlineSkiName, setNewInlineSkiName] = useState("");

  const handleAddSkiClick = () => {
    setIsAddingSkiInline(true);
  };

  const handleConfirmAddSki = () => {
    if (newInlineSkiName.trim()) {
      onAddSki(newInlineSkiName.trim());
      setNewInlineSkiName("");
      setIsAddingSkiInline(false);
    }
  };

  const handleCancelAddSki = () => {
    setIsAddingSkiInline(false);
    setNewInlineSkiName("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleConfirmAddSki();
    } else if (e.key === 'Escape') {
      handleCancelAddSki();
    }
  };

  return (
    <div>
      <h2 className="text-lg font-medium text-slate-800 mb-4">Select Ski(s)</h2>
      <div className="flex flex-wrap gap-2 items-center">
        {isLoadingSkis ? (
          <div className="flex items-center text-slate-500 w-full">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading skis...
          </div>
        ) : (
          userSkis?.map((ski) => (
            <SelectionPill
              key={ski.id}
              label={ski.name}
              selected={selectedSkis.includes(ski.id)}
              onClick={() => onToggleSki(ski.id)}
              disabled={isDisabled}
              data-testid={`ski-option-${ski.name.toLowerCase().replace(/\s+/g, '-')}`}
            />
          ))
        )}
        
        {isAddingSkiInline ? (
          <div className="flex items-center gap-1">
            <Input
              type="text"
              placeholder="Ski name"
              value={newInlineSkiName}
              onChange={(e) => setNewInlineSkiName(e.target.value)}
              onKeyDown={handleKeyPress}
              disabled={isDisabled || isAddingSki}
              className="h-8 w-32"
              autoFocus
            />
            <Button
              size="sm"
              variant="ghost"
              onClick={handleConfirmAddSki}
              disabled={!newInlineSkiName.trim() || isDisabled || isAddingSki}
              className="h-8 w-8 p-0"
            >
              {isAddingSki ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4 text-green-600" />
              )}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleCancelAddSki}
              disabled={isDisabled || isAddingSki}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4 text-red-600" />
            </Button>
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={handleAddSkiClick}
            disabled={isDisabled}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add ski
          </Button>
        )}
      </div>
    </div>
  );
}