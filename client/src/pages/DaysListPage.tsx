import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { skiService } from '@/services/skiService';
import { SkiDayItem } from '@/components/SkiDayItem';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Loader2, Plus } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';

export default function DaysListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: days, isLoading, error } = useQuery({
    queryKey: ['days'],
    queryFn: skiService.getDays,
  });

  const { mutate: deleteDay, isPending: isDeleting } = useMutation({
    mutationFn: skiService.deleteDay,
    onSuccess: () => {
      toast.success('Ski day deleted successfully!');
      queryClient.invalidateQueries({ queryKey: ['days'] });
      queryClient.invalidateQueries({ queryKey: ['skiStats'] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to delete ski day');
    },
  });

  const handleDeleteDay = (dayId: string) => {
    deleteDay(dayId);
  };

  return (
    <div className="min-h-screen bg-white p-4">
      <div className="max-w-2xl mx-auto">
        <Button
          variant="ghost"
          className="mb-4 text-slate-600 hover:text-slate-800"
          onClick={() => navigate(-1)}
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <h1 className="text-2xl font-bold text-slate-800 mb-8 text-center">Ski Days</h1>

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

        {!isLoading && !error && days && days.length > 0 && (
          <div className="bg-white rounded-lg overflow-hidden">
            {days.map((day, index) => (
              <React.Fragment key={day.id}>
                <SkiDayItem day={day} onDelete={handleDeleteDay} />
                {index < days.length - 1 && <Separator className="bg-slate-100" />}
              </React.Fragment>
            ))}
          </div>
        )}

        {!isLoading && !error && (!days || days.length === 0) && (
          <div className="text-center py-10 text-slate-500">
            <p>No ski days logged yet.</p>
            <Button
              onClick={() => navigate('/new')}
              className="w-full h-14 text-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg transition-all hover:shadow-xl mt-8"
            >
              <Plus className="mr-2 h-5 w-5" />
              Log Your First Day
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
