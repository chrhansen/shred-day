import { AuthenticationError, handleApiError, API_BASE_URL, defaultFetchOptions } from './skiService';
import { Resort } from './resortService'; // Import Resort type

async function getRecentResorts(): Promise<Resort[]> {
  const response = await fetch(`${API_BASE_URL}/api/v1/recent_resorts`, {
    ...defaultFetchOptions,
    method: 'GET',
  });

  if (!response.ok) await handleApiError(response);

  return await response.json();
}

// Add other user-related service functions here if needed

export const userService = {
  getRecentResorts,
};
