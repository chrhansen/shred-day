// @jest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import DaysListPage from '../DaysListPage';
import '@testing-library/jest-dom';

const mockGetDays = jest.fn();
const originalScrollIntoView = window.HTMLElement.prototype.scrollIntoView;
const originalResizeObserver = globalThis.ResizeObserver;

jest.mock('@/services/skiService', () => ({
  skiService: {
    getDays: (...args: unknown[]) => mockGetDays(...args),
    deleteDay: jest.fn(),
    getDay: jest.fn(),
    logDay: jest.fn(),
    updateDay: jest.fn(),
    getStats: jest.fn(),
    signUp: jest.fn(),
    signIn: jest.fn(),
    signOut: jest.fn(),
    getSkis: jest.fn(),
    addSki: jest.fn(),
    updateSki: jest.fn(),
    deleteSki: jest.fn(),
    uploadPhoto: jest.fn(),
    deletePhoto: jest.fn(),
    initiateGoogleSignIn: jest.fn(),
    completeGoogleSignIn: jest.fn(),
  },
}));

jest.mock('@/services/photoImportService', () => ({
  photoImportService: {
    createPhotoImport: jest.fn(),
  },
}));

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: {
      available_seasons: [0],
      season_start_day: '09-01',
    },
  }),
}));

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

describe('DaysListPage', () => {
  const scrollIntoViewMock = jest.fn();

  const renderWithProviders = (initialEntry = '/#day_revelstoke') => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[initialEntry]}>
          <DaysListPage />
        </MemoryRouter>
      </QueryClientProvider>
    );
  };

  beforeEach(() => {
    mockGetDays.mockResolvedValue([
      {
        id: 'day_whistler',
        resort_name: 'Whistler Blackcomb',
        date: '2025-01-15',
        day_number: 8,
        photos: [],
        ski_names: ['Line Blade'],
        tag_names: ['Resort Skiing'],
      },
      {
        id: 'day_revelstoke',
        resort_name: 'Revelstoke',
        date: '2025-02-01',
        day_number: 12,
        photos: [],
        ski_names: ['Line Blade'],
        tag_names: ['Backcountry'],
      },
    ]);

    (globalThis as any).ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };

    scrollIntoViewMock.mockClear();
    window.HTMLElement.prototype.scrollIntoView = scrollIntoViewMock as typeof originalScrollIntoView;
  });

  afterEach(() => {
    window.HTMLElement.prototype.scrollIntoView = originalScrollIntoView;
    (globalThis as any).ResizeObserver = originalResizeObserver;
    jest.clearAllMocks();
  });

  it('scrolls to and highlights the day referenced by the hash', async () => {
    renderWithProviders();

    await waitFor(() => {
      expect(mockGetDays).toHaveBeenCalled();
    });

    const highlightedRow = await screen.findByTestId('ski-day-item-day_revelstoke');
    expect(highlightedRow).toHaveAttribute('data-highlighted', 'true');
    expect(highlightedRow).toHaveClass('bg-blue-50');
    expect(scrollIntoViewMock).toHaveBeenCalled();

    const nonHighlightedRow = screen.getByTestId('ski-day-item-day_whistler');
    expect(nonHighlightedRow).not.toHaveAttribute('data-highlighted');
  });
});
