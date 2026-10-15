import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import AccountPage from '../AccountPage';
import { accountService } from '@/services/accountService';

jest.mock('@/components/Navbar', () => ({ __esModule: true, default: () => <div>Account settings</div> }));
jest.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ logout: jest.fn() }) }));
jest.mock('@/services/accountService', () => ({ accountService: { getAccountDetails: jest.fn(), updateAccountDetails: jest.fn() } }));
jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

it('displays primary email read-only and leaves profile updates available without submitting email', async () => {
  const account = { id: 'usr_test', email: 'skier@example.test', username: 'skier', created_at: '2025-09-01T12:00:00Z', season_start_day: '09-01', available_seasons: [0] };
  (accountService.getAccountDetails as jest.Mock).mockResolvedValue(account);
  (accountService.updateAccountDetails as jest.Mock).mockResolvedValue({ ...account, username: 'ski_friend' });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  render(<QueryClientProvider client={client}><HelmetProvider><MemoryRouter><AccountPage /></MemoryRouter></HelmetProvider></QueryClientProvider>);
  expect(await screen.findByText(account.email)).toBeInTheDocument();
  expect(screen.queryByRole('textbox', { name: /email/i })).not.toBeInTheDocument();
  expect(screen.getByText('Email changes are currently unavailable.')).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'ski_friend' } });
  await waitFor(() => expect(screen.getByRole('button', { name: 'Save Changes' })).not.toBeDisabled());
  fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
  await waitFor(() => expect(accountService.updateAccountDetails).toHaveBeenCalledWith({ season_start_day: '09-01', username: 'ski_friend', avatar: null }));
});
