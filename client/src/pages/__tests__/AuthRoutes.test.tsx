import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppRoutes } from '@/App';

jest.mock('leaflet/dist/leaflet.css', () => ({}));
jest.mock('@/pages/ConfirmEmailPage', () => ({ __esModule: true, default: () => <p>Public confirmation form</p> }));
jest.mock('@/pages/AuthPage', () => ({ __esModule: true, default: () => <p>Password sign-in guidance</p> }));
let mockAuth = { isAuthenticated: false, isLoading: false, emailConfirmationRequired: false };
jest.mock('@/contexts/AuthContext', () => ({ AuthProvider: ({ children }: { children: React.ReactNode }) => children, useAuth: () => mockAuth }));

it.each([
  { isAuthenticated: false, isLoading: true, emailConfirmationRequired: false },
  { isAuthenticated: true, isLoading: false, emailConfirmationRequired: false },
  { isAuthenticated: false, isLoading: false, emailConfirmationRequired: true },
])('keeps confirmation public independently of current authentication (%j)', state => {
  mockAuth = state;
  render(<MemoryRouter initialEntries={['/confirm-email#token=proof']}><AppRoutes /></MemoryRouter>);
  expect(screen.getByText('Public confirmation form')).toBeInTheDocument();
});

it('routes a rejected legacy password session at home to confirmation/sign-in guidance', () => {
  mockAuth = { isAuthenticated: false, isLoading: false, emailConfirmationRequired: true };
  render(<MemoryRouter initialEntries={['/']}><AppRoutes /></MemoryRouter>);
  expect(screen.getByText('Password sign-in guidance')).toBeInTheDocument();
});
