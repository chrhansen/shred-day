import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { skiService } from '@/services/skiService';
import { SkiDayItem } from '@/components/SkiDayItem';
import { Button } from '@/components/ui/button';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, Plus } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import Navbar from '@/components/Navbar';
import SeasonDropdown from '@/components/SeasonDropdown';
import { useAuth } from '@/contexts/AuthContext';

// Helper to convert season number to display string using user's season_start_day
const getSeasonDisplayName = (seasonNumber: number, seasonStartDay: string): string => {
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth(); // 0-indexed
  const currentDay = today.getDate();

  // Parse user's season start day
  const [startMonth, startDay] = seasonStartDay.split('-').map(num => parseInt(num, 10));

  // Determine what year the current season started
  // If we're before the season start date this calendar year, current season started last year
  let currentSeasonStartYear;
  if (currentMonth < startMonth - 1 || (currentMonth === startMonth - 1 && currentDay < startDay)) {
    currentSeasonStartYear = currentYear - 1;
  } else {
    currentSeasonStartYear = currentYear;
  }

  // Calculate the display year for the requested season
  const displaySeasonStartYear = currentSeasonStartYear + seasonNumber;
  return `${displaySeasonStartYear}/${String(displaySeasonStartYear + 1).slice(-2)} Season`;
};

export default function DaysListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // Initialize selectedSeason from URL parameter or default to 0
  const [selectedSeason, setSelectedSeason] = useState<number>(() => {
    const seasonParam = searchParams.get('season');
    return seasonParam ? parseInt(seasonParam, 10) : 0;
  });

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

  const { data: days, isLoading, error } = useQuery({
    queryKey: ['days', selectedSeason],
    queryFn: () => skiService.getDays(selectedSeason === 0 ? undefined : { season: selectedSeason }),
  });

  // Get available seasons and season_start_day from user account details
  const availableSeasons = user?.available_seasons || [0];
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

  const handleSeasonChange = (seasonDisplayName: string) => {
    // Convert display name back to season number
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();
    const currentDay = today.getDate();

    // Parse user's season start day
    const [startMonth, startDay] = seasonStartDay.split('-').map(num => parseInt(num, 10));

    // Determine current season start year (same logic as getSeasonDisplayName)
    let currentSeasonStartYear;
    if (currentMonth < startMonth - 1 || (currentMonth === startMonth - 1 && currentDay < startDay)) {
      currentSeasonStartYear = currentYear - 1;
    } else {
      currentSeasonStartYear = currentYear;
    }

    const seasonStartYear = parseInt(seasonDisplayName.substring(0, 4), 10);
    const seasonNumber = seasonStartYear - currentSeasonStartYear;
    setSelectedSeason(seasonNumber);
  };

  const newDayButton = (
    <Button
      onClick={() => navigate("/new")}
      size="sm"
      className="text-sm bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md transition-all hover:shadow-lg"
    >
      <Plus className="mr-1.0 h-4 w-4" />
      New Day
    </Button>
  );

  // Generate display names for available seasons
  const availableSeasonDisplayNames = availableSeasons.map(season => getSeasonDisplayName(season, seasonStartDay));
  const selectedSeasonDisplayName = getSeasonDisplayName(selectedSeason, seasonStartDay);

  return (
    <div className="min-h-screen bg-white">
      <Navbar
        rightContent={newDayButton}
        centerContent={
          isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin text-slate-700" />
          ) : (
            <SeasonDropdown
              selectedSeason={selectedSeasonDisplayName}
              availableSeasons={availableSeasonDisplayNames}
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

        {!isLoading && !error && days && Array.isArray(days) && days.length > 0 && (
          <div className="bg-white rounded-lg overflow-hidden">
            {days.map((day, index) => (
              <React.Fragment key={day.id}>
                <SkiDayItem day={day} onDelete={handleDeleteDay} />
                {index < days.length - 1 && <Separator className="bg-slate-100" />}
              </React.Fragment>
            ))}
          </div>
        )}

        {!isLoading && !error && (!days || !Array.isArray(days) || days.length === 0) && (
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
  );
}
