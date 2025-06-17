import { apiClient } from '@/lib/apiClient';
import type { Resort } from '@/types/api';

// Re-export Resort for backward compatibility
export type { Resort };

const searchResorts = async (query: string): Promise<Resort[]> => {
  return apiClient.get<Resort[]>('/api/v1/resorts', { query });
};

export const resortService = {
  searchResorts,
};