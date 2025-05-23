import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { ChevronDown } from 'lucide-react';

interface SeasonDropdownProps {
  selectedSeason: string;
  availableSeasons: string[];
  onSeasonChange: (season: string) => void;
}

export default function SeasonDropdown({ selectedSeason, availableSeasons, onSeasonChange }: SeasonDropdownProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="text-lg font-semibold text-slate-700">
          {selectedSeason}
          <ChevronDown className="ml-1 h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center">
        {availableSeasons.map((season) => (
          <DropdownMenuItem key={season} onClick={() => onSeasonChange(season)}>
            {season}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
