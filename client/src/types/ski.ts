import { Resort } from "@/services/resortService";

// Detailed type for GET /days/:id, POST /days, PATCH /days/:id responses
export interface SkiDayDetail {
  id: string;
  date: string; // Keep as string for consistency with API response
  activity: string;
  notes?: string | null;
  // resort_id and ski_id are removed, access via nested objects
  user_id?: string;
  created_at?: string;
  updated_at?: string;
  // Nested objects are included by DaySerializer
  resort: Resort; // Assuming Resort type is correct and available
  skis: Ski[]; // Changed from ski: Ski to skis: Ski[]
  // Photos included by DaySerializer via PhotoSerializer
  photos: { id: string; preview_url: string | null; full_url: string; filename: string | null }[];
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

// Account Details Type
export interface AccountDetails {
  id: string;
  email: string;
  created_at: string; // ISO 8601 date string
  season_start_day: string; // Format "MM-DD"
  available_seasons: number[]; // Array of season offsets, e.g., [0, -1, -4]
}

// New type for the GET /days endpoint response item
export interface SkiDayEntry {
  id: string;
  date: string; // API returns string, we can parse it later
  activity: string;
  ski_names: string[];
  resort_name: string;
  has_notes: boolean;
  day_number: number;
  created_at: string;
  updated_at: string;
  photos?: { id: string; preview_url: string | null; full_url: string | null; filename: string | null }[];
}

// Standardized Photo object structure from backend (used in PhotoImport and DraftDay)
export interface ServerPhoto {
  id: string;
  preview_url: string | null;
  full_url: string | null;
  filename: string | null;
  taken_at?: string | null;
  resort?: Resort | null; // Full Resort object as per your serializer
  latitude?: number | null;
  longitude?: number | null;
  exif_state?: "pending" | "extracted" | "missing" | null;
  draft_day_id?: string | null; // As seen in screenshot data
  // any other fields your PhotoSerializer sends
}

export interface DraftDay {
  id: string;
  date: string; // Keep as string from API, convert to Date in frontend when needed
  decision?: "pending" | "merge" | "duplicate" | "skip"; // Align with SkiDayActionToggle
  resort?: Resort | null; // The determined resort for this draft day (can be null if group is by date only initially)
  photos?: ServerPhoto[];
  original_text?: string | null; // Changed from originalText to match backend
  day_id?: string | null; // Add day_id from backend response
  // photoCount can be photos.length
  skiDayExists?: boolean; // If backend can determine this for the group
}

export interface PhotoImport {
  id: string;
  user_id: string;
  status: "waiting" | "processing" | "committed" | "canceled" | "failed";
  created_at: string;
  updated_at: string;
  draft_days?: DraftDay[];
  photos?: ServerPhoto[]; // Root level photos, typically those not yet assigned or with missing EXIF
}

// Client-side representation for UI, especially for PhotoList/PhotoItem
export interface SkiPhoto {
  id: string;
  url: string;
  date?: Date | null;
  resort?: string | null; // Resort name for display
  originalResortId?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  exif_state?: "pending" | "extracted" | "missing" | null;
  originalFile?: File | null;
  uploadProgress?: number;
  uploadStatus?: 'uploading' | 'completed' | 'failed';
  serverId?: string | null;
  errorMessage?: string;
}

// Client-side preview object for InteractivePhotoUploader
export interface PhotoPreview {
  id: string;
  originalFile: File | null;
  previewUrl: string | null;
  serverId: string | null;
  uploadStatus: 'uploading' | 'completed' | 'failed';
  errorMessage?: string;
}
