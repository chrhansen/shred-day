import { fireEvent, render, screen } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import { MemoryRouter } from 'react-router-dom';
import ForgotPasswordPage from '../ForgotPasswordPage';
import { passwordResetService } from '@/services/passwordResetService';

jest.mock('@/services/passwordResetService', () => ({ passwordResetService: { request: jest.fn() } }));
const show = () => render(<HelmetProvider><MemoryRouter><ForgotPasswordPage /></MemoryRouter></HelmetProvider>);
const submit = () => {
  fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'skier@example.test' } });
  fireEvent.click(screen.getByRole('button', { name: 'Send reset link' }));
};
beforeEach(() => jest.clearAllMocks());

it('requests recovery by email and displays the generic server response', async () => {
  (passwordResetService.request as jest.Mock).mockResolvedValue({ message: 'If an account exists for this email address, we’ll send a password reset link.' });
  show();
  expect(passwordResetService.request).not.toHaveBeenCalled();
  submit();
  expect(await screen.findByRole('status')).toHaveTextContent('If an account exists');
  expect(passwordResetService.request).toHaveBeenCalledWith('skier@example.test');
  expect(screen.getByRole('link', { name: 'Back to sign in' })).toHaveAttribute('href', '/auth');
});

it('prevents repeated submissions while delivery is pending', () => {
  (passwordResetService.request as jest.Mock).mockReturnValue(new Promise(() => {}));
  show();
  submit();
  expect(screen.getByLabelText('Email address')).toBeDisabled();
  const pending = screen.getByRole('button', { name: 'Sending link…' });
  expect(pending).toBeDisabled();
  fireEvent.click(pending);
  expect(passwordResetService.request).toHaveBeenCalledTimes(1);
});

it('shows rate-limit or delivery failures and allows a retry', async () => {
  (passwordResetService.request as jest.Mock).mockRejectedValueOnce(new Error('Try again later.'))
    .mockResolvedValueOnce({ message: 'If an account exists, we’ll send a password reset link.' });
  show();
  submit();
  expect(await screen.findByRole('alert')).toHaveTextContent('Try again later.');
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
  submit();
  expect(await screen.findByRole('status')).toHaveTextContent('If an account exists');
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});
