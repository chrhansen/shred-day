import { StrictMode } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import { MemoryRouter } from 'react-router-dom';
import ConfirmEmailPage from '../ConfirmEmailPage';
import { ApiError, ValidationError } from '@/lib/apiClient';
import { emailConfirmationService } from '@/services/emailConfirmationService';

jest.mock('@/services/emailConfirmationService', () => ({ emailConfirmationService: { confirm: jest.fn(), request: jest.fn() } }));
const token = 'a'.repeat(43);
const show = (fragment = `#token=${token}`) => {
  window.history.replaceState({}, '', `/confirm-email${fragment}`);
  return render(<StrictMode><HelmetProvider><MemoryRouter initialEntries={[`/confirm-email${fragment}`]}><ConfirmEmailPage /></MemoryRouter></HelmetProvider></StrictMode>);
};
const fillPassword = (confirmation = 'new-password') => {
  fireEvent.change(screen.getByLabelText('New password', { exact: true }), { target: { value: 'new-password' } });
  fireEvent.change(screen.getByLabelText('Confirm new password'), { target: { value: confirmation } });
};
const submit = () => fireEvent.click(screen.getByRole('button', { name: 'Confirm email and set password' }));

beforeEach(() => jest.clearAllMocks());

it('captures a fragment token in memory and removes it before making any confirmation request', () => {
  const storage = jest.spyOn(Storage.prototype, 'setItem');
  show();
  expect(window.location.href).not.toContain(token);
  expect(window.location.hash).toBe('');
  expect(emailConfirmationService.confirm).not.toHaveBeenCalled();
  expect(emailConfirmationService.request).not.toHaveBeenCalled();
  expect(storage).not.toHaveBeenCalled();
  expect(screen.getByLabelText('New password', { exact: true })).toBeInTheDocument();
  storage.mockRestore();
});

it('posts the captured proof and matching new passwords only after submission, then requires normal sign-in', async () => {
  (emailConfirmationService.confirm as jest.Mock).mockResolvedValue({ message: 'Email confirmed.' });
  show();
  fillPassword();
  submit();
  await waitFor(() => expect(emailConfirmationService.confirm).toHaveBeenCalledWith(token, 'new-password', 'new-password'));
  expect(await screen.findByRole('heading', { name: 'Email confirmed' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Go to sign in' })).toHaveAttribute('href', '/auth');
  expect(screen.queryByLabelText('New password', { exact: true })).not.toBeInTheDocument();
  expect(window.location.pathname).toBe('/confirm-email');
});

it('does not consume the proof for mismatched passwords', () => {
  show();
  fillPassword('different-password');
  submit();
  expect(screen.getByRole('alert')).toHaveTextContent('Your passwords do not match');
  expect(emailConfirmationService.confirm).not.toHaveBeenCalled();
});

it('offers a new link after an expired or replayed proof is rejected', async () => {
  (emailConfirmationService.confirm as jest.Mock).mockRejectedValue(new ApiError('This confirmation link is invalid or has expired. Request a new one.', 422));
  show();
  fillPassword();
  submit();
  expect(await screen.findByRole('heading', { name: 'Request a new confirmation link' })).toBeInTheDocument();
  expect(screen.queryByLabelText('New password', { exact: true })).not.toBeInTheDocument();
  (emailConfirmationService.request as jest.Mock).mockResolvedValue({ message: 'If this address can use password sign-in, we’ll send a confirmation link.' });
  fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'skier@example.test' } });
  fireEvent.click(screen.getByRole('button', { name: 'Resend confirmation email' }));
  expect(await screen.findByRole('status')).toHaveTextContent('If this address can use password sign-in');
  expect(emailConfirmationService.request).toHaveBeenCalledWith('skier@example.test');
});

it('keeps the proof usable after server password validation fails', async () => {
  (emailConfirmationService.confirm as jest.Mock).mockRejectedValueOnce(new ValidationError(['Password is too long'])).mockResolvedValueOnce({ message: 'Email confirmed.' });
  show();
  fillPassword();
  submit();
  expect(await screen.findByRole('alert')).toHaveTextContent('Password is too long');
  expect(screen.getByLabelText('New password', { exact: true })).toBeInTheDocument();
  submit();
  expect(await screen.findByRole('heading', { name: 'Email confirmed' })).toBeInTheDocument();
  expect(emailConfirmationService.confirm).toHaveBeenCalledTimes(2);
});

it('allows retry after a network failure without putting the token back into the URL', async () => {
  (emailConfirmationService.confirm as jest.Mock).mockRejectedValueOnce(new TypeError('Network unavailable')).mockResolvedValueOnce({ message: 'Email confirmed.' });
  show();
  fillPassword();
  submit();
  expect(await screen.findByRole('alert')).toHaveTextContent('Network unavailable');
  submit();
  expect(await screen.findByRole('heading', { name: 'Email confirmed' })).toBeInTheDocument();
  expect(window.location.href).not.toContain(token);
});

it.each(['', '?token=' + token, '#token=invalid', '#token=' + token + '&token=' + token])('does not submit a missing, query-only or malformed token (%s)', fragment => {
  show(fragment);
  expect(screen.queryByLabelText('New password', { exact: true })).not.toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Request a new confirmation link' })).toBeInTheDocument();
  expect(emailConfirmationService.confirm).not.toHaveBeenCalled();
  expect(window.location.hash).toBe('');
  expect(window.location.search).toBe('');
});
