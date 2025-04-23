import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { SelectionPill } from "@/components/SelectionPill";
import { Input } from "@/components/ui/input";
import { ChevronLeft, Loader2, Plus, Check, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { skiService } from "@/services/skiService";
import { toast } from "sonner";

const RESORTS = ["Stubai", "Kühtai", "Axamer Lizum"];
const ACTIVITIES = ["Friends", "Training"];

export default function LogDay() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [date, setDate] = useState<Date>(new Date());
  const [selectedResort, setSelectedResort] = useState<string>("");
  const [selectedSki, setSelectedSki] = useState<number | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<string>("");
  const [isAddingSkiInline, setIsAddingSkiInline] = useState(false);
  const [newInlineSkiName, setNewInlineSkiName] = useState("");

  const { data: userSkis, isLoading: isLoadingSkis, error: skisError } = useQuery({
    queryKey: ['skis'],
    queryFn: skiService.getSkis,
  });

  const { mutate: saveDay, isPending } = useMutation({
    mutationFn: skiService.logDay,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skiStats'] });
      toast.success("Ski day logged successfully!");
      navigate('/dashboard');
    },
    onError: () => {
      toast.error("Failed to log ski day");
    },
  });

  const { mutate: addSki, isPending: isAddingSki } = useMutation({
    mutationFn: skiService.addSki,
    onSuccess: (newSki) => {
      queryClient.invalidateQueries({ queryKey: ['skis'] });
      toast.success(`Ski "${newSki.name}" added successfully!`);
      setNewInlineSkiName("");
      setIsAddingSkiInline(false);
      setSelectedSki(newSki.id);
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to add ski");
    },
  });

  const handleSave = () => {
    if (!selectedResort || selectedSki === null || !selectedActivity) {
      toast.error("Please fill in all fields");
      return;
    }

    saveDay({
      date,
      resort: selectedResort,
      ski_id: selectedSki,
      activity: selectedActivity,
    });
  };

  const handleSaveInlineSki = () => {
    if (!newInlineSkiName.trim()) {
      toast.error("Please enter a ski name.");
      return;
    }
    addSki({ name: newInlineSkiName.trim() });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white p-4">
      <div className="max-w-md mx-auto space-y-6">
        <Button
          variant="ghost"
          className="mb-4 text-slate-600 hover:text-slate-800"
          onClick={() => navigate(-1)}
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <div className="bg-white rounded-xl p-6 shadow-lg border border-slate-100">
          <h2 className="text-lg font-medium text-slate-800 mb-4">Date</h2>
          <Calendar
            mode="single"
            selected={date}
            onSelect={(date) => date && setDate(date)}
            className="rounded-lg border-slate-200"
          />
        </div>

        <div className="space-y-8">
          <div>
            <h2 className="text-lg font-medium text-slate-800 mb-4">Ski Resort</h2>
            <div className="flex flex-wrap gap-2">
              {RESORTS.map((resort) => (
                <SelectionPill
                  key={resort}
                  label={resort}
                  selected={selectedResort === resort}
                  onClick={() => setSelectedResort(resort)}
                />
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-lg font-medium text-slate-800 mb-4">Skis</h2>
            <div className="flex flex-wrap gap-2 items-center">
              {isLoadingSkis && (
                <div className="flex items-center text-slate-500 w-full">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading skis...
                </div>
              )}
              {skisError && (
                 <p className="text-red-600 w-full">Error loading skis: {skisError.message}</p>
              )}
              {!isLoadingSkis && !skisError && userSkis && (
                userSkis.length > 0 ? (
                  <>
                    {userSkis.map((ski) => (
                      <SelectionPill
                        key={ski.id}
                        label={ski.name}
                        selected={selectedSki === ski.id}
                        onClick={() => setSelectedSki(ski.id)}
                      />
                    ))}
                  </>
                ) : (
                  null
                )
              )}
              {!isLoadingSkis && !skisError && !isAddingSkiInline && (
                 <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-blue-600 hover:bg-blue-50"
                    onClick={() => setIsAddingSkiInline(true)}
                    disabled={isAddingSki}
                 >
                    <Plus className="h-4 w-4 mr-1" /> Add
                 </Button>
              )}
              {isAddingSkiInline && (
                <div className="flex gap-2 items-center w-full sm:w-auto">
                  <Input
                    type="text"
                    placeholder="e.g., Volkl Racetiger"
                    value={newInlineSkiName}
                    onChange={(e) => setNewInlineSkiName(e.target.value)}
                    className="h-9 flex-grow"
                    disabled={isAddingSki}
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveInlineSki()}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-green-600 hover:bg-green-50 flex-shrink-0"
                    onClick={handleSaveInlineSki}
                    disabled={isAddingSki || !newInlineSkiName.trim()}
                  >
                    {isAddingSki ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    <span className="sr-only">Save Ski</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-slate-500 hover:bg-slate-100 flex-shrink-0"
                    onClick={() => { setIsAddingSkiInline(false); setNewInlineSkiName(""); }}
                    disabled={isAddingSki}
                  >
                    <X className="h-4 w-4" />
                    <span className="sr-only">Cancel</span>
                  </Button>
                </div>
              )}
              {!isLoadingSkis && !skisError && !userSkis && !isAddingSkiInline && (
                  <p className="text-sm text-slate-500 w-full">Could not load skis.</p>
              )}
            </div>
          </div>

          <div>
            <h2 className="text-lg font-medium text-slate-800 mb-4">Activity</h2>
            <div className="flex flex-wrap gap-2">
              {ACTIVITIES.map((activity) => (
                <SelectionPill
                  key={activity}
                  label={activity}
                  selected={selectedActivity === activity}
                  onClick={() => setSelectedActivity(activity)}
                />
              ))}
            </div>
          </div>
        </div>

        <Button
          onClick={handleSave}
          disabled={isPending}
          className="w-full h-14 text-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg transition-all hover:shadow-xl mt-8"
        >
          {isPending ? "Saving..." : "Save"}
        </Button>
      </div>
    </div>
  );
}
