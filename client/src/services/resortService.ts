import { apiClient } from '@/lib/apiClient';
import type { Resort } from '@/types/api';

// Re-export Resort for backward compatibility
export type { Resort };

const searchResorts = async (query: string): Promise<Resort[]> => {
  return apiClient.get<Resort[]>('/api/v1/resorts', { query });
};

const createResort = async (resort: { name: string; country: string }): Promise<Resort> => {
  return apiClient.post<Resort>('/api/v1/resorts', { resort });
};

export const resortService = {
  searchResorts,
  createResort,
};
