import { AccountDetails } from '@/types/ski';
import { API_BASE_URL, defaultFetchOptions, handleApiError } from './skiService';

// Custom error for account-related issues if needed, though handleApiError might suffice
// export class AccountServiceError extends Error {
//   constructor(message: string) {
//     super(message);
//     this.name = 'AccountServiceError';
//   }
// }

export const accountService = {
  async getAccountDetails(): Promise<AccountDetails> {
    const response = await fetch(`${API_BASE_URL}/api/v1/account`, {
      ...defaultFetchOptions,
      method: 'GET',
    });
    if (!response.ok) await handleApiError(response);
    return await response.json();
  },

  async updateAccountDetails(data: { season_start_day: string }): Promise<AccountDetails> {
    const response = await fetch(`${API_BASE_URL}/api/v1/account`, {
      ...defaultFetchOptions,
      method: 'PATCH',
      body: JSON.stringify({ user: data }), // Rails expects params nested under 'user' key
    });
    if (!response.ok) await handleApiError(response);
    return await response.json();
  },
};
