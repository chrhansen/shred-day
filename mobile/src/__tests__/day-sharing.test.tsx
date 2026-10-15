import { act, fireEvent, render, renderHook, waitFor } from "@testing-library/react-native";
import { Alert, Share, View as MockView } from "react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { router } from "expo-router";
import { shred } from "../services/shred";
import { useDaySharing } from "../hooks/use-day-sharing";
import { DayShareSheet } from "../components/day-share-sheet";
import type { Day } from "../lib/types";

jest.mock("../contexts/auth", () => ({ useAuth: () => ({ user: { id: "user_1", username: "mara_skis" } }) }));
jest.mock("../services/shred", () => ({ shred: { shareDay: jest.fn(), unshareDay: jest.fn() } }));
jest.mock("expo-router", () => ({ router: { push: jest.fn() } }));
jest.mock("expo-clipboard", () => ({ setStringAsync: jest.fn().mockResolvedValue(true) }));
jest.mock("../components/ui/sheet", () => ({ BottomSheet: ({ visible, children, onDismiss }: { visible: boolean; children: ReactNode; onDismiss?: () => void }) =>
  visible ? <MockView testID="share-sheet" onAccessibilityEscape={onDismiss}>{children}</MockView> : null }));
const day: Day = { id: "day_1", date: "2026-10-11", day_number: 4, shared_at: null,
  notes: "A full day on snow.", resort: { id: "resort_1", name: "Sölden", country: "Austria", latitude: null, longitude: null },
  skis: [{ id: "ski_1", name: "Salomon QST 106" }], tags: [{ id: "tag_1", name: "Powder" }],
  photos: [{ id: "photo_1", filename: "snow.jpg", preview_url: "https://example.test/photo", full_url: "https://example.test/photo" }] };
let client: QueryClient;
const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
beforeEach(() => {
  jest.clearAllMocks();
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData(["day", day.id, "user_1"], day);
});
afterEach(() => client.clear());

test("sharing waits for server confirmation, merges a partial response and rejects duplicate toggles", async () => {
  let finish!: (result: Partial<Day>) => void;
  (shred.shareDay as jest.Mock).mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
  const { result } = renderHook(() => useDaySharing(day.id), { wrapper });
  let request!: Promise<void>;
  act(() => { request = result.current.update(true); void result.current.update(true); });
  expect(shred.shareDay).toHaveBeenCalledTimes(1);
  expect(client.getQueryData<Day>(["day", day.id, "user_1"])?.shared_at).toBeNull();
  expect(result.current.busy).toBe(true);
  await act(async () => { finish({ id: day.id, shared_at: "2026-10-11T12:00:00Z" }); await request; });
  const confirmed = client.getQueryData<Day>(["day", day.id, "user_1"]);
  expect(confirmed?.shared_at).toBe("2026-10-11T12:00:00Z");
  expect(confirmed?.resort).toEqual(day.resort);
  expect(confirmed?.photos).toEqual(day.photos);
  expect(result.current.busy).toBe(false);
});

test("unconfirmed revocation invalidates stale views; retry confirms the private state", async () => {
  client.setQueryData(["day", day.id, "user_1"], { ...day, shared_at: "2026-10-11T12:00:00Z" });
  client.setQueryData(["shared-day", day.id], day);
  (shred.unshareDay as jest.Mock).mockRejectedValueOnce(new Error("Network unavailable")).mockResolvedValueOnce({ id: day.id, shared_at: null });
  const { result } = renderHook(() => useDaySharing(day.id), { wrapper });
  await act(async () => { await result.current.update(false); });
  expect(result.current.failed).toBe(true);
  expect(client.getQueryData<Day>(["day", day.id, "user_1"])?.shared_at).not.toBeNull();
  expect(client.getQueryData(["shared-day", day.id])).toBeUndefined();
  expect(client.getQueryState(["day", day.id, "user_1"])?.isInvalidated).toBe(true);
  await act(async () => { await result.current.retry(); });
  expect(result.current.failed).toBe(false);
  expect(client.getQueryData<Day>(["day", day.id, "user_1"])?.shared_at).toBeNull();
  expect(client.getQueryData(["shared-day", day.id])).toBeUndefined();
});

test("stopping sharing asks before sending the revocation request", async () => {
  const alert = jest.spyOn(Alert, "alert").mockImplementation(() => {});
  const view = render(<DayShareSheet day={{ ...day, shared_at: "2026-10-11T12:00:00Z" }} visible onClose={jest.fn()} />, { wrapper });
  fireEvent(view.getByLabelText("Public link"), "valueChange", false);
  expect(alert).toHaveBeenCalledWith("Stop sharing this day?", expect.stringContaining("stop working"), expect.any(Array));
  expect(shred.unshareDay).not.toHaveBeenCalled();
  alert.mockRestore();
});

test("dismissing the native share dialog keeps an explicitly enabled public link", async () => {
  const nativeShare = jest.spyOn(Share, "share").mockResolvedValue({ action: Share.dismissedAction });
  const view = render(<DayShareSheet day={{ ...day, shared_at: "2026-10-11T12:00:00Z" }} visible onClose={jest.fn()} />, { wrapper });
  expect(view.getByText("Your email address stays private.")).toBeTruthy();
  expect(view.getByText("Photos may include their recorded location and capture time.")).toBeTruthy();
  fireEvent.press(view.getByText("Share Link…"));
  await waitFor(() => expect(nativeShare).toHaveBeenCalledWith(expect.objectContaining({ url: "https://shred.day/d/day_1" }), expect.any(Object)));
  expect(shred.unshareDay).not.toHaveBeenCalled();
  nativeShare.mockRestore();
});

test("public preview waits for the iOS share sheet to dismiss before navigation", () => {
  const close = jest.fn();
  const view = render(<DayShareSheet day={{ ...day, shared_at: "2026-10-11T12:00:00Z" }} visible onClose={close} />, { wrapper });
  fireEvent.press(view.getByText("Preview public page"));
  expect(close).toHaveBeenCalled();
  expect(router.push).not.toHaveBeenCalled();
  fireEvent(view.getByTestId("share-sheet"), "accessibilityEscape");
  expect(router.push).toHaveBeenCalledWith({ pathname: "/d/[id]", params: { id: day.id } });
});
