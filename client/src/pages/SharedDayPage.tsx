import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { format } from "date-fns";
import { Calendar, ChevronLeft, ChevronRight, Loader2, Mountain, Snowflake } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Logo } from "@/components/Logo";
import { skiService } from "@/services/skiService";
import type { SharedDayDetail } from "@/types/ski";
import PageMeta from "@/components/PageMeta";

export default function SharedDayPage() {
  const { dayId } = useParams();
  const navigate = useNavigate();
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);

  const { data: day, isLoading, isError } = useQuery<SharedDayDetail, Error>({
    queryKey: ["sharedDay", dayId],
    queryFn: () => skiService.getSharedDay(dayId || ""),
    enabled: !!dayId,
  });

  const photoUrls = day?.photos?.map((photo) => photo.full_url) || [];
  const hasPhotos = photoUrls.length > 0;
  const username = day?.user?.username || "A shred.day user";
  const resortName = day?.resort?.name || "Ski day";
  const resortRegion = day?.resort?.region?.trim();
  const resortDisplayName = resortRegion ? `${resortName}, ${resortRegion}` : resortName;
  const formattedDate = day
    ? format(new Date(day.date.replace(/-/g, "/")), "MMM d, yyyy")
    : "";
  const baseUrl = typeof window === "undefined" ? "" : window.location.origin;
  const defaultImage = baseUrl ? `${baseUrl}/shred_day_logo.png` : undefined;
  const metaTitle = day ? `${resortName} · ${formattedDate}` : "Shred Day";
  const metaDescription = day
    ? `${username} at ${resortName} on ${formattedDate}`
    : "View a shared ski day.";
  const metaImage = hasPhotos ? photoUrls[0] : defaultImage;

  const nextPhoto = () => {
    if (hasPhotos) {
      setCurrentPhotoIndex((prev) => (prev === photoUrls.length - 1 ? 0 : prev + 1));
    }
  };

  const prevPhoto = () => {
    if (hasPhotos) {
      setCurrentPhotoIndex((prev) => (prev === 0 ? photoUrls.length - 1 : prev - 1));
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    const touchEnd = e.changedTouches[0].clientX;
    const diff = touchStart - touchEnd;
    if (Math.abs(diff) > 50) {
      if (diff > 0) nextPhoto();
      else prevPhoto();
    }
    setTouchStart(null);
  };

  if (isLoading) {
    return (
      <>
        <PageMeta title={metaTitle} description={metaDescription} image={metaImage} />
        <div className="min-h-screen bg-background flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </>
    );
  }

  if (isError || !day) {
    return (
      <>
        <PageMeta title={metaTitle} description={metaDescription} image={metaImage} />
        <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
          <div className="text-center space-y-6 max-w-md mx-auto">
            <div className="relative h-32 w-32 mx-auto">
              <div className="absolute inset-0 flex items-center justify-center">
                <Mountain className="h-20 w-20 text-muted-foreground/20" />
              </div>
              <Snowflake
                className="absolute top-0 left-4 h-6 w-6 text-primary/40 animate-pulse"
                style={{ animationDelay: "0s" }}
              />
              <Snowflake
                className="absolute top-8 right-2 h-4 w-4 text-primary/30 animate-pulse"
                style={{ animationDelay: "0.5s" }}
              />
              <Snowflake
                className="absolute bottom-4 left-0 h-5 w-5 text-primary/35 animate-pulse"
                style={{ animationDelay: "1s" }}
              />
              <Snowflake
                className="absolute bottom-0 right-6 h-3 w-3 text-primary/25 animate-pulse"
                style={{ animationDelay: "1.5s" }}
              />
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">This day has melted away</h1>
              <p className="text-muted-foreground">
                The ski day you're looking for doesn't exist or is no longer shared.
              </p>
            </div>

            <div className="pt-4 space-y-4">
              <div className="flex justify-center">
                <Link to="/" className="transition-opacity hover:opacity-80">
                  <Logo />
                </Link>
              </div>
              <p className="text-sm text-muted-foreground">Track your own ski days and share your adventures</p>
              <Button onClick={() => navigate("/")} variant="default" className="w-full sm:w-auto">
                Start Logging Your Days
              </Button>
            </div>
          </div>
        </div>
      </>
    );
  }

  const skiNames = day.skis?.map((ski) => ski.name).filter(Boolean).join(" / ") || "";

  return (
    <>
      <PageMeta title={metaTitle} description={metaDescription} image={metaImage} />
      <div className="min-h-screen bg-background flex flex-col items-center">
        <header className="w-full max-w-2xl px-4 py-4 flex items-center justify-center">
          <Link to="/" className="transition-opacity hover:opacity-80" aria-label="Go to Shred.Day home">
            <Logo />
          </Link>
        </header>

        <div
          className="relative w-full max-w-2xl aspect-[4/5] sm:aspect-[16/10] bg-muted max-h-[72vh] sm:max-h-[64vh] lg:max-h-[78vh]"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {hasPhotos ? (
            <>
              <img
                src={photoUrls[currentPhotoIndex]}
                alt={`${resortName} - Photo ${currentPhotoIndex + 1}`}
                className="w-full h-full object-contain"
              />

              {photoUrls.length > 1 && (
                <>
                  <button
                    onClick={prevPhoto}
                    className="absolute left-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center hover:bg-background transition-colors"
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </button>
                  <button
                    onClick={nextPhoto}
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center hover:bg-background transition-colors"
                  >
                    <ChevronRight className="h-6 w-6" />
                  </button>

                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
                    {photoUrls.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentPhotoIndex(index)}
                        className={`h-2 w-2 rounded-full transition-all ${
                          index === currentPhotoIndex ? "bg-white w-4" : "bg-white/50 hover:bg-white/70"
                        }`}
                      />
                    ))}
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Mountain className="h-16 w-16 text-muted-foreground/30" />
            </div>
          )}
        </div>

        <div className="flex-1 px-4 py-6 sm:px-6 sm:py-8 max-w-2xl mx-auto w-full">
          <div className="flex items-center gap-3 mb-6">
            <Avatar className="h-10 w-10">
              <AvatarImage src={day.user?.avatar_url || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary">
                {username.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <p className="font-medium text-foreground">@{username}</p>
          </div>

          <div className="space-y-4">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{resortDisplayName}</h1>

            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span className="text-sm">{format(new Date(day.date.replace(/-/g, "/")), "MMMM d, yyyy")}</span>
            </div>

            <div className="flex flex-wrap gap-2">
              {day.tags?.map((tag) => (
                <span
                  key={tag.id}
                  className="inline-flex items-center px-3 py-1 bg-primary/10 text-primary rounded-full text-sm"
                >
                  {tag.name}
                </span>
              ))}
            </div>

            {skiNames && (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-muted rounded-full">
                <span className="text-sm font-medium">{skiNames}</span>
              </div>
            )}

            {day.notes && (
              <p className="text-foreground leading-relaxed pt-2 whitespace-pre-wrap break-words">{day.notes}</p>
            )}
          </div>

          <div className="mt-[150px] pt-6 border-t">
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <Link to="/" className="transition-opacity hover:opacity-80">
                  <Logo />
                </Link>
              </div>
              <p className="text-sm text-muted-foreground">Track your own ski days and share your adventures</p>
              <Button onClick={() => navigate("/")} variant="default" className="w-full sm:w-auto">
                Start Logging Your Days
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
