import { apiClient } from '@/lib/apiClient';
import { Resort } from './resortService';

async function getRecentResorts(): Promise<Resort[]> {
  return apiClient.get<Resort[]>('/api/v1/recent_resorts');
}

// Add other user-related service functions here if needed

export const userService = {
  getRecentResorts,
};