import { Plus } from "lucide-react";
import { StatsCard } from "@/components/StatsCard";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { skiService } from "@/services/skiService";
import Navbar from "@/components/Navbar";

export default function StatsPage() {
  const navigate = useNavigate();

  const { data: stats, isLoading } = useQuery({
    queryKey: ['skiStats'],
    queryFn: skiService.getStats,
  });

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

  return (
    <div className="min-h-screen bg-white">
      <Navbar title="Stats" rightContent={newDayButton} />
      <div className="max-w-md mx-auto space-y-8 p-4">
        <h1 className="text-2xl font-bold text-slate-800">Stats</h1>

        <div className="grid grid-cols-1 gap-6">
           <div
             onClick={() => !isLoading && navigate('/')}
             className={`cursor-pointer ${isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:-translate-y-1 transition-transform'}`}
             aria-label="View all ski days"
           >
             <StatsCard label="Days Skied" value={isLoading ? '...' : stats?.totalDays ?? 0} />
           </div>
           <StatsCard label="Resorts Visited" value={isLoading ? '...' : stats?.uniqueResorts ?? 0} />
           <StatsCard label="Most Used Ski" value={isLoading ? '...' : stats?.mostUsedSki ?? '-'} />
        </div>

      </div>
    </div>
  );
}
