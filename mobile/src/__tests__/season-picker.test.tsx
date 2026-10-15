import { act, fireEvent, fireEventAsync, render, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { SeasonPicker } from "../components/season-picker";
import { shred } from "../services/shred";
import type { Account, SeasonStats } from "../lib/types";

let mockUser: Account | null;
jest.mock("../contexts/auth", () => ({ useAuth: () => ({ user: mockUser }) }));
jest.mock("../services/shred", () => ({ shred: { stats: jest.fn() } }));
jest.mock("../components/ui/sheet", () => ({
  BottomSheet: ({ visible, children }: { visible: boolean; children: ReactNode }) => visible ? children : null,
}));
jest.mock("../components/ui", () => {
  const { Text, Pressable } = jest.requireActual("react-native");
  return { colors: {}, Text, Icon: () => null,
    Button: ({ title, onPress }: { title: string; onPress: () => void }) =>
      <Pressable onPress={onPress}><Text>{title}</Text></Pressable>,
  };
});
const account: Account = { id: "user_1", username: "mara_skis", email: "mara@example.test", avatar_url: null,
  available_seasons: [0, -1, -2, -3], season_start_day: "09-01" };
const stats = (totalDays: number) => ({ summary: { totalDays } } as SeasonStats);
let client: QueryClient;
let change: jest.Mock;
const wrapper = ({ children }: { children: ReactNode }) =>
  <QueryClientProvider client={client}>{children}</QueryClientProvider>;
beforeEach(() => {
  jest.clearAllMocks(); mockUser = account; change = jest.fn();
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity, staleTime: 30_000 } } });
  (shred.stats as jest.Mock).mockImplementation(async (season: number) => stats(({ 0: 4, "-1": 80, "-2": 0, "-3": 27 })[season] || 0));
});
afterEach(() => client.clear());
const openPicker = (view: ReturnType<typeof render>) => fireEvent.press(view.getByRole("button", { name: /Change season/ }));

test("opening the picker loads counts for unvisited seasons without changing the selected season", async () => {
  client.setQueryData(["days", 0, account.id], Array.from({ length: 4 }, (_, index) => ({ id: `day_${index}` })));
  const view = render(<SeasonPicker value={0} onChange={change} />, { wrapper });
  expect(shred.stats).not.toHaveBeenCalled();
  openPicker(view);
  await waitFor(() => expect(view.getByRole("radio", { name: /Last Season, .*80 days/ })).toBeTruthy());
  expect(view.getByRole("radio", { name: /This Season, .*4 days/ })).toBeTruthy();
  expect(view.getByRole("radio", { name: /2 Seasons ago, .*No days/ })).toBeTruthy();
  expect(view.getByRole("radio", { name: /3 Seasons ago, .*27 days/ })).toBeTruthy();
  expect(shred.stats).toHaveBeenCalledTimes(4);
  expect(change).not.toHaveBeenCalled();
});

test("counts update when a day mutation invalidates existing season statistics", async () => {
  const view = render(<SeasonPicker value={0} onChange={change} />, { wrapper });
  openPicker(view);
  await view.findByText("80 days");
  (shred.stats as jest.Mock).mockImplementation(async (season: number) => stats(season === -1 ? 81 : 4));
  await act(() => client.invalidateQueries({ queryKey: ["stats"] }));
  await view.findByText("81 days");
  expect(view.queryByText("80 days")).toBeNull();
  expect(change).not.toHaveBeenCalled();
});

test("unknown counts show loading and retry after a failed request without blocking selection", async () => {
  mockUser = { ...account, available_seasons: [0, -1] };
  let rejectLast!: (reason: Error) => void;
  (shred.stats as jest.Mock).mockImplementation((season: number) => season === -1
    ? new Promise((_, reject) => { rejectLast = reject; }) : Promise.resolve(stats(4)));
  const view = render(<SeasonPicker value={0} onChange={change} />, { wrapper });
  openPicker(view);
  expect(view.getAllByText("Loading…").length).toBeGreaterThan(0);
  await view.findByText("4 days");
  await act(async () => rejectLast(new Error("Private diagnostic")));
  await view.findByText("Unavailable");
  expect(view.queryByText("Private diagnostic")).toBeNull();
  (shred.stats as jest.Mock).mockResolvedValue(stats(80));
  await fireEventAsync.press(view.getByText("Retry day counts"));
  await view.findByText("80 days");
  await fireEventAsync.press(view.getByRole("radio", { name: /Last Season, .*80 days/ }));
  expect(change).toHaveBeenCalledWith(-1);
});

test("switching accounts cannot show the previous account's season counts", async () => {
  const view = render(<SeasonPicker value={0} onChange={change} />, { wrapper });
  openPicker(view);
  await view.findByText("80 days");
  mockUser = { ...account, id: "user_2", available_seasons: [0, -1] };
  (shred.stats as jest.Mock).mockResolvedValue(stats(1));
  view.rerender(<SeasonPicker value={0} onChange={change} />);
  expect(view.queryByText("80 days")).toBeNull();
  await waitFor(() => expect(view.getAllByText("1 day")).toHaveLength(2));
  expect(client.getQueryData(["stats", -1, account.id])).toEqual(stats(80));
  expect(client.getQueryData(["stats", -1, "user_2"])).toEqual(stats(1));
});
