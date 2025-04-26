import { Plus, LogOut, Settings } from "lucide-react";
import { StatsCard } from "@/components/StatsCard";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { skiService } from "@/services/skiService";
import { useAuth } from "@/contexts/AuthContext";

export default function Dashboard() {
  const navigate = useNavigate();
  const { logout, user } = useAuth();

  const { data: stats, isLoading } = useQuery({
    queryKey: ['skiStats'],
    queryFn: skiService.getStats,
  });

  return (
    <div className="min-h-screen bg-white p-4">
      <div className="max-w-md mx-auto space-y-8 pt-8">
        <div className="flex justify-between items-center mb-8">
           <h1 className="text-2xl font-bold text-slate-800">My Ski Journal</h1>
           <Button
             variant="ghost"
             size="icon"
             className="text-slate-600 hover:text-slate-800"
             onClick={() => navigate('/settings')}
             aria-label="Settings"
           >
             <Settings className="h-6 w-6" />
           </Button>
         </div>

        <div className="grid grid-cols-1 gap-6">
           <div
             onClick={() => !isLoading && navigate('/days')}
             className={`cursor-pointer ${isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:-translate-y-1 transition-transform'}`}
             aria-label="View all ski days"
           >
             <StatsCard label="Days Skied" value={isLoading ? '...' : stats?.totalDays ?? 0} />
           </div>
           <StatsCard label="Resorts Visited" value={isLoading ? '...' : stats?.uniqueResorts ?? 0} />
           <StatsCard label="Most Used Ski" value={isLoading ? '...' : stats?.mostUsedSki ?? 'N/A'} />
        </div>

        <Button
          onClick={() => navigate("/log")}
          className="w-full h-14 text-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg transition-all hover:shadow-xl"
        >
          <Plus className="mr-2 h-5 w-5" />
          Log a day
        </Button>

        <Button
          variant="outline"
          onClick={logout}
          className="w-full h-12 text-slate-600 border-slate-300 hover:bg-slate-100 hover:text-slate-800"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>

        {user && (
          <p className="text-center text-sm text-slate-500 mt-4">Logged in as {user.email}</p>
        )}
      </div>
    </div>
  );
}
