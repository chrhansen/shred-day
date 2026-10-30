import { StrictMode } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import { MemoryRouter } from 'react-router-dom';
import ResetPasswordPage from '../ResetPasswordPage';
import { ApiError, ValidationError } from '@/lib/apiClient';
import { passwordResetService } from '@/services/passwordResetService';

const mockLogout = jest.fn().mockResolvedValue(undefined);
jest.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ logout: mockLogout }) }));
jest.mock('@/services/passwordResetService', () => ({ passwordResetService: { reset: jest.fn(), request: jest.fn() } }));
const token = 'a'.repeat(43);
const show = (fragment = `#token=${token}`) => {
  window.history.replaceState({}, '', `/reset-password${fragment}`);
  return render(<StrictMode><HelmetProvider><MemoryRouter initialEntries={[`/reset-password${fragment}`]}><ResetPasswordPage /></MemoryRouter></HelmetProvider></StrictMode>);
};
const fill = (confirmation = 'new-password', password = 'new-password') => {
  fireEvent.change(screen.getByLabelText('New password', { exact: true }), { target: { value: password } });
  fireEvent.change(screen.getByLabelText('Confirm new password'), { target: { value: confirmation } });
};
const submit = () => fireEvent.submit(screen.getByLabelText('New password', { exact: true }).closest('form')!);
beforeEach(() => jest.clearAllMocks());

it('holds the fragment proof in memory, scrubs the URL and waits for explicit submission', () => {
  const storage = jest.spyOn(Storage.prototype, 'setItem');
  show();
  expect(window.location.href).not.toContain(token);
  expect(window.location.hash).toBe('');
  expect(passwordResetService.reset).not.toHaveBeenCalled();
  expect(passwordResetService.request).not.toHaveBeenCalled();
  expect(storage).not.toHaveBeenCalled();
  storage.mockRestore();
});

it('submits both passwords with the captured token, clears credentials and returns to normal sign-in', async () => {
  (passwordResetService.reset as jest.Mock).mockResolvedValue({ message: 'Your password has been reset.' });
  show();
  fill();
  submit();
  expect(await screen.findByRole('heading', { name: 'Password reset' })).toBeInTheDocument();
  expect(passwordResetService.reset).toHaveBeenCalledWith(token, 'new-password', 'new-password');
  expect(screen.queryByLabelText('New password', { exact: true })).not.toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Go to sign in' })).toHaveAttribute('href', '/auth');
  expect(mockLogout).toHaveBeenCalledTimes(1);
});

it.each([
  ['different-password', 'new-password', 'Your passwords do not match.'],
  ['short', 'short', 'Use at least 8 characters'],
])('rejects invalid local passwords before sending (%s)', (confirmation, password, message) => {
  show();
  fill(confirmation, password);
  submit();
  expect(screen.getByRole('alert')).toHaveTextContent(message);
  expect(passwordResetService.reset).not.toHaveBeenCalled();
  expect(mockLogout).not.toHaveBeenCalled();
});

it.each(['', `?token=${token}`, '#token=invalid', `#token=${token}&token=${token}`])('offers recovery for missing or malformed proof (%s)', fragment => {
  show(fragment);
  expect(screen.queryByLabelText('New password', { exact: true })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Send reset link' })).toBeInTheDocument();
  expect(passwordResetService.reset).not.toHaveBeenCalled();
  expect(window.location.search).toBe('');
  expect(window.location.hash).toBe('');
});

it('offers another link when the server rejects an expired or reused token', async () => {
  (passwordResetService.reset as jest.Mock).mockRejectedValue(new ApiError('This password reset link is invalid or has expired. Request a new one.', 422));
  show();
  fill();
  submit();
  expect(await screen.findByRole('alert')).toHaveTextContent('invalid or has expired');
  expect(screen.queryByLabelText('New password', { exact: true })).not.toBeInTheDocument();
  (passwordResetService.request as jest.Mock).mockResolvedValue({ message: 'If an account exists, we’ll send a password reset link.' });
  fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'skier@example.test' } });
  fireEvent.click(screen.getByRole('button', { name: 'Send reset link' }));
  expect(await screen.findByRole('status')).toHaveTextContent('If an account exists');
});

it.each([new ValidationError(['Password is too long']), new TypeError('Network unavailable'), new ApiError('Try again shortly.', 429)])('retains proof for retryable errors (%s)', async error => {
  (passwordResetService.reset as jest.Mock).mockRejectedValueOnce(error).mockResolvedValueOnce({ message: 'Your password has been reset.' });
  show();
  fill();
  submit();
  expect(await screen.findByRole('alert')).toHaveTextContent(error.message);
  expect(screen.getByLabelText('New password', { exact: true })).toBeInTheDocument();
  submit();
  expect(await screen.findByRole('heading', { name: 'Password reset' })).toBeInTheDocument();
  expect(passwordResetService.reset).toHaveBeenCalledTimes(2);
});

it('disables the form and prevents duplicate resets while pending', () => {
  (passwordResetService.reset as jest.Mock).mockReturnValue(new Promise(() => {}));
  show();
  fill();
  submit();
  submit();
  expect(screen.getByLabelText('New password', { exact: true })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Resetting password…' })).toBeDisabled();
  expect(passwordResetService.reset).toHaveBeenCalledTimes(1);
});

it('waits for cached authentication to clear before offering sign-in', async () => {
  let finishLogout: () => void;
  mockLogout.mockReturnValueOnce(new Promise<void>(resolve => { finishLogout = resolve; }));
  (passwordResetService.reset as jest.Mock).mockResolvedValue({ message: 'Password reset.' });
  show();
  fill();
  submit();
  expect(await screen.findByRole('button', { name: 'Resetting password…' })).toBeDisabled();
  expect(screen.queryByRole('link', { name: 'Go to sign in' })).not.toBeInTheDocument();
  await act(async () => { finishLogout(); });
  expect(await screen.findByRole('link', { name: 'Go to sign in' })).toBeInTheDocument();
});
