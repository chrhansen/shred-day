import { Resort } from "@/services/resortService";

export interface SkiDay {
  id?: string;
  date: Date;
  resort_id: string;
  ski_id: string;
  activity: string;
  user_id?: string; // Assuming user_id might be present
  created_at?: string;
  updated_at?: string;
  // Add nested objects (optional because they might not always be loaded)
  resort?: Resort;
  ski?: Ski;
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
}
