export type SeasonStatsMonthDatum = {
  month: string; // "Jan", "Feb", ...
  days: number;
};

export type SeasonStatsResortDatum = {
  name: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
  daysSkied: number;
};

export type SeasonStatsTagDatum = {
  name: string;
  count: number;
};

export type SeasonStatsSkiDatum = {
  name: string;
  days: number;
};

export type SeasonStats = {
  season: {
    offset: number;
    startDate: string; // YYYY-MM-DD
    endDate: string; // YYYY-MM-DD
    startYear: number;
    endYear: number;
  };
  summary: {
    totalDays: number;
    uniqueResorts: number;
    longestStreak: number;
  };
  daysPerMonth: SeasonStatsMonthDatum[];
  resorts: SeasonStatsResortDatum[];
  tags: SeasonStatsTagDatum[];
  skis: SeasonStatsSkiDatum[];
};
