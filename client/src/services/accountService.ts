import { AccountDetails } from '@/types/ski';
import { apiClient } from '@/lib/apiClient';

export const accountService = {
  async getAccountDetails(): Promise<AccountDetails> {
    return apiClient.get<AccountDetails>('/api/v1/account');
  },

  async updateAccountDetails(data: { season_start_day: string }): Promise<AccountDetails> {
    return apiClient.patch<AccountDetails>('/api/v1/account', { user: data });
  },
};