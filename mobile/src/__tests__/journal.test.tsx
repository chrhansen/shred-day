import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { Pressable as MockPressable, Text as MockText, View as MockView } from "react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SafeAreaProvider } from "react-native-safe-area-context";
import type { ReactNode } from "react";
import { router } from "expo-router";
import DaysScreen from "../app/(tabs)/index";
import { DayDetail } from "../components/day-detail";
import { DayPhoto } from "../components/day-photo";
import { shred } from "../services/shred";
import { ApiError } from "../lib/api";
import type { Account, Day, DayEntry } from "../lib/types";

let mockUser: Account | null;
jest.mock("../contexts/auth", () => ({ useAuth: () => ({ user: mockUser }) }));
jest.mock("expo-router", () => ({ router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(), dismissTo: jest.fn() }, useScrollToTop: jest.fn() }));
jest.mock("../services/shred", () => ({ shred: { days: jest.fn(), day: jest.fn(), sharedDay: jest.fn(), deleteDay: jest.fn() } }));
jest.mock("../components/day-share-sheet", () => ({ DayShareSheet: () => null }));
jest.mock("../components/photo-viewer", () => ({ PhotoViewer: () => null }));
jest.mock("../components/day-gallery", () => ({ DayGallery: () => null }));
jest.mock("../components/season-picker", () => ({
  useSeason: () => ({ season: 0, setSeason: jest.fn() }),
  SeasonHeader: ({ right }: { right: ReactNode }) => <MockView>{right}</MockView>,
  seasonDateRange: () => ({ start: new Date(2026, 8, 1), label: "Sep 1, 2026 – Aug 31, 2027" }),
}));
jest.mock("../components/ui/calendar", () => ({ Calendar: ({ onSelect }: { onSelect: (value: string) => void }) =>
  <MockPressable accessibilityLabel="Choose empty date" onPress={() => onSelect("2026-10-07")}><MockText>Calendar test date</MockText></MockPressable> }));
const account: Account = { id: "user_1", username: "mara_skis", email: "mara@example.test", avatar_url: null,
  available_seasons: [0], season_start_day: "09-01" };
const entry: DayEntry = { id: "day_1", date: "2026-10-11", day_number: 4, resort_name: "Sölden",
  notes: "A full day on snow.", ski_names: ["Salomon QST 106"], tag_names: ["Powder"], photos: [] };
const day: Day = { id: entry.id, date: entry.date, notes: entry.notes, day_number: 4, shared_at: "2026-10-11T12:00:00Z",
  resort: { id: "resort_1", name: "Sölden", country: "Austria", latitude: null, longitude: null },
  skis: [], tags: [], photos: [] };
let client: QueryClient;
const wrapper = ({ children }: { children: ReactNode }) => <SafeAreaProvider initialMetrics={{
  frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 54, right: 0, bottom: 34, left: 0 },
}}><QueryClientProvider client={client}>{children}</QueryClientProvider></SafeAreaProvider>;
beforeEach(() => {
  jest.clearAllMocks(); mockUser = account;
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  (shred.days as jest.Mock).mockResolvedValue([entry]);
});
afterEach(() => client.clear());

test("journal row pushes the existing detail route", async () => {
  const view = render(<DaysScreen />, { wrapper });
  await waitFor(() => expect(view.getByText("Sölden")).toBeTruthy());
  fireEvent.press(view.getByText("Sölden"));
  expect(router.push).toHaveBeenCalledWith({ pathname: "/day/[id]", params: { id: "day_1" } });
});

test("an empty calendar date opens logging with that date preset", async () => {
  const view = render(<DaysScreen />, { wrapper });
  await waitFor(() => expect(view.getByText("Sölden")).toBeTruthy());
  fireEvent.press(view.getByLabelText("Calendar"));
  fireEvent.press(view.getByLabelText("Choose empty date"));
  fireEvent.press(view.getByText("Log a day on Oct 7"));
  expect(router.push).toHaveBeenCalledWith({ pathname: "/log", params: { date: "2026-10-07" } });
});

test("public detail works signed out and exposes no owner actions", async () => {
  mockUser = null;
  (shred.sharedDay as jest.Mock).mockResolvedValue({ ...day, user: { username: "mara_skis" } });
  const view = render(<DayDetail id={day.id} shared />, { wrapper });
  await waitFor(() => expect(view.getByText("Read-only")).toBeTruthy());
  expect(shred.sharedDay).toHaveBeenCalledWith(day.id);
  expect(shred.day).not.toHaveBeenCalled();
  expect(view.queryByLabelText("Edit day")).toBeNull();
  expect(view.queryByLabelText("Day actions")).toBeNull();
  expect(view.queryByText("Public link")).toBeNull();
  expect(view.getByText(day.notes!)).toBeTruthy();
});

test("revoked and invalid public links use the same unavailable copy", async () => {
  (shred.sharedDay as jest.Mock).mockRejectedValue(new ApiError("Day not found", 404));
  const view = render(<DayDetail id="day_revoked" shared />, { wrapper });
  await waitFor(() => expect(view.getByText("This day isn't shared anymore")).toBeTruthy());
  view.unmount();
  const invalid = render(<DayDetail id="" shared />, { wrapper });
  expect(invalid.getByText("This day isn't shared anymore")).toBeTruthy();
  expect(shred.sharedDay).toHaveBeenCalledTimes(1);
});

test("a revoked public link hides a previously cached day after the server returns 404", async () => {
  mockUser = null;
  client.setQueryData(["shared-day", day.id], { ...day, user: { username: "mara_skis" } });
  (shred.sharedDay as jest.Mock).mockRejectedValue(new ApiError("Day not found", 404));
  const view = render(<DayDetail id={day.id} shared />, { wrapper });
  await waitFor(() => expect(view.getByText("This day isn't shared anymore")).toBeTruthy());
  expect(view.queryByText(day.notes!)).toBeNull();
  expect(view.queryByText("Read-only")).toBeNull();
});

test("an owner day hides stale cached content when reconciliation confirms deletion", async () => {
  client.setQueryData(["day", day.id, account.id], day);
  (shred.day as jest.Mock).mockRejectedValue(new ApiError("Day not found", 404));
  const view = render(<DayDetail id={day.id} />, { wrapper });
  await waitFor(() => expect(view.getByText("This day is no longer available")).toBeTruthy());
  expect(view.queryByText(day.notes!)).toBeNull();
  expect(view.queryByLabelText("Edit day")).toBeNull();
});

test("photo retry remounts only the failed image with a fresh network request", () => {
  const photo = { id: "photo_1", filename: "snow.jpg", preview_url: "https://example.test/photo", full_url: "https://example.test/photo" };
  const view = render(<DayPhoto photo={photo} />);
  fireEvent(view.getByLabelText("snow.jpg"), "error", { nativeEvent: { error: "Unavailable" } });
  expect(view.getByText("Photo couldn't load")).toBeTruthy();
  fireEvent.press(view.getByText("Retry"));
  expect(view.queryByText("Photo couldn't load")).toBeNull();
  expect(view.getByLabelText("snow.jpg").props.cachePolicy).toBe("none");
});
