import { apiClient } from '@/lib/apiClient';

interface ConfirmationMessage {
  message: string;
}

export const emailConfirmationService = {
  request(email: string): Promise<ConfirmationMessage> {
    return apiClient.post('/api/v1/email_confirmation_requests', { email });
  },
  confirm(token: string, password: string, passwordConfirmation: string): Promise<ConfirmationMessage> {
    return apiClient.post('/api/v1/email_confirmations', {
      token, password, password_confirmation: passwordConfirmation,
    });
  },
};
