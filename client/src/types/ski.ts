import { Resort } from "@/services/resortService";

// Detailed type for GET /days/:id, POST /days, PATCH /days/:id responses
export interface SkiDayDetail {
  id: string;
  date: string; // Keep as string for consistency with API response
  activity: string;
  // resort_id and ski_id are removed, access via nested objects
  user_id?: string;
  created_at?: string;
  updated_at?: string;
  // Nested objects are included by DaySerializer
  resort: Resort; // Assuming Resort type is correct and available
  ski: Ski; // Assuming Ski type is correct and available
  // Photos included by DaySerializer via PhotoSerializer
  photos: { id: string; preview_url: string | null; full_url: string | null; filename: string | null }[];
}

export interface SkiStats {
  totalDays: number;
  uniqueResorts: number;
  mostUsedSki: string;
}

// --- User Authentication Types ---
export interface UserCredentials {
  email: string;
  password: string;
}

export interface UserSignUp extends UserCredentials {
  // password_confirmation: string; // No longer needed
}

// Matches the structure returned by the Rails API (excluding password_digest)
export interface UserInfo {
  id: string;
  email: string;
  created_at: string; // ISO 8601 date string
  updated_at: string; // ISO 8601 date string
}

// --- Ski Equipment Type ---
export interface Ski {
  id: string;
  name: string;
  user_id: string;
  created_at: string; // ISO 8601 date string
  updated_at: string; // ISO 8601 date string
}

// New type for the GET /days endpoint response item
export interface SkiDayEntry {
  id: string;
  date: string; // API returns string, we can parse it later
  activity: string;
  ski_name: string;
  resort_name: string;
  created_at: string;
  updated_at: string;
  photos?: { id: string; preview_url: string | null; full_url: string | null; filename: string | null }[];
}
