import { format, parseISO } from "date-fns";
import { type DraftDay } from "@/types/ski";
import { Button } from "@/components/ui/button";
import { Edit } from "lucide-react";
import { useState } from "react";
import { TextDraftDayEditor } from "./TextDraftDayEditor";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface TextDraftDayListProps {
  draftDays: DraftDay[];
  onDraftEdit: (id: string, updatedDay: Partial<DraftDay>) => void;
}

export function TextDraftDayList({ draftDays, onDraftEdit }: TextDraftDayListProps) {
  const [editingDayId, setEditingDayId] = useState<string | null>(null);

  const handleStartEdit = (id: string) => {
    setEditingDayId(id);
  };

  const handleFinishEdit = () => {
    setEditingDayId(null);
  };

  const handleDecisionChange = (id: string, decision: "merge" | "duplicate" | "skip") => {
    onDraftEdit(id, { decision });
  };

  return (
    <div className="space-y-4">
      {draftDays.length > 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-slate-100 divide-y divide-slate-100">
          {draftDays.map((day) => (
            <div key={day.id} className="p-4">
              {editingDayId === day.id ? (
                <TextDraftDayEditor
                  day={day}
                  onSave={(updatedDay) => {
                    onDraftEdit(day.id, updatedDay);
                    handleFinishEdit();
                  }}
                  onCancel={handleFinishEdit}
                />
              ) : (
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-4">
                        <h3 className="text-lg font-medium text-slate-900">
                          {day.resort?.name || 'Unknown Resort'}
                        </h3>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex items-center gap-1"
                          onClick={() => handleStartEdit(day.id)}
                        >
                          <Edit className="h-3.5 w-3.5" />
                          Edit
                        </Button>
                      </div>
                      <div className="text-sm text-slate-500">
                        {format(parseISO(day.date), 'EEEE, MMMM d, yyyy')}
                      </div>

                      {day.original_text && (
                        <div className="bg-slate-50 rounded p-3 text-sm text-slate-600">
                          <span className="font-medium">Original text:</span> {day.original_text}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-700">Action:</span>
                    <Select
                      value={day.decision || "pending"}
                      onValueChange={(value: "merge" | "duplicate" | "skip") =>
                        handleDecisionChange(day.id, value)
                      }
                    >
                      <SelectTrigger className="w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="duplicate">Create new day</SelectItem>
                        <SelectItem value="merge">Merge with existing</SelectItem>
                        <SelectItem value="skip">Skip import</SelectItem>
                      </SelectContent>
                    </Select>

                    {day.decision === "skip" && (
                      <span className="text-sm text-slate-500 italic">
                        This day will not be imported
                      </span>
                    )}
                    {day.decision === "merge" && (
                      <span className="text-sm text-slate-500 italic">
                        Will merge with existing day on this date
                      </span>
                    )}
                    {day.decision === "duplicate" && (
                      <span className="text-sm text-slate-500 italic">
                        Will create a new ski day
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center p-8 bg-slate-50 rounded-lg">
          <p className="text-slate-500">No draft days found.</p>
        </div>
      )}
    </div>
  );
}
