export interface SkiDay {
  id?: string;
  date: Date;
  resort: string;
  ski_id: number;
  activity: string;
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
  id: number;
  email: string;
  created_at: string; // ISO 8601 date string
  updated_at: string; // ISO 8601 date string
}

// --- Ski Equipment Type ---
export interface Ski {
  id: number;
  name: string;
  user_id: number;
  created_at: string; // ISO 8601 date string
  updated_at: string; // ISO 8601 date string
}
