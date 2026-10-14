import { emailConfirmationService } from '../emailConfirmationService';
import { skiService } from '../skiService';
import { UserSignUp } from '@/types/ski';

global.fetch = jest.fn();
const respond = (data: unknown) => (global.fetch as jest.Mock).mockResolvedValue({ ok: true, status: 200, json: async () => data });
beforeEach(() => jest.clearAllMocks());

it('signs up with email only and returns a confirmation requirement rather than a user', async () => {
  const response = { confirmation_required: true, message: 'Check your email.' };
  respond(response);
  const result = await skiService.signUp({ email: 'skier@example.test', password: 'must-not-send' } as UserSignUp);
  expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/api/v1/users'), expect.objectContaining({ method: 'POST', body: JSON.stringify({ user: { email: 'skier@example.test' } }) }));
  expect(result).toEqual(response);
});

it('requests a link without credentials or confirmation proof in the URL', async () => {
  respond({ message: 'If this address can use password sign-in, we’ll send a confirmation link.' });
  await emailConfirmationService.request('skier@example.test');
  expect(global.fetch).toHaveBeenCalledWith(expect.stringMatching(/\/api\/v1\/email_confirmation_requests$/), expect.objectContaining({ method: 'POST', body: JSON.stringify({ email: 'skier@example.test' }) }));
});

it('confirms ownership only with a POST body containing the token and both new password fields', async () => {
  respond({ message: 'Email confirmed.' });
  await emailConfirmationService.confirm('proof-in-body', 'new-password', 'new-password');
  expect(global.fetch).toHaveBeenCalledWith(expect.stringMatching(/\/api\/v1\/email_confirmations$/), expect.objectContaining({ method: 'POST', body: JSON.stringify({ token: 'proof-in-body', password: 'new-password', password_confirmation: 'new-password' }) }));
});
