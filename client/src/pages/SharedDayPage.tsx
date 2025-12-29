import { useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { differenceInCalendarDays, format } from "date-fns";
import { Loader2, Snowflake } from "lucide-react";
import { skiService } from "@/services/skiService";
import { SharedDayDetail } from "@/types/ski";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Separator } from "@/components/ui/separator";
import { Logo } from "@/components/Logo";
import { formatSkiDayDisplayDate } from "@/utils/dateDisplay";

const getRelativeDateLabel = (dateString: string) => {
  const dayDate = new Date(dateString.replace(/-/g, '/'));
  const now = new Date();
  const daysAgo = differenceInCalendarDays(now, dayDate);
  if (daysAgo >= 0 && daysAgo <= 6) {
    return formatSkiDayDisplayDate(dayDate, now);
  }
  return format(dayDate, "EEEE");
};

const NotFoundSharedDay = () => (
  <div className="min-h-screen bg-gradient-to-b from-white via-slate-50 to-white">
    <div className="mx-auto max-w-xl px-6 py-16 text-center space-y-8">
      <div className="mx-auto h-20 w-20 rounded-full bg-slate-100 flex items-center justify-center">
        <Snowflake className="h-9 w-9 text-slate-400" />
      </div>
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold text-slate-900">This day has melted away</h1>
        <p className="text-slate-500">
          The ski day you're looking for doesn't exist or is no longer shared.
        </p>
      </div>
      <div className="space-y-4">
        <div className="flex items-center justify-center gap-3 text-slate-600">
          <Logo />
        </div>
        <p className="text-sm text-slate-500">Track your own ski days and share your adventures.</p>
        <Button asChild className="bg-slate-900 hover:bg-slate-800">
          <Link to="/auth">Start Logging Your Days</Link>
        </Button>
      </div>
    </div>
  </div>
);

export default function SharedDayPage() {
  const { id } = useParams();

  const { data: day, isLoading, isError } = useQuery<SharedDayDetail, Error>({
    queryKey: ['sharedDay', id],
    queryFn: () => skiService.getSharedDay(id || ''),
    enabled: !!id,
  });

  const displayDate = useMemo(() => {
    if (!day) return '';
    return format(new Date(day.date.replace(/-/g, '/')), 'MMM d, yyyy');
  }, [day]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (isError || !day) {
    return <NotFoundSharedDay />;
  }

  const userDisplayName = day.user?.username || 'Shred Day skier';
  const avatarFallback = userDisplayName.slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="px-6 pt-6 pb-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <img
            src="/shread-day-logo_192x192.png"
            alt="Shred Day logo"
            className="h-10 w-10 rounded-lg shadow-sm"
          />
          <span className="text-lg font-semibold text-white">Shred.day</span>
        </Link>
        <Button asChild variant="ghost" className="text-white/80 hover:text-white">
          <Link to="/auth">Start Logging</Link>
        </Button>
      </header>

      <main className="px-6 pb-16 space-y-8">
        <section className="space-y-4">
          <div className="text-sm uppercase tracking-[0.25em] text-white/60">Shared day</div>
          <h1 className="text-3xl font-semibold">{day.resort.name}</h1>
          <p className="text-white/70">
            {getRelativeDateLabel(day.date)} \u2022 {displayDate}
          </p>
        </section>

        <section className="space-y-4">
          <Carousel className="w-full" data-testid="shared-day-carousel">
            <CarouselContent>
              {day.photos && day.photos.length > 0 ? (
                day.photos.map((photo, index) => (
                  <CarouselItem key={photo.id || index}>
                    <div className="aspect-square rounded-2xl overflow-hidden bg-black/40">
                      <img
                        src={photo.full_url}
                        alt={`Shared ski day ${index + 1}`}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  </CarouselItem>
                ))
              ) : (
                <CarouselItem>
                  <div className="aspect-square rounded-2xl bg-white/5 flex items-center justify-center text-white/60">
                    No photos available
                  </div>
                </CarouselItem>
              )}
            </CarouselContent>
            <CarouselPrevious className="left-2 bg-white/10 text-white border-white/20" />
            <CarouselNext className="right-2 bg-white/10 text-white border-white/20" />
          </Carousel>
        </section>

        <section className="space-y-4 rounded-2xl bg-white/5 p-6">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={day.user?.avatar_url || undefined} alt={userDisplayName} />
              <AvatarFallback className="bg-white/10 text-white">{avatarFallback}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-lg font-semibold">{userDisplayName}</p>
              <p className="text-sm text-white/70">Shared from Shred Day</p>
            </div>
          </div>

          <Separator className="bg-white/10" />

          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <h3 className="text-sm uppercase tracking-wider text-white/60">Skis used</h3>
              {day.skis && day.skis.length > 0 ? (
                <ul className="mt-2 space-y-1">
                  {day.skis.map((ski) => (
                    <li key={ski.id} className="text-white/90">{ski.name}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-white/60">No skis recorded.</p>
              )}
            </div>
            <div>
              <h3 className="text-sm uppercase tracking-wider text-white/60">Tags</h3>
              {day.tags && day.tags.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {day.tags.map((tag) => (
                    <span
                      key={tag.id}
                      className="rounded-full bg-white/10 px-3 py-1 text-xs uppercase tracking-wide"
                    >
                      {tag.name}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-white/60">No tags added.</p>
              )}
            </div>
          </div>

          <div>
            <h3 className="text-sm uppercase tracking-wider text-white/60">Notes</h3>
            <p className="mt-2 text-white/80">
              {day.notes ? day.notes : 'No notes available.'}
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
