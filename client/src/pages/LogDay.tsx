import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { SelectionPill } from "@/components/SelectionPill";
import { ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { skiService } from "@/services/skiService";
import { toast } from "sonner";

const RESORTS = ["Stubai", "Kühtai", "Axamer Lizum"];
const SKIS = ["Fischer RC4 GS", "Atomic G9", "Kästle Twin tip"];
const ACTIVITIES = ["Friends", "Training"];

export default function LogDay() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [date, setDate] = useState<Date>(new Date());
  const [selectedResort, setSelectedResort] = useState<string>("");
  const [selectedSki, setSelectedSki] = useState<string>("");
  const [selectedActivity, setSelectedActivity] = useState<string>("");

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

  const handleSave = () => {
    if (!selectedResort || !selectedSki || !selectedActivity) {
      toast.error("Please fill in all fields");
      return;
    }

    saveDay({
      date,
      resort: selectedResort,
      ski: selectedSki,
      activity: selectedActivity,
    });
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
            <div className="flex flex-wrap gap-2">
              {SKIS.map((ski) => (
                <SelectionPill
                  key={ski}
                  label={ski}
                  selected={selectedSki === ski}
                  onClick={() => setSelectedSki(ski)}
                />
              ))}
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
