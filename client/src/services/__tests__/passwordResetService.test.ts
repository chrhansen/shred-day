import { passwordResetService } from '../passwordResetService';
import { ApiError, ValidationError } from '@/lib/apiClient';

global.fetch = jest.fn();
beforeEach(() => jest.clearAllMocks());

it('requests reset by email in a POST body', async () => {
  const message = { message: 'If an account exists, we’ll send a password reset link.' };
  (global.fetch as jest.Mock).mockResolvedValue({ ok: true, status: 202, json: async () => message });
  await expect(passwordResetService.request('skier@example.test')).resolves.toEqual(message);
  expect(global.fetch).toHaveBeenCalledWith(expect.stringMatching(/\/api\/v1\/password_reset_requests$/),
    expect.objectContaining({ method: 'POST', body: JSON.stringify({ email: 'skier@example.test' }) }));
});

it('sends the reset proof and new passwords only in a POST body', async () => {
  (global.fetch as jest.Mock).mockResolvedValue({ ok: true, status: 200, json: async () => ({ message: 'Password reset.' }) });
  await passwordResetService.reset('proof-in-body', 'new-password', 'new-password');
  expect(global.fetch).toHaveBeenCalledWith(expect.stringMatching(/\/api\/v1\/password_resets$/),
    expect.objectContaining({ method: 'POST', body: JSON.stringify({ token: 'proof-in-body', password: 'new-password', password_confirmation: 'new-password' }) }));
});

it('distinguishes expired proof from correctable password validation errors', async () => {
  (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false, status: 422, json: async () => ({ error: 'Invalid link' }) })
    .mockResolvedValueOnce({ ok: false, status: 422, json: async () => ({ errors: ['Password is too long'] }) });
  await expect(passwordResetService.reset('proof', 'password', 'password')).rejects.toBeInstanceOf(ApiError);
  await expect(passwordResetService.reset('proof', 'password', 'password')).rejects.toBeInstanceOf(ValidationError);
});
