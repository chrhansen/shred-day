import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import { MemoryRouter } from 'react-router-dom';
import AuthPage from '../AuthPage';
import { skiService } from '@/services/skiService';
import { accountService } from '@/services/accountService';
import { EmailConfirmationRequiredError } from '@/lib/apiClient';
import { emailConfirmationService } from '@/services/emailConfirmationService';

const mockLogin = jest.fn();
const mockNavigate = jest.fn();
let mockConfirmationRequired = false;
jest.mock('react-router-dom', () => ({ ...jest.requireActual('react-router-dom'), useNavigate: () => mockNavigate }));
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ login: mockLogin, emailConfirmationRequired: mockConfirmationRequired }),
}));
jest.mock('@/services/skiService', () => ({ skiService: {
  signUp: jest.fn(), signIn: jest.fn(), initiateGoogleSignIn: jest.fn(),
} }));
jest.mock('@/services/accountService', () => ({ accountService: { getAccountDetails: jest.fn() } }));
jest.mock('@/services/emailConfirmationService', () => ({ emailConfirmationService: { request: jest.fn() } }));
jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

const showSignup = () => render(<HelmetProvider><MemoryRouter initialEntries={['/auth?mode=signup']}><AuthPage /></MemoryRouter></HelmetProvider>);

const showLogin = () => render(<HelmetProvider><MemoryRouter initialEntries={['/auth']}><AuthPage /></MemoryRouter></HelmetProvider>);
beforeEach(() => { jest.clearAllMocks(); mockConfirmationRequired = false; });

it('offers password recovery directly from the login form', () => {
  showLogin();
  expect(screen.getByRole('link', { name: 'Forgot password?' })).toHaveAttribute('href', '/forgot-password');
});

it('collects email only and explains that the email link confirms ownership and sets a password', () => {
  showSignup();
  expect(screen.queryByLabelText('Password', { exact: true })).not.toBeInTheDocument();
  expect(screen.getByText(/confirm.*email.*set.*password/i)).toBeInTheDocument();
});

it('requests signup confirmation without fetching an account or creating a client session', async () => {
  (skiService.signUp as jest.Mock).mockResolvedValue({ confirmation_required: true, message: 'Check your email to confirm your address and set your password.' });
  showSignup();
  fireEvent.change(screen.getByLabelText('Email', { exact: true }), { target: { value: 'skier@example.test' } });
  fireEvent.submit(screen.getByLabelText('Email', { exact: true }).closest('form')!);
  await waitFor(() => expect(skiService.signUp).toHaveBeenCalledWith({ email: 'skier@example.test' }));
  expect(await screen.findByRole('heading', { name: /check your email/i })).toBeInTheDocument();
  expect(accountService.getAccountDetails).not.toHaveBeenCalled();
  expect(mockLogin).not.toHaveBeenCalled();
});


it('shows confirmation/resend guidance after an unconfirmed password rejection without account access', async () => {
  (skiService.signIn as jest.Mock).mockRejectedValue(new EmailConfirmationRequiredError('Confirm your email.'));
  showLogin();
  fireEvent.change(screen.getByLabelText('Email', { exact: true }), { target: { value: 'skier@example.test' } });
  fireEvent.change(screen.getByLabelText('Password', { exact: true }), { target: { value: 'old-password' } });
  fireEvent.click(screen.getByRole('button', { name: 'Login' }));
  expect(await screen.findByRole('heading', { name: 'Confirm your email before password sign-in' })).toBeInTheDocument();
  expect(screen.getByLabelText('Password', { exact: true })).toHaveValue('');
  expect(accountService.getAccountDetails).not.toHaveBeenCalled();
  expect(mockLogin).not.toHaveBeenCalled();
  expect(emailConfirmationService.request).not.toHaveBeenCalled();
  (emailConfirmationService.request as jest.Mock).mockResolvedValue({ message: 'If this address can use password sign-in, we’ll send a confirmation link.' });
  fireEvent.click(screen.getByRole('button', { name: 'Resend confirmation email' }));
  expect(await screen.findByRole('status')).toHaveTextContent('If this address can use password sign-in');
  expect(emailConfirmationService.request).toHaveBeenCalledWith('skier@example.test');
});

it('offers explicit resend for a legacy session rejected by the account API', () => {
  mockConfirmationRequired = true;
  showLogin();
  expect(screen.getByRole('heading', { name: 'Confirm your email before password sign-in' })).toBeInTheDocument();
  expect(screen.getByLabelText('Email address')).toHaveValue('');
  expect(emailConfirmationService.request).not.toHaveBeenCalled();
});

it('allows retry after an unsuccessful resend without claiming mail was sent', async () => {
  (skiService.signUp as jest.Mock).mockResolvedValue({ confirmation_required: true, message: 'Check your email.' });
  (emailConfirmationService.request as jest.Mock).mockRejectedValueOnce(new Error('Try again shortly.')).mockResolvedValueOnce({ message: 'If this address can use password sign-in, we’ll send a confirmation link.' });
  showSignup();
  fireEvent.change(screen.getByLabelText('Email', { exact: true }), { target: { value: 'skier@example.test' } });
  fireEvent.submit(screen.getByLabelText('Email', { exact: true }).closest('form')!);
  fireEvent.click(await screen.findByRole('button', { name: 'Resend confirmation email' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Try again shortly.');
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Resend confirmation email' }));
  expect(await screen.findByRole('status')).toHaveTextContent('If this address can use password sign-in');
});

it('preserves normal confirmed password login', async () => {
  const user = { id: 'usr_test', email: 'skier@example.test' };
  (skiService.signIn as jest.Mock).mockResolvedValue(user);
  (accountService.getAccountDetails as jest.Mock).mockResolvedValue(user);
  showLogin();
  fireEvent.change(screen.getByLabelText('Email', { exact: true }), { target: { value: user.email } });
  fireEvent.change(screen.getByLabelText('Password', { exact: true }), { target: { value: 'confirmed-password' } });
  fireEvent.click(screen.getByRole('button', { name: 'Login' }));
  await waitFor(() => expect(mockLogin).toHaveBeenCalledWith(user));
  expect(mockNavigate).toHaveBeenCalledWith('/');
  expect(emailConfirmationService.request).not.toHaveBeenCalled();
});
