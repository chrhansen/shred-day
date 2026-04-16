import { apiClient } from '@/lib/apiClient';
import type { Resort } from '@/types/api';

// Re-export Resort for backward compatibility
export type { Resort };

export type CreateResortInput = {
  name: string;
  country?: string | null;
  latitude?: number;
  longitude?: number;
};

const searchResorts = async (query: string): Promise<Resort[]> => {
  return apiClient.get<Resort[]>('/api/v1/resorts', { query });
};

const createResort = async (resort: CreateResortInput): Promise<Resort> => {
  return apiClient.post<Resort>('/api/v1/resorts', { resort });
};

export const resortService = {
  searchResorts,
  createResort,
};
