// @jest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import userEvent from "@testing-library/user-event";
import StatsPage from "../StatsPage";
import "@testing-library/jest-dom";
import type { ReactNode } from "react";

const mockGetSeasonDashboard = jest.fn();

jest.mock("@/services/dashboardService", () => ({
  dashboardService: {
    getSeasonDashboard: (...args: unknown[]) => mockGetSeasonDashboard(...args),
  },
}));

jest.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: {
      available_seasons: [0, -1],
      season_start_day: "09-01",
    },
  }),
}));

jest.mock("@/components/Navbar", () => ({
  __esModule: true,
  default: ({
    centerContent,
    rightContent,
  }: {
    centerContent?: ReactNode;
    rightContent?: ReactNode;
  }) => (
    <div>
      <div data-testid="navbar-center">{centerContent}</div>
      <div data-testid="navbar-right">{rightContent}</div>
    </div>
  ),
}));

jest.mock("@/components/dashboard/ResortMap", () => ({
  ResortMap: ({ resorts }: { resorts: unknown[] }) => (
    <div data-testid="resort-map">resorts:{resorts.length}</div>
  ),
}));

describe("StatsPage", () => {
  const originalResizeObserver = globalThis.ResizeObserver;
  let warnSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  const renderWithProviders = (initialEntry = "/stats") => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    return render(
      <QueryClientProvider client={queryClient}>
        <HelmetProvider>
          <MemoryRouter initialEntries={[initialEntry]}>
            <StatsPage />
          </MemoryRouter>
        </HelmetProvider>
      </QueryClientProvider>
    );
  };

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-02-07T12:00:00Z"));

    warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    (globalThis as unknown as { ResizeObserver: typeof ResizeObserver }).ResizeObserver =
      class {
      observe() {}
      unobserve() {}
      disconnect() {}
      };

    mockGetSeasonDashboard.mockResolvedValue({
      season: {
        offset: 0,
        startDate: "2025-09-01",
        endDate: "2026-08-31",
        startYear: 2025,
        endYear: 2026,
      },
      summary: { totalDays: 44, uniqueResorts: 5, currentStreak: 3 },
      daysPerMonth: [{ month: "Jan", days: 12 }],
      resorts: [
        {
          name: "Zermatt",
          country: "Switzerland",
          latitude: 46.0207,
          longitude: 7.7491,
          daysSkied: 8,
        },
      ],
      tags: [{ name: "Groomed", count: 18 }],
      skis: [{ name: "Atomic Redster G9, 181", days: 18 }],
    });
  });

  afterEach(() => {
    (globalThis as unknown as { ResizeObserver: typeof ResizeObserver }).ResizeObserver =
      originalResizeObserver;
    jest.clearAllMocks();
    warnSpy.mockRestore();
    errorSpy.mockRestore();
    jest.useRealTimers();
  });

  it("renders the dashboard cards", async () => {
    renderWithProviders();

    await waitFor(() => {
      expect(mockGetSeasonDashboard).toHaveBeenCalledWith(0);
    });

    expect(screen.getByText("44")).toBeInTheDocument();
    expect(screen.getByText(/days this season/i)).toBeInTheDocument();
    expect(screen.getByText(/Top Resorts/i)).toBeInTheDocument();
    expect(screen.getByText(/Top Tags/i)).toBeInTheDocument();
    expect(screen.getByText(/Skis Used/i)).toBeInTheDocument();
    expect(screen.getByTestId("resort-map")).toHaveTextContent("resorts:1");
  });

  it("changes season and refetches", async () => {
    const user = userEvent.setup({
      advanceTimers: jest.advanceTimersByTime,
      pointerEventsCheck: 0,
    });
    renderWithProviders("/stats?season=-1");

    await waitFor(() => {
      expect(mockGetSeasonDashboard).toHaveBeenCalledWith(-1);
    });

    const combobox = screen.getByRole("combobox");
    await user.click(combobox);

    const option = await screen.findByText("2025/26 Season");
    await user.click(option);

    await waitFor(() => {
      expect(mockGetSeasonDashboard).toHaveBeenCalledWith(0);
    });
  });
});
