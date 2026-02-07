import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type SeasonOption = {
  value: string;
  label: string;
};

type SeasonSelectorProps = {
  seasons: SeasonOption[];
  selectedSeason: string;
  onSeasonChange: (seasonValue: string) => void;
};

export function SeasonSelector({
  seasons,
  selectedSeason,
  onSeasonChange,
}: SeasonSelectorProps) {
  return (
    <Select value={selectedSeason} onValueChange={onSeasonChange}>
      <SelectTrigger className="w-auto h-8 text-sm text-slate-500 border-0 bg-transparent hover:bg-slate-100 focus:ring-0 focus:ring-offset-0 px-2 -mr-2">
        <SelectValue placeholder="Select season" />
      </SelectTrigger>
      <SelectContent className="bg-white border shadow-lg">
        {seasons.map((season) => (
          <SelectItem key={season.value} value={season.value}>
            {season.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

