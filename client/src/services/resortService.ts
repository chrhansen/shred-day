import { apiClient } from '@/lib/apiClient';

// Define the Resort type based on backend response
export interface Resort {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  country: string;
  region: string;
  created_at: string; // Or Date if you parse them
  updated_at: string; // Or Date if you parse them
}

const searchResorts = async (query: string): Promise<Resort[]> => {
  return apiClient.get<Resort[]>('/api/v1/resorts', { query });
};

export const resortService = {
  searchResorts,
};