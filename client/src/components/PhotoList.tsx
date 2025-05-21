import { useMemo, useState } from "react";
import { format } from "date-fns";
import { type SkiPhoto, type DraftDay as UIDraftDay } from "@/types/ski";
import { PhotoItem } from "@/components/PhotoItem";
import { SkiDayActionToggle } from "@/components/SkiDayActionToggle";

// Client-side representation of a DraftDay, mirroring ProcessedDraftDay from PhotoImportPage
// Or we import ProcessedDraftDay if it's moved to types/ski.ts
interface ProcessedDraftDayForList extends Omit<UIDraftDay, 'date' | 'photos' | 'resort' | 'decision'> {
  date: Date;
  resortName: string;
  resortId?: string | null;
  photos: SkiPhoto[];
  decision?: "pending" | "merge" | "duplicate" | "skip"; // Match updated UIDraftDay.decision
  skiDayExists?: boolean;
}

// Actions that SkiDayActionToggle will manage
type SkiDayUserAction = "merge" | "duplicate" | "skip";

interface PhotoListProps {
  strippedPhotos: SkiPhoto[];
  draftDayGroups: ProcessedDraftDayForList[];
  onPhotoUpdate: (photoId: string, updates: { date?: Date | null; resortId?: string | null; resortName?: string | null }) => void;
  onDraftDayDecisionChange: (draftDayId: string, decision: SkiDayUserAction) => void; // Uses new SkiDayUserAction type
  onDeletePhoto?: (photoId: string) => void;
}

export function PhotoList({
  strippedPhotos,
  draftDayGroups,
  onPhotoUpdate,
  onDraftDayDecisionChange,
  onDeletePhoto,
}: PhotoListProps) {
  const [groupUserActions, setGroupUserActions] = useState<{ [key: string]: SkiDayUserAction }>({});

  useMemo(() => {
    const initialActions: { [key: string]: SkiDayUserAction } = {};
    draftDayGroups.forEach(group => {
      const currentDecision = group.decision;
      // Map backend decision to user actions for the toggle
      if (currentDecision === 'merge' || currentDecision === 'duplicate' || currentDecision === 'skip') {
        initialActions[group.id] = currentDecision;
      } else {
        // Default for 'pending' or other unhandled backend decisions
        initialActions[group.id] = group.skiDayExists ? "merge" : "duplicate"; // Sensible defaults for new actions
      }
    });
    setGroupUserActions(initialActions);
  }, [draftDayGroups]);

  const handleActionChange = (groupId: string, action: SkiDayUserAction) => {
    setGroupUserActions(prev => ({ ...prev, [groupId]: action }));
    onDraftDayDecisionChange(groupId, action);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-100">
      {/* Stripped Photos Section */}
      {strippedPhotos.length > 0 && (
        <div className="mb-6">
          <div className="bg-amber-50 p-3 border-l-4 border-amber-400">
            <h3 className="text-sm font-medium text-amber-800">
              Photos with Missing Data
            </h3>
            <p className="text-xs text-amber-600">
              {strippedPhotos.length} {strippedPhotos.length === 1 ? 'photo' : 'photos'} with missing EXIF data
            </p>
          </div>
          <div className="border-l-4 border-amber-100 pl-3">
            {strippedPhotos.map((photo) => (
              <PhotoItem
                key={photo.id}
                photo={photo}
                onUpdate={onPhotoUpdate}
                onDeletePhoto={onDeletePhoto}
              />
            ))}
          </div>
        </div>
      )}

      {/* Draft Day Groups Section */}
      {draftDayGroups.length > 0 ? (
        <div>
          {draftDayGroups.map((group) => (
            <div key={group.id} className="mb-4">
              <div className="bg-purple-50 p-3 border-l-4 border-purple-400" data-testid={`draft-day-${group.id}`}>
                <div className="flex flex-row justify-between items-center gap-2">
                  <div className="min-w-0 flex flex-col">
                    <h3 className="text-sm font-medium text-purple-800">
                      {format(new Date(group.date), "PPPP")}
                    </h3>
                    <h4 className="text-xs font-medium text-purple-800 truncate">
                      {group.resortName}
                    </h4>
                  </div>
                  <div className="flex-shrink-0">
                    <SkiDayActionToggle
                      skiDayExists={group.skiDayExists || false}
                      selectedAction={groupUserActions[group.id] || (group.skiDayExists ? "merge" : "duplicate")}
                      onActionChange={(action) => handleActionChange(group.id, action as SkiDayUserAction)}
                      data-testid="draft-day-action-toggle"
                    />
                  </div>
                </div>
              </div>
              <div className="border-l-4 border-purple-100 pl-3">
                {group.photos.map((photo) => (
                  <PhotoItem
                    key={photo.id}
                    photo={photo}
                    onUpdate={onPhotoUpdate}
                    onDeletePhoto={onDeletePhoto}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : strippedPhotos.length > 0 ? (
        // This case means only stripped photos exist, no draft day groups yet
        <div className="p-3">
          <p className="text-slate-500">Review photos with missing data above. Other photos are being processed or will form groups once EXIF data is extracted.</p>
        </div>
      ) : (
        <div className="text-center p-8">
          <p className="text-slate-500">No photos have been imported yet.</p>
        </div>
      )}
    </div>
  );
}
