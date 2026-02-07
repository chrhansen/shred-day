export type DashboardMonthDatum = {
  month: string; // "Jan", "Feb", ...
  days: number;
};

export type DashboardResortDatum = {
  name: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
  daysSkied: number;
};

export type DashboardTagDatum = {
  name: string;
  count: number;
};

export type DashboardSkiDatum = {
  name: string;
  days: number;
};

export type SeasonDashboard = {
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
    currentStreak: number;
    seasonGoalDays: number;
  };
  daysPerMonth: DashboardMonthDatum[];
  resorts: DashboardResortDatum[];
  tags: DashboardTagDatum[];
  skis: DashboardSkiDatum[];
};

