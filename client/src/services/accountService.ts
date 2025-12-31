import { AccountDetails } from '@/types/ski';
import { apiClient } from '@/lib/apiClient';

export const accountService = {
  async getAccountDetails(): Promise<AccountDetails> {
    return apiClient.get<AccountDetails>('/api/v1/account');
  },

  async updateAccountDetails(data: { season_start_day?: string; username?: string; avatar?: File | null }): Promise<AccountDetails> {
    if (data.avatar) {
      const formData = new FormData();
      if (data.season_start_day) formData.append('user[season_start_day]', data.season_start_day);
      if (data.username) formData.append('user[username]', data.username);
      formData.append('user[avatar]', data.avatar);
      return apiClient.patch<AccountDetails>('/api/v1/account', formData);
    }

    const payload: Record<string, string> = {};
    if (data.season_start_day) payload.season_start_day = data.season_start_day;
    if (data.username) payload.username = data.username;
    return apiClient.patch<AccountDetails>('/api/v1/account', { user: payload });
  },
};
