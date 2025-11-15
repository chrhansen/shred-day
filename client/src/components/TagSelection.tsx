import { useState } from "react";
import { SelectionPill } from "@/components/SelectionPill";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Plus, Check, X, Trash2 } from "lucide-react";
import type { Tag } from "@/types/ski";

interface TagSelectionProps {
  tags: Tag[] | undefined;
  selectedTagIds: string[];
  isLoading: boolean;
  isDisabled: boolean;
  deletingTagId: string | null;
  onToggleTag: (tagId: string) => void;
  onAddTag: (tagName: string) => void;
  onDeleteTag: (tagId: string) => void;
  isAddingTag: boolean;
  isDeletingTag: boolean;
}

export function TagSelection({
  tags,
  selectedTagIds,
  isLoading,
  isDisabled,
  deletingTagId,
  onToggleTag,
  onAddTag,
  onDeleteTag,
  isAddingTag,
  isDeletingTag,
}: TagSelectionProps) {
  const [isAddingInline, setIsAddingInline] = useState(false);
  const [newTagName, setNewTagName] = useState("");

  const handleConfirmAdd = () => {
    const trimmed = newTagName.trim();
    if (!trimmed) return;
    onAddTag(trimmed);
    setNewTagName("");
    setIsAddingInline(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleConfirmAdd();
    } else if (e.key === "Escape") {
      setIsAddingInline(false);
      setNewTagName("");
    }
  };

  return (
    <div>
      <h2 className="text-lg font-medium text-slate-800 mb-4">Tags</h2>
      <div className="flex flex-wrap gap-2 items-center">
        {isLoading ? (
          <div className="flex items-center text-slate-500">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading tags...
          </div>
        ) : (
          tags?.map((tag) => (
            <SelectionPill
              key={tag.id}
              label={tag.name}
              selected={selectedTagIds.includes(tag.id)}
              onClick={() => onToggleTag(tag.id)}
              disabled={isDisabled || (!!deletingTagId && deletingTagId !== tag.id)}
              data-testid={`tag-${tag.name.toLowerCase().replace(/\s+/g, '-')}`}
            >
              <span
                role="button"
                aria-label={`Delete ${tag.name}`}
                className="inline-flex items-center justify-center text-xs rounded-full"
                onClick={(event) => {
                  event.stopPropagation();
                  if (!isDisabled) {
                    onDeleteTag(tag.id);
                  }
                }}
              >
                {deletingTagId === tag.id && isDeletingTag ? (
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
              placeholder="Tag name"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              onKeyDown={handleKeyPress}
              disabled={isDisabled || isAddingTag}
              className="h-8 w-32"
              autoFocus
            />
            <Button
              size="sm"
              variant="ghost"
              onClick={handleConfirmAdd}
              disabled={!newTagName.trim() || isDisabled || isAddingTag}
              className="h-8 w-8 p-0"
            >
              {isAddingTag ? (
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
                setNewTagName("");
              }}
              disabled={isDisabled || isAddingTag}
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
            Add tag
          </Button>
        )}
      </div>
    </div>
  );
}
