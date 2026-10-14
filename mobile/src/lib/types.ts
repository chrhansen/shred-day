export type Tag = { id: string; name: string };
export type Ski = Tag & { days?: DayEntry[] };
export type Resort = Tag & {
  country: string | null;
  region?: string | null;
  latitude: number | null;
  longitude: number | null;
};
export type Photo = {
  id: string;
  preview_url: string | null;
  full_url: string | null;
  filename: string | null;
};
export type Account = {
  id: string;
  email: string;
  full_name?: string | null;
  created_at?: string;
  username: string | null;
  avatar_url: string | null;
  season_start_day: string;
  available_seasons: number[];
};
export type DayEntry = {
  id: string;
  date: string;
  notes: string | null;
  resort_name: string;
  ski_names: string[];
  tag_names: string[];
  day_number: number;
  photos?: Photo[];
};
export type Day = {
  id: string;
  date: string;
  notes: string | null;
  shared_at: string | null;
  day_number: number;
  resort: Resort;
  skis: Ski[];
  tags: Tag[];
  photos: Photo[];
};
export type DayInput = {
  date: string;
  resort_id: string;
  ski_ids: string[];
  tag_ids: string[];
  photo_ids: string[];
  notes: string | null;
};
export type Session = {
  token: string;
  expires_at: string;
  authentication_method: "password" | "google" | "apple";
};
export type ProviderProof = {
  provider: "google" | "apple";
  identity_token: string;
  authorization_code?: string;
  challenge_id?: string;
};
export type SeasonStats = {
  season: {
    startDate: string;
    endDate: string;
    startYear: number;
    endYear: number;
  };
  summary: { totalDays: number; uniqueResorts: number; longestStreak: number };
  daysPerMonth: { month: string; days: number }[];
  resorts: {
    name: string;
    latitude: number | null;
    longitude: number | null;
    daysSkied: number;
  }[];
  tags: { name: string; count: number }[];
  skis: { name: string; days: number }[];
};
