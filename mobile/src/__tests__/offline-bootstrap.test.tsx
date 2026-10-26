import { act, render, waitFor } from "@testing-library/react-native";
import { AppState, Text } from "react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as Network from "expo-network";
import { SyncProvider } from "../contexts/sync";
import { api } from "../lib/api";
import { localStore, offline } from "../lib/offline";
import { shred } from "../services/shred";
import type { Account } from "../lib/types";

jest.mock("expo-sqlite", () => {
  const { testDatabase } = jest.requireActual("./support/sqlite");
  const { db } = testDatabase();
  return { openDatabaseAsync: jest.fn(async () => db) };
});
jest.mock("expo-crypto", () => ({ randomUUID: () => jest.requireActual("node:crypto").randomUUID() }));
jest.mock("expo-file-system", () => ({ File: jest.fn(), Directory: jest.fn(), Paths: { document: "file:///documents/" } }));
jest.mock("expo-network", () => ({
  getNetworkStateAsync: jest.fn(async () => ({ isConnected: true, isInternetReachable: true })),
  addNetworkStateListener: jest.fn(() => ({ remove: jest.fn() })),
}));
jest.mock("../contexts/auth", () => ({ useAuth: () => ({ user: account, session, refresh: mockRefresh }) }));
const mockRefresh = jest.fn(async () => {});
const account: Account = { id: "usr_bootstrap", email: "skier@example.test", username: null, avatar_url: null,
  season_start_day: "09-01", available_seasons: [0, -1] };
const session = { token: "bootstrap-token" };
const skis = [{ id: "ski_1", name: "Powder skis" }];
const tags = [{ id: "tag_1", name: "Friends" }];
const resorts = [{ id: "res_1", name: "Sölden", country: "Austria", latitude: null, longitude: null }];
let client: QueryClient;
let fetchMock: jest.SpyInstance;
let view: ReturnType<typeof render> | undefined;
const newClient = () => new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
const mount = () => view = render(<QueryClientProvider client={client}><SyncProvider><Text>Journal</Text></SyncProvider></QueryClientProvider>);

beforeEach(async () => {
  jest.clearAllMocks(); AppState.currentState = "active";
  offline.detach(); offline.setWake(undefined); offline.setOnline(true);
  await (await localStore()).purge(account.id);
  api.token = session.token; client = newClient();
  await offline.activate(account.id, client); await offline.rememberAccount(account);
  fetchMock = jest.spyOn(global, "fetch").mockImplementation(async (input) => {
    const url = String(input);
    const data = url.endsWith("/skis") ? skis : url.endsWith("/tags") ? tags : url.endsWith("/recent_resorts") ? resorts
      : url.includes("/stats?season=") ? { summary: { totalDays: url.endsWith("=-1") ? 80 : 9 } } : undefined;
    if (!data) throw new Error("Unexpected request: " + url);
    return { ok: true, status: 200, json: async () => data } as Response;
  });
});
afterEach(() => { view?.unmount(); view = undefined; client.clear(); offline.detach(); jest.restoreAllMocks(); });

test("launch caches day choices and season counts before any editor or picker is opened", async () => {
  mount();
  await waitFor(() => {
    expect(client.getQueryData(["skis", account.id])).toEqual(skis);
    expect(client.getQueryData(["tags", account.id])).toEqual(tags);
    expect(client.getQueryData(["recent-resorts", account.id])).toEqual(resorts);
    expect(client.getQueryData(["stats", -1, account.id])).toMatchObject({ summary: { totalDays: 80 } });
  });
  view?.unmount(); view = undefined; client.clear(); offline.detach(); offline.setOnline(false);
  client = newClient(); await offline.activate(account.id, client); fetchMock.mockClear();
  expect(await shred.skis()).toEqual(skis);
  expect(await shred.tags()).toEqual(tags);
  expect(await shred.recentResorts()).toEqual(resorts);
  expect(await shred.resorts("Söld")).toEqual(resorts);
  expect(await shred.stats(-1)).toMatchObject({ summary: { totalDays: 80 } });
  const saved = await shred.saveDay({ date: "2026-10-27", resort_id: resorts[0].id, ski_ids: [skis[0].id],
    tag_ids: [tags[0].id], notes: "Airplane mode", photo_ids: [] }, undefined, { resort: resorts[0], skis, tags, photos: [] });
  const pending = await (await localStore()).changes(account.id);
  expect(pending).toHaveLength(1);
  expect(pending[0].body).toMatchObject({ resort_id: "res_1", ski_ids: ["ski_1"], tag_ids: ["tag_1"] });
  offline.detach(); client.clear(); client = newClient(); await offline.activate(account.id, client);
  expect(client.getQueryData(["day", saved.id, account.id])).toMatchObject({ resort: resorts[0], skis, tags, sync_state: "pending" });
  expect(fetchMock).not.toHaveBeenCalled();
});

test("reference downloads start while an existing upload is still in progress", async () => {
  let finish!: () => void;
  jest.spyOn(offline, "sync").mockImplementation(() => new Promise<void>((resolve) => { finish = resolve; }));
  mount();
  try {
    await waitFor(() => expect(client.getQueryData(["recent-resorts", account.id])).toEqual(resorts));
  } finally {
    await act(async () => { finish(); });
  }
});

test("a cold launch exposes saved counts while connectivity and refresh requests are still pending", async () => {
  await offline.stats(-1, async () => ({ summary: { totalDays: 80 } }));
  client.clear(); offline.detach(); client = newClient(); await offline.activate(account.id, client);
  expect(client.getQueryData(["stats", -1, account.id])).toMatchObject({ summary: { totalDays: 80 } });
  let finishNetwork!: (state: { isConnected: boolean; isInternetReachable: boolean }) => void;
  (Network.getNetworkStateAsync as jest.Mock).mockReturnValueOnce(new Promise(resolve => { finishNetwork = resolve; }));
  let finishFetch!: () => void;
  const blocked = new Promise<void>(resolve => { finishFetch = resolve; });
  const originalFetch = fetchMock.getMockImplementation()!;
  fetchMock.mockImplementation(async (...args) => { await blocked; return originalFetch(...args); });
  mount();
  try {
    await waitFor(() => {
      expect(client.getQueryState(["stats", -1, account.id])?.fetchStatus).toBe("fetching");
      expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/stats?season=-1"), expect.anything());
    });
    await act(async () => { finishNetwork({ isConnected: false, isInternetReachable: false }); });
    expect(client.getQueryData(["stats", -1, account.id])).toMatchObject({ summary: { totalDays: 80 } });
  } finally {
    view?.unmount(); view = undefined;
    await act(async () => { finishFetch(); });
  }
});
