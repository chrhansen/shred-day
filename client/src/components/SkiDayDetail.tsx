import { format } from "date-fns";
import { X, Loader2 } from "lucide-react";
import { type SkiDayDetail as SkiDayDetailType } from "@/types/ski";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogOverlay,
  DialogTitle,
  DialogDescription,
  DialogClose
} from "@/components/ui/dialog";
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext } from "@/components/ui/carousel";
import { Separator } from "@/components/ui/separator";
import { formatSkiDayDisplayDate } from "@/utils/dateDisplay";

interface SkiDayDetailProps {
  day: SkiDayDetailType | null;
  isOpen: boolean;
  onClose: () => void;
  isLoading: boolean;
  error: string | null;
}

export function SkiDayDetail({ day, isOpen, onClose, isLoading, error }: SkiDayDetailProps) {
  if (!isOpen) {
    return null;
  }

  const now = new Date();
  const dayDate = day ? new Date(day.date.replace(/-/g, '/')) : null;
  const formattedFullDate = dayDate ? format(dayDate, "EEEE, MMMM d, yyyy") : "";
  const displayDate = dayDate ? formatSkiDayDisplayDate(dayDate, now) : "";

  const getAccessibilityText = () => {
    if (isLoading) {
      return {
        title: "Loading ski day details",
        description: "Please wait while the ski day details are being loaded."
      };
    }
    if (error) {
      return {
        title: "Error loading details",
        description: `An error occurred: ${error}`
      };
    }
    if (!day) {
      return {
        title: "No details available",
        description: "There are no details to display for this ski day."
      };
    }
    const skiNames = day.skis && day.skis.length > 0 ? day.skis.map(s => s.name).join(", ") : "N/A";
    return {
      title: `${day.resort.name} - Ski Day Details`,
      description: `Details for ski day at ${day.resort.name} on ${formattedFullDate}. Skis used: ${skiNames}. ${day.notes ? `Notes: ${day.notes}` : "No additional notes."}`
    };
  };

  const { title: accessibilityTitle, description: accessibilityDescription } = getAccessibilityText();

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center p-10 min-h-[200px]">
          <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
          <p className="ml-2 text-slate-500">Loading details...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="p-6 text-center text-red-600">
          <p>Error loading details: {error}</p>
          <Button onClick={onClose} variant="outline" className="mt-4">Close</Button>
        </div>
      );
    }

    if (!day) {
      return (
        <div className="p-6 text-center text-slate-500">
          <p>No ski day details available.</p>
          <Button onClick={onClose} variant="outline" className="mt-4">Close</Button>
        </div>
      );
    }

    return (
      <>
        <DialogTitle className="sr-only">{accessibilityTitle}</DialogTitle>
        <DialogDescription className="sr-only">{accessibilityDescription}</DialogDescription>
        <div className="relative">
          <Carousel className="w-full bg-black" data-testid="ski-day-detail-carousel">
            <CarouselContent>
              {day.photos && day.photos.length > 0 ? (
                day.photos.map((photo, index) => (
                  <CarouselItem key={photo.id || index} className="relative">
                    <div className="aspect-square bg-black flex items-center justify-center">
                      <img
                        src={photo.full_url}
                        alt={`Ski day photo ${index + 1}`}
                        className="h-full w-full object-contain"
                      />
                    </div>
                  </CarouselItem>
                ))
              ) : (
                <CarouselItem className="relative">
                  <div className="aspect-square bg-black flex items-center justify-center">
                    <div className="text-slate-400">No photos available</div>
                  </div>
                </CarouselItem>
              )}
            </CarouselContent>
            <CarouselPrevious className="left-2" data-testid="ski-day-detail-carousel-prev" />
            <CarouselNext className="right-2" data-testid="ski-day-detail-carousel-next" />
          </Carousel>
          <DialogClose asChild>
            <Button
              variant="ghost"
              className="absolute top-3 right-3 rounded-full bg-white/60 hover:bg-white/75 backdrop-blur-sm z-10 h-7 w-7 flex items-center justify-center"
              data-testid="ski-day-detail-close-button"
            >
              <X className="h-4 w-4 text-slate-700" />
            </Button>
          </DialogClose>
        </div>

        <div
          className="p-6 space-y-6"
          data-testid="ski-day-detail-modal"
        >
          <div className="flex items-center gap-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-800">{day.resort.name}</h2>
              <p className="text-slate-500">
                {displayDate}
                {formattedFullDate ? ` \u2022 ${formattedFullDate}` : ""}
              </p>
            </div>
          </div>
          <Separator />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-medium text-slate-500 mb-1">Skis Used</h3>
              {day.skis && day.skis.length > 0 ? (
                <ul className="list-disc list-inside text-slate-800">
                  {day.skis.map(s => <li key={s.id}>{s.name}</li>)}
                </ul>
              ) : (
                <p className="text-slate-800 italic">No skis recorded.</p>
              )}
            </div>
            <div>
              <h3 className="text-sm font-medium text-slate-500 mb-1">Tags</h3>
              {day.tags && day.tags.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {day.tags.map((tag) => (
                    <span
                      key={tag.id}
                      className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-medium"
                    >
                      {tag.name}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-slate-800 italic">No tags added.</p>
              )}
            </div>
          </div>
          <div>
            <h3 className="text-sm font-medium text-slate-500 mb-1">Notes</h3>
            <p className="text-slate-800">
              {day.notes ? day.notes : <span className="text-slate-500 italic">No notes available</span>}
            </p>
          </div>
        </div>
      </>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogOverlay className="bg-black/20 backdrop-blur-xs" />
      <DialogContent
        className="w-[calc(100%-2rem)] max-w-md sm:max-w-lg md:max-w-xl p-0 gap-0 border-none overflow-hidden bg-white rounded-xl"
      >
        <DialogTitle className="sr-only">{accessibilityTitle}</DialogTitle>
        <DialogDescription className="sr-only">{accessibilityDescription}</DialogDescription>
        {renderContent()}
      </DialogContent>
    </Dialog>
  );
}
