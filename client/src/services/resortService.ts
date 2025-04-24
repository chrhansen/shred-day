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
  // Build URL with query parameters
  const url = new URL(`${API_BASE_URL}/api/v1/resorts`);
  url.searchParams.append('query', query);

  const response = await fetch(url.toString(), {
    ...defaultFetchOptions,
    method: 'GET',
  });

  if (!response.ok) await handleApiError(response); // Use helper

  return await response.json();
};

export const resortService = {
  searchResorts,
};
