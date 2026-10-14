import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from '../AuthContext';
import { EmailConfirmationRequiredError } from '@/lib/apiClient';
import { accountService } from '@/services/accountService';

jest.mock('@/services/accountService', () => ({ accountService: { getAccountDetails: jest.fn() } }));
function Status() {
  const auth = useAuth();
  return <div><span data-testid="authenticated">{String(auth.isAuthenticated)}</span><span data-testid="confirmation">{String(auth.emailConfirmationRequired)}</span><span data-testid="user">{auth.user?.email || 'none'}</span></div>;
}
const show = (client = new QueryClient({ defaultOptions: { queries: { gcTime: 0 } } })) => {
  render(<QueryClientProvider client={client}><AuthProvider><Status /></AuthProvider></QueryClientProvider>);
};
beforeEach(() => jest.clearAllMocks());

it('surfaces legacy confirmation rejection and hides cached account details without retrying auth', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { gcTime: 0 } } });
  client.setQueryData(['accountDetails'], { id: 'usr_old', email: 'old@example.test' }, { updatedAt: 1 });
  (accountService.getAccountDetails as jest.Mock).mockRejectedValue(new EmailConfirmationRequiredError('Confirm your email.'));
  show(client);
  await waitFor(() => expect(screen.getByTestId('confirmation')).toHaveTextContent('true'));
  expect(screen.getByTestId('authenticated')).toHaveTextContent('false');
  expect(screen.getByTestId('user')).toHaveTextContent('none');
  expect(accountService.getAccountDetails).toHaveBeenCalledTimes(1);
});

it('keeps confirmed account restoration available', async () => {
  (accountService.getAccountDetails as jest.Mock).mockResolvedValue({ id: 'usr_confirmed', email: 'confirmed@example.test' });
  show();
  await waitFor(() => expect(screen.getByTestId('authenticated')).toHaveTextContent('true'));
  expect(screen.getByTestId('confirmation')).toHaveTextContent('false');
  expect(screen.getByTestId('user')).toHaveTextContent('confirmed@example.test');
});
