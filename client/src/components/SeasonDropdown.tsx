import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { ChevronDown } from 'lucide-react';

interface Season {
  displayName: string;
  dateRange: string;
  value: string; // Assuming a value is needed for onSeasonChange
}

interface SeasonDropdownProps {
  selectedSeason: string;
  seasonsData: Season[]; // New prop
  onSeasonChange: (seasonValue: string) => void;
}

export default function SeasonDropdown({ selectedSeason, seasonsData, onSeasonChange }: SeasonDropdownProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="text-lg font-semibold text-slate-700">
          {selectedSeason}
          <ChevronDown className="ml-1 h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center">
        {seasonsData.map((season) => (
          <DropdownMenuItem key={season.value} onClick={() => onSeasonChange(season.value)}>
            <div className="flex flex-col">
              <div>{season.displayName}</div>
              <div className="text-xs text-muted-foreground">{season.dateRange}</div>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
