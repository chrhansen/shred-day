import { act, render } from "@testing-library/react-native";
import { AppState, Text, type AppStateStatus } from "react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as Network from "expo-network";
import { SyncProvider } from "../contexts/sync";
import { offline } from "../lib/offline";
import { cacheJournal } from "../services/shred";

let mockWake: (() => void) | undefined;
const mockRefresh = jest.fn(async () => {});
jest.mock("../contexts/auth", () => ({ useAuth: () => ({ user: { id: "usr_1", available_seasons: [0, -1] }, session: { token: "token" }, refresh: mockRefresh }) }));
jest.mock("../services/shred", () => ({ cacheJournal: jest.fn(async () => {}) }));
jest.mock("expo-network", () => ({ getNetworkStateAsync: jest.fn(), addNetworkStateListener: jest.fn() }));
jest.mock("../lib/offline", () => ({ offline: { sync: jest.fn(), setWake: jest.fn(), setOnline: jest.fn(), status: jest.fn() } }));
let networkChanged: (state: { isConnected: boolean }) => void;
let appChanged: (state: AppStateStatus) => void;
let client: QueryClient;
beforeEach(() => {
  jest.useFakeTimers(); jest.clearAllMocks(); mockWake = undefined;
  AppState.currentState = "active";
  (offline.sync as jest.Mock).mockResolvedValue(undefined);
  (offline.status as jest.Mock).mockReturnValue({ offline: false });
  (offline.setWake as jest.Mock).mockImplementation((wake) => { mockWake = wake; });
  (offline.setOnline as jest.Mock).mockImplementation((value) => { if (value) mockWake?.(); });
  (Network.getNetworkStateAsync as jest.Mock).mockResolvedValue({ isConnected: false, isInternetReachable: false });
  (Network.addNetworkStateListener as jest.Mock).mockImplementation((callback) => { networkChanged = callback; return { remove: jest.fn() }; });
  jest.spyOn(AppState, "addEventListener").mockImplementation((_name, callback) => { appChanged = callback; return { remove: jest.fn() }; });
  client = new QueryClient();
});
afterEach(() => { client.clear(); jest.useRealTimers(); jest.restoreAllMocks(); });
const mount = () => render(<QueryClientProvider client={client}><SyncProvider><Text>Journal</Text></SyncProvider></QueryClientProvider>);

test("reconnection wakes the durable upload queue", async () => {
  const view = mount(); await act(async () => {});
  const initial = (offline.sync as jest.Mock).mock.calls.length;
  await act(async () => { networkChanged({ isConnected: true }); });
  expect((offline.sync as jest.Mock).mock.calls.length).toBeGreaterThan(initial);
  expect(cacheJournal).toHaveBeenCalledWith(client, "usr_1", [0, -1]);
  view.unmount(); expect(mockWake).toBeUndefined();
});
test("returning to the foreground syncs without waiting for the retry timer", async () => {
  mount(); await act(async () => {});
  const initial = (offline.sync as jest.Mock).mock.calls.length;
  await act(async () => { appChanged("active"); });
  expect((offline.sync as jest.Mock).mock.calls.length).toBeGreaterThan(initial);
});
test("temporary failures back off and retry without removing queued work", async () => {
  (offline.sync as jest.Mock).mockRejectedValueOnce(new Error("No connection"));
  mount(); await act(async () => {});
  expect(offline.sync).toHaveBeenCalledTimes(1);
  await act(async () => { jest.advanceTimersByTime(4999); });
  expect(offline.sync).toHaveBeenCalledTimes(1);
  await act(async () => { jest.advanceTimersByTime(1); });
  expect(offline.sync).toHaveBeenCalledTimes(2);
});
test("a stale initial connectivity result cannot overwrite a newer reconnect event", async () => {
  let finish!: (state: { isConnected: boolean; isInternetReachable: boolean }) => void;
  (Network.getNetworkStateAsync as jest.Mock).mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
  mount(); await act(async () => {});
  await act(async () => { networkChanged({ isConnected: true }); });
  await act(async () => { finish({ isConnected: false, isInternetReachable: false }); });
  expect(offline.setOnline).toHaveBeenLastCalledWith(true);
});
