import { AuthenticationError, handleApiError, API_BASE_URL, defaultFetchOptions } from './skiService'; // Import helpers

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
  // Construct URL string directly, handling potentially empty API_BASE_URL
  const endpoint = `${API_BASE_URL}/api/v1/resorts?query=${encodeURIComponent(query)}`;

  const response = await fetch(endpoint, {
    ...defaultFetchOptions,
    method: 'GET',
  });

  if (!response.ok) await handleApiError(response); // Use helper

  return await response.json();
};

export const resortService = {
  searchResorts,
};
