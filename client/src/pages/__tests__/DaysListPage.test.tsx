// @jest-environment jsdom
import { render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from "react-helmet-async";
import DaysListPage from '../DaysListPage';
import '@testing-library/jest-dom';

const mockGetDays = jest.fn();
const originalScrollIntoView = window.HTMLElement.prototype.scrollIntoView;
const originalResizeObserver = globalThis.ResizeObserver;
const originalRequestAnimationFrame = window.requestAnimationFrame;

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
        <HelmetProvider>
          <MemoryRouter initialEntries={[initialEntry]}>
            <DaysListPage />
          </MemoryRouter>
        </HelmetProvider>
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
    window.requestAnimationFrame = ((cb: FrameRequestCallback) => {
      cb(0);
      return 1;
    }) as typeof window.requestAnimationFrame;
  });

  afterEach(() => {
    window.HTMLElement.prototype.scrollIntoView = originalScrollIntoView;
    (globalThis as any).ResizeObserver = originalResizeObserver;
    window.requestAnimationFrame = originalRequestAnimationFrame;
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

  it('groups ski days into relative date sections', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-11-20T12:00:00Z'));

    mockGetDays.mockResolvedValue([
      {
        id: 'day_this_week',
        resort_name: 'This Week Resort',
        date: '2025-11-19',
        day_number: 20,
        photos: [],
        ski_names: [],
        tag_names: [],
      },
      {
        id: 'day_this_month',
        resort_name: 'This Month Resort',
        date: '2025-11-05',
        day_number: 19,
        photos: [],
        ski_names: [],
        tag_names: [],
      },
      {
        id: 'day_last_month',
        resort_name: 'Last Month Resort',
        date: '2025-10-10',
        day_number: 18,
        photos: [],
        ski_names: [],
        tag_names: [],
      },
      {
        id: 'day_september',
        resort_name: 'September Resort',
        date: '2025-09-01',
        day_number: 17,
        photos: [],
        ski_names: [],
        tag_names: [],
      },
    ]);

    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText('This week')).toBeInTheDocument();
    });

    expect(screen.getByText('This month')).toBeInTheDocument();
    expect(screen.getByText('Last month')).toBeInTheDocument();
    expect(screen.getByText('September 2025')).toBeInTheDocument();

    const thisWeekSection = screen.getByText('This week').nextElementSibling;
    expect(thisWeekSection).not.toBeNull();
    expect(within(thisWeekSection as HTMLElement).getByText('This Week Resort')).toBeInTheDocument();

    jest.useRealTimers();
  });
});
