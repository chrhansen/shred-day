import { apiClient } from '@/lib/apiClient';

type PasswordResetMessage = { message: string };

export const passwordResetService = {
  request(email: string): Promise<PasswordResetMessage> {
    return apiClient.post('/api/v1/password_reset_requests', { email });
  },
  reset(token: string, password: string, passwordConfirmation: string): Promise<PasswordResetMessage> {
    return apiClient.post('/api/v1/password_resets', {
      token, password, password_confirmation: passwordConfirmation,
    });
  },
};
