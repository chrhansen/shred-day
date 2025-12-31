import { SkiStats, UserCredentials, UserInfo, UserSignUp, Ski, SkiDayEntry, SkiDayDetail, SharedDayDetail } from '@/types/ski';
import { apiClient, AuthenticationError, API_BASE_URL, defaultFetchOptions, handleApiError } from '@/lib/apiClient';

// Re-export for backward compatibility
export { AuthenticationError, API_BASE_URL, defaultFetchOptions, handleApiError };

export const skiService = {
  async getStats(): Promise<SkiStats> {
    return apiClient.get<SkiStats>('/api/v1/stats');
  },

  async logDay(dayData: { date: string; resort_id: string; ski_ids: string[]; tag_ids: string[]; photo_ids: string[] }): Promise<SkiDayDetail> {
    return apiClient.post<SkiDayDetail>('/api/v1/days', { day: dayData });
  },

  async signUp(userData: UserSignUp): Promise<UserInfo> {
    return apiClient.post<UserInfo>('/api/v1/users', { user: userData });
  },

  async signIn(credentials: UserCredentials): Promise<UserInfo> {
    const response = await apiClient.post<{ user: UserInfo }>('/api/v1/sessions', credentials);
    return response.user;
  },

  async signOut(): Promise<void> {
    try {
      await apiClient.delete('/api/v1/sessions');
    } catch (error) {
      // Don't throw auth error on sign out failure, just log
      console.error('Sign out failed:', error);
    }
  },

  // --- Ski Equipment Methods ---

  async getSkis(): Promise<Ski[]> {
    return apiClient.get<Ski[]>('/api/v1/skis');
  },

  async addSki(skiData: { name: string }): Promise<Ski> {
    return apiClient.post<Ski>('/api/v1/skis', { ski: skiData });
  },

  async updateSki(skiId: string, skiData: { name: string }): Promise<Ski> {
    return apiClient.patch<Ski>(`/api/v1/skis/${skiId}`, { ski: skiData });
  },

  async deleteSki(skiId: string): Promise<void> {
    await apiClient.delete(`/api/v1/skis/${skiId}`);
  },

  // get all ski days
  async getDays(params?: { season?: number }): Promise<SkiDayEntry[]> {
    return apiClient.get<SkiDayEntry[]>('/api/v1/days', params);
  },

  // get a single ski day by ID
  async getDay(dayId: string): Promise<SkiDayDetail> {
    return apiClient.get<SkiDayDetail>(`/api/v1/days/${dayId}`);
  },

  async getSharedDay(dayId: string): Promise<SharedDayDetail> {
    return apiClient.get<SharedDayDetail>(`/api/v1/shared_days/${dayId}`);
  },

  async updateDay(
    dayId: string,
    dayData: Partial<Omit<SkiDayDetail, 'id' | 'resort' | 'photos' | 'skis'>> &
             { resort_id?: string; ski_ids?: string[]; tag_ids?: string[]; photo_ids?: string[] }
  ): Promise<SkiDayDetail> {
    return apiClient.patch<SkiDayDetail>(`/api/v1/days/${dayId}`, { day: dayData });
  },

  async createDayShare(dayId: string): Promise<SkiDayDetail> {
    return apiClient.post<SkiDayDetail>('/api/v1/shared_days', { shared_day: { day_id: dayId } });
  },

  async deleteDayShare(dayId: string): Promise<SkiDayDetail> {
    return apiClient.delete<SkiDayDetail>(`/api/v1/shared_days/${dayId}`);
  },

  async deleteDay(dayId: string): Promise<void> {
    await apiClient.delete(`/api/v1/days/${dayId}`);
  },

  // --- Photo Service Methods ---

  async uploadPhoto(file: File): Promise<{ id: string; preview_url: string | null; full_url: string | null; filename: string }> {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.uploadFormData('/api/v1/photos', formData);
  },

  async deletePhoto(photoId: string): Promise<void> {
    await apiClient.delete(`/api/v1/photos/${photoId}`);
  },

  async initiateGoogleSignIn(): Promise<{ url: string }> {
    return apiClient.post<{ url: string }>('/api/v1/google_sign_in_flow');
  },

  async completeGoogleSignIn(code: string, state: string): Promise<{ user: { email: string, name: string } }> {
    return apiClient.patch<{ user: { email: string, name: string } }>('/api/v1/google_sign_in_flow', { code, state });
  },
};
