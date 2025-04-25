import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { skiService } from '@/services/skiService';
import { DayCard } from '@/components/DayCard';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Loader2 } from 'lucide-react';

export default function DaysListPage() {
  const navigate = useNavigate();
  const { data: days, isLoading, error } = useQuery({
    queryKey: ['days'],
    queryFn: skiService.getDays,
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white p-4">
      <div className="max-w-2xl mx-auto space-y-6 pt-8">
        {/* Header with Back Button */}
        <div className="flex justify-between items-center mb-6">
           <Button
            variant="ghost"
            className="text-slate-600 hover:text-slate-800"
            onClick={() => navigate(-1)}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
           <h1 className="text-2xl font-bold text-slate-800">All Ski Days</h1>
           {/* Placeholder for potential future actions like filtering */}
           <div className="w-16"></div>
        </div>

        {/* Content Area */}
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
          <div className="space-y-4">
            {days.map((day) => (
              <DayCard key={day.id} day={day} />
            ))}
          </div>
        )}

        {!isLoading && !error && (!days || days.length === 0) && (
          <div className="text-center py-10 text-slate-500">
            <p>No ski days logged yet.</p>
             <Button onClick={() => navigate('/log')} className="mt-4">
               Log Your First Day
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
