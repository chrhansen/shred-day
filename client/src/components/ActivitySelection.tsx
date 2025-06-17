import { SelectionPill } from "@/components/SelectionPill";

interface ActivitySelectionProps {
  activities: string[];
  selectedActivity: string;
  isDisabled: boolean;
  onSelect: (activity: string) => void;
}

export function ActivitySelection({
  activities,
  selectedActivity,
  isDisabled,
  onSelect,
}: ActivitySelectionProps) {
  return (
    <div>
      <h2 className="text-lg font-medium text-slate-800 mb-4">Activity</h2>
      <div className="flex flex-wrap gap-2">
        {activities.map((activity) => (
          <SelectionPill
            key={activity}
            isSelected={selectedActivity === activity}
            onClick={() => onSelect(activity)}
            disabled={isDisabled}
            data-testid={`activity-${activity.toLowerCase()}`}
          >
            {activity}
          </SelectionPill>
        ))}
      </div>
    </div>
  );
}