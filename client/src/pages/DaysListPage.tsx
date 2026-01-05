import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { skiService } from '@/services/skiService';
import { SkiDayItem } from '@/components/SkiDayItem';
import { Button } from '@/components/ui/button';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { Loader2, Plus } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import Navbar from '@/components/Navbar';
import SeasonDropdown from '@/components/SeasonDropdown';
import { useAuth } from '@/contexts/AuthContext';
import { getSeasonDisplayName, getFormattedSeasonDateRange } from '@/utils/seasonFormatters';
import { addDays, addMonths, format, parseISO, startOfMonth, startOfWeek, subMonths } from 'date-fns';
import type { SkiDayEntry } from '@/types/ski';
import PageMeta from "@/components/PageMeta";

type Section = {
  title: string;
  days: SkiDayEntry[];
};

const groupDaysByRelativeSections = (days: SkiDayEntry[]): Section[] => {
  const now = new Date();
  const startOfCurrentWeek = startOfWeek(now, { weekStartsOn: 1 });
  const startOfNextWeek = addDays(startOfCurrentWeek, 7);
  const startOfCurrentMonth = startOfMonth(now);
  const startOfNextMonth = startOfMonth(addMonths(now, 1));
  const startOfLastMonth = startOfMonth(subMonths(now, 1));

  const sections: { thisWeek: SkiDayEntry[]; thisMonth: SkiDayEntry[]; lastMonth: SkiDayEntry[] } = {
    thisWeek: [],
    thisMonth: [],
    lastMonth: [],
  };

  const olderBuckets = new Map<string, { title: string; monthStart: Date; days: SkiDayEntry[] }>();

  days.forEach((day) => {
    const dayDate = parseISO(day.date);
    if (Number.isNaN(dayDate.getTime())) {
      return;
    }

    if (dayDate >= startOfCurrentWeek && dayDate < startOfNextWeek) {
      sections.thisWeek.push(day);
      return;
    }

    if (dayDate >= startOfCurrentMonth && dayDate < startOfNextMonth) {
      sections.thisMonth.push(day);
      return;
    }

    if (dayDate >= startOfLastMonth && dayDate < startOfCurrentMonth) {
      sections.lastMonth.push(day);
      return;
    }

    const monthKey = format(dayDate, 'yyyy-MM');
    if (!olderBuckets.has(monthKey)) {
      olderBuckets.set(monthKey, {
        title: format(dayDate, 'MMMM yyyy'),
        monthStart: startOfMonth(dayDate),
        days: [],
      });
    }

    olderBuckets.get(monthKey)!.days.push(day);
  });

  const orderedSections: Section[] = [];

  if (sections.thisWeek.length > 0) {
    orderedSections.push({ title: 'This week', days: sections.thisWeek });
  }

  if (sections.thisMonth.length > 0) {
    orderedSections.push({ title: 'This month', days: sections.thisMonth });
  }

  if (sections.lastMonth.length > 0) {
    orderedSections.push({ title: 'Last month', days: sections.lastMonth });
  }

  const olderSections = Array.from(olderBuckets.values())
    .sort((a, b) => b.monthStart.getTime() - a.monthStart.getTime())
    .map(({ title, days }) => ({ title, days }));

  orderedSections.push(...olderSections);
  return orderedSections;
};

export default function DaysListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();

  // Initialize selectedSeason (numeric offset) from URL parameter or default to 0
  const [selectedSeason, setSelectedSeason] = useState<number>(() => {
    const seasonParam = searchParams.get('season');
    return seasonParam ? parseInt(seasonParam, 10) : 0;
  });
  const [highlightedDayId, setHighlightedDayId] = useState<string | null>(null);

  // Update URL when selectedSeason changes
  useEffect(() => {
    const currentSeasonParam = searchParams.get('season');
    const expectedParam = selectedSeason === 0 ? null : selectedSeason.toString();

    if (currentSeasonParam !== expectedParam) {
      if (expectedParam === null) {
        searchParams.delete('season');
      } else {
        searchParams.set('season', expectedParam);
      }
      setSearchParams(searchParams, { replace: true });
    }
  }, [selectedSeason, searchParams, setSearchParams]);

  // Capture day id from hash (#day_123) to highlight and scroll into view
  useEffect(() => {
    if (!location.hash) return;
    const decodedHash = decodeURIComponent(location.hash.replace('#', ''));
    if (decodedHash) {
      setHighlightedDayId(decodedHash);
    }
  }, [location.hash]);

  const { data: days, isLoading, error } = useQuery({
    queryKey: ['days', selectedSeason],
    queryFn: () => skiService.getDays(selectedSeason === 0 ? undefined : { season: selectedSeason }),
  });

  const groupedSections = useMemo(() => {
    if (!days || !Array.isArray(days) || days.length === 0) {
      return [];
    }
    return groupDaysByRelativeSections(days);
  }, [days]);

  // Get available seasons and season_start_day from user account details
  const availableSeasonOffsets = user?.available_seasons || [0];
  const seasonStartDay = user?.season_start_day || '09-01';

  const { mutate: deleteDay, isPending: isDeleting } = useMutation({
    mutationFn: skiService.deleteDay,
    onSuccess: () => {
      toast.success('Ski day deleted successfully!');
      queryClient.invalidateQueries({ queryKey: ['days'] });
      queryClient.invalidateQueries({ queryKey: ['skiStats'] });
      queryClient.invalidateQueries({ queryKey: ['accountDetails'] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to delete ski day');
    },
  });

  const handleDeleteDay = (dayId: string) => {
    deleteDay(dayId);
  };

  const handleSeasonChange = (seasonOffsetString: string) => {
    const seasonNumber = parseInt(seasonOffsetString, 10);
    setSelectedSeason(seasonNumber);
  };

  // When days are loaded, scroll to the highlighted day then clear highlight after a delay
  useEffect(() => {
    if (!highlightedDayId || !days || !Array.isArray(days)) return;
    if (!days.some(day => day.id === highlightedDayId)) return;
    if (typeof window === 'undefined') return;

    const scrollToHighlightedDay = () => {
      const element = document.getElementById(highlightedDayId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    };

    const rafId = window.requestAnimationFrame(scrollToHighlightedDay);

    // Remove the hash from the URL so future visits don't repeat the highlight
    if (window.history?.replaceState) {
      window.history.replaceState(null, '', `${location.pathname}${location.search}`);
    }

    const timeoutId = window.setTimeout(() => {
      setHighlightedDayId(null);
    }, 6000);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.clearTimeout(timeoutId);
    };
  }, [highlightedDayId, days, location.pathname, location.search]);

  const newDayTarget = selectedSeason !== undefined
    ? `/new?season=${selectedSeason}`
    : '/new';

  const newDayButton = (
    <Button
      onClick={() => navigate(newDayTarget)}
      size="sm"
      className="text-sm bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md transition-all hover:shadow-lg"
    >
      <Plus className="mr-1.0 h-4 w-4" />
      New Day
    </Button>
  );

  // Prepare data for SeasonDropdown
  const seasonsDataForDropdown = availableSeasonOffsets.map(offset => {
    const displayName = getSeasonDisplayName(offset);
    const dateRange = getFormattedSeasonDateRange(offset, seasonStartDay);
    return { displayName, dateRange, value: offset.toString() };
  });

  const selectedSeasonDisplayName = getSeasonDisplayName(selectedSeason);

  return (
    <>
      <PageMeta
        title={`${selectedSeasonDisplayName} · Shred Day`}
        description="Review your logged ski days."
      />
      <div className="min-h-screen bg-white">
        <Navbar
          rightContent={newDayButton}
          centerContent={
            isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin text-slate-700" />
            ) : (
              <SeasonDropdown
                selectedSeason={selectedSeasonDisplayName}
                seasonsData={seasonsDataForDropdown}
                onSeasonChange={handleSeasonChange}
              />
            )
          }
        />

      <div className="max-w-2xl mx-auto p-4">
        {isLoading && (
          <div className="flex justify-center items-center py-10">
            <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
            <span className="ml-3 text-slate-600">Loading ski days...</span>
          </div>
        )}

        {error && (
          <div className="text-center py-10 text-red-600">
            <p>Error loading ski days: {error instanceof Error ? error.message : 'Unknown error'}</p>
          </div>
        )}

        {!isLoading && !error && groupedSections.length > 0 && (
          <div className="space-y-10">
            {groupedSections.map((section) => (
              <div key={section.title}>
                <h2 className="text-lg font-semibold text-slate-700 mb-3">{section.title}</h2>
                <div className="bg-white rounded-lg overflow-hidden">
                  {section.days.map((day, index) => (
                    <React.Fragment key={day.id}>
                      <SkiDayItem
                        day={day}
                        onDelete={handleDeleteDay}
                        isHighlighted={highlightedDayId === day.id}
                        anchorId={day.id}
                        selectedSeason={selectedSeason}
                      />
                      {index < section.days.length - 1 && <Separator className="bg-slate-100" />}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {!isLoading && !error && groupedSections.length === 0 && (
          <div className="text-center py-10 text-slate-500">
            <p>No ski days logged yet.</p>
            <Button
              onClick={() => navigate('/new')}
              className="w-full h-14 text-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg transition-all hover:shadow-xl mt-8"
            >
              <Plus className="mr-2 h-5 w-5" />
              Add Your First Day
            </Button>
          </div>
        )}
      </div>
      {isDeleting && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <Loader2 className="h-8 w-8 text-white animate-spin" />
        </div>
      )}
      </div>
    </>
  );
}
