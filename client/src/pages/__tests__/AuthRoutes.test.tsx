import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppRoutes } from '@/App';

jest.mock('leaflet/dist/leaflet.css', () => ({}));
jest.mock('@/pages/ConfirmEmailPage', () => ({ __esModule: true, default: () => <p>Public confirmation form</p> }));
jest.mock('@/pages/ForgotPasswordPage', () => ({ __esModule: true, default: () => <p>Public recovery request</p> }));
jest.mock('@/pages/ResetPasswordPage', () => ({ __esModule: true, default: () => <p>Public password reset form</p> }));
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

it.each([
  { isAuthenticated: false, isLoading: true, emailConfirmationRequired: false },
  { isAuthenticated: true, isLoading: false, emailConfirmationRequired: false },
  { isAuthenticated: false, isLoading: false, emailConfirmationRequired: true },
])('keeps password recovery public independently of authentication (%j)', state => {
  mockAuth = state;
  const request = render(<MemoryRouter initialEntries={['/forgot-password']}><AppRoutes /></MemoryRouter>);
  expect(screen.getByText('Public recovery request')).toBeInTheDocument();
  request.unmount();
  render(<MemoryRouter initialEntries={['/reset-password#token=proof']}><AppRoutes /></MemoryRouter>);
  expect(screen.getByText('Public password reset form')).toBeInTheDocument();
});
