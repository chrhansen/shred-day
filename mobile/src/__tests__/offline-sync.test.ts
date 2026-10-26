import { QueryClient } from "@tanstack/react-query";
import { offline, localStore } from "../lib/offline";
import { api } from "../lib/api";
import type { Account, Day, DayInput } from "../lib/types";

jest.mock("expo-sqlite", () => {
  const { testDatabase } = jest.requireActual("./support/sqlite");
  const { db } = testDatabase();
  return { openDatabaseAsync: jest.fn(async () => db) };
});
jest.mock("expo-crypto", () => ({ randomUUID: () => jest.requireActual("node:crypto").randomUUID() }));
jest.mock("expo-file-system", () => ({ File: jest.fn().mockImplementation(() => new Blob(["photo"])),
  Directory: jest.fn(), Paths: { document: "file:///documents/" } }));

const account: Account = { id: "usr_1", email: "skier@example.com", username: null, avatar_url: null, season_start_day: "09-01", available_seasons: [0] };
const day: Day = { id: "day_server", date: "2026-10-25", notes: "Powder", updated_at: "2026-10-25T10:00:00.000001Z",
  resort: { id: "res_1", name: "Sölden", country: "Austria", latitude: null, longitude: null },
  day_number: 1, skis: [], tags: [], photos: [], shared_at: null };
const body: DayInput = { date: day.date, resort_id: day.resort.id, notes: day.notes, ski_ids: [], tag_ids: [], photo_ids: [] };
let client: QueryClient;
let fetchMock: jest.SpyInstance;
const response = (payload: unknown, status = 200) => ({ ok: status < 400, status, json: async () => payload } as Response);
beforeEach(async () => {
  offline.detach(); offline.setWake(undefined); offline.setOnline(true);
  const store = await localStore(); await store.purge(account.id); await store.purge("usr_2");
  api.token = "first-account-token";
  client = new QueryClient({ defaultOptions: { queries: { gcTime: Infinity, retry: false } } });
  await offline.activate(account.id, client); await offline.rememberAccount(account);
  fetchMock = jest.spyOn(global, "fetch");
});
afterEach(() => { fetchMock.mockRestore(); client.clear(); offline.detach(); });

test("offline creation is durable and visible immediately without a network request", async () => {
  offline.setOnline(false);
  const saved = await offline.save(body, undefined, { resort: day.resort, skis: [], tags: [], photos: [] });
  expect(saved.sync_state).toBe("pending");
  expect(client.getQueryData(["days", 0, account.id])).toEqual([expect.objectContaining({ id: saved.id, notes: "Powder" })]);
  expect(fetchMock).not.toHaveBeenCalled();
  offline.detach();
  const restarted = new QueryClient();
  await offline.activate(account.id, restarted);
  expect(restarted.getQueryData(["day", saved.id, account.id])).toMatchObject({ notes: "Powder", sync_state: "pending" });
  restarted.clear();
});
test("a lost response retries exactly the same operation after restarting", async () => {
  await offline.save(body, undefined, { resort: day.resort, skis: [], tags: [], photos: [] });
  fetchMock.mockRejectedValueOnce(new Error("Connection lost after server commit"));
  await expect(offline.sync()).rejects.toThrow("Could not reach");
  const first = fetchMock.mock.calls[0][1].body;
  offline.detach(); await offline.activate(account.id, client);
  fetchMock.mockResolvedValueOnce(response({ day }));
  await offline.sync();
  expect(fetchMock.mock.calls[1][1].body).toBe(first);
  expect(await (await localStore()).changes(account.id)).toEqual([]);
  expect(client.getQueryData(["days", 0, account.id])).toEqual([expect.objectContaining({ id: day.id })]);
  expect((client.getQueryData<Day[]>(["days", 0, account.id]))?.[0].sync_state).toBeUndefined();
});
test("uploads selected photos once before saving, and reuses the upload after a failed day request", async () => {
  const photo = { id: "local_photo_a-very-long-random-id", full_url: "file:///documents/photo.heic", preview_url: "file:///documents/photo.heic", filename: "photo.heic" };
  await offline.save({ ...body, photo_ids: [photo.id] }, undefined, { resort: day.resort, skis: [], tags: [], photos: [photo] });
  fetchMock.mockResolvedValueOnce(response({ ...photo, id: "pho_server" })).mockRejectedValueOnce(new Error("Offline"));
  await expect(offline.sync()).rejects.toThrow();
  expect(fetchMock.mock.calls[0][1].body.get("upload_id")).toBe(photo.id);
  fetchMock.mockResolvedValueOnce(response({ day: { ...day, photos: [{ ...photo, id: "pho_server" }] } }));
  await offline.sync();
  expect(fetchMock).toHaveBeenCalledTimes(3);
  expect(JSON.parse(fetchMock.mock.calls[2][1].body).day.photo_ids).toEqual(["pho_server"]);
  offline.setOnline(false);
  expect(await offline.day(day.id, async () => day)).toMatchObject({ photos: [expect.objectContaining({ full_url: photo.full_url })] });
});
test("a conflicting update keeps the local day and blocks later changes to that day", async () => {
  await offline.days(0, async () => [day]);
  await offline.save({ ...body, notes: "Offline edit" }, day.id);
  await offline.save({ ...body, notes: "Newer offline edit" }, day.id);
  fetchMock.mockResolvedValueOnce(response({ error: "Conflict" }, 409)).mockResolvedValueOnce(response({ ...day, notes: "Website edit", updated_at: "new-version" }));
  await offline.sync();
  expect(await offline.day(day.id, async () => day)).toMatchObject({ notes: "Newer offline edit", sync_state: "failed" });
  expect(fetchMock).toHaveBeenCalledTimes(2);
  await offline.resolve(day.id, true);
  fetchMock.mockResolvedValueOnce(response({ day: { ...day, notes: "Newer offline edit" } }));
  await offline.sync();
  expect(JSON.parse(fetchMock.mock.calls[2][1].body)).toMatchObject({ version: "new-version", day: { notes: "Newer offline edit" } });
});
test("a replacement account cannot render or upload the previous journal", async () => {
  await offline.save(body, undefined, { resort: day.resort, skis: [], tags: [], photos: [] });
  offline.detach(); client.clear(); api.token = "second-account-token";
  await offline.activate("usr_2", client);
  await offline.sync();
  expect(fetchMock).not.toHaveBeenCalled();
  expect(client.getQueryData(["days", 0, account.id])).toBeUndefined();
  expect(await (await localStore()).changes(account.id)).toHaveLength(1);
});
test("a permanently failed entry does not stop another day from syncing", async () => {
  await offline.save(body, undefined, { resort: day.resort, skis: [], tags: [], photos: [] });
  await offline.save({ ...body, date: "2026-10-24" }, undefined, { resort: day.resort, skis: [], tags: [], photos: [] });
  fetchMock.mockResolvedValueOnce(response({ error: "Resort was removed" }, 422)).mockResolvedValueOnce(response({ day: { ...day, date: "2026-10-24" } }));
  await offline.sync();
  expect(fetchMock).toHaveBeenCalledTimes(2);
  expect(offline.status()).toMatchObject({ failed: 1, pending: 1 });
});
test("a season response started before an acknowledged save cannot erase that day", async () => {
  let finish!: (days: Day[]) => void;
  const fetching = offline.days(0, () => new Promise((resolve) => { finish = resolve; }));
  while (!finish) await Promise.resolve();
  await offline.save(body, undefined, { resort: day.resort, skis: [], tags: [], photos: [] });
  fetchMock.mockResolvedValueOnce(response({ day }));
  await offline.sync();
  finish([]); await fetching;
  expect(client.getQueryData(["days", 0, account.id])).toEqual([expect.objectContaining({ id: day.id, notes: "Powder" })]);
});
test("a stale detail response cannot overwrite a new offline edit", async () => {
  await offline.days(0, async () => [day]);
  let finish!: (value: Day) => void;
  const fetching = offline.day(day.id, () => new Promise((resolve) => { finish = resolve; }));
  while (!finish) await Promise.resolve();
  await offline.save({ ...body, notes: "New local notes" }, day.id);
  finish(day);
  expect(await fetching).toMatchObject({ notes: "New local notes", sync_state: "pending" });
});
test("deleting the only unsynced entry clears a season that has never been downloaded", async () => {
  offline.setOnline(false);
  const saved = await offline.save(body, undefined, { resort: day.resort, skis: [], tags: [], photos: [] });
  await offline.remove(saved.id);
  expect(client.getQueryData(["days", 0, account.id])).toEqual([]);
  offline.detach(); client.clear(); await offline.activate(account.id, client);
  const pending = await (await localStore()).changes(account.id);
  expect(pending.map((change) => change.kind)).toEqual(["save", "delete"]);
  offline.setOnline(true);
  fetchMock.mockResolvedValueOnce(response({ day })).mockResolvedValueOnce(response({ day: null }));
  await offline.sync();
  expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toMatchObject({ action_type: "delete", day_id: day.id, version: day.updated_at });
  expect(await (await localStore()).changes(account.id)).toEqual([]);
});
test("same-date entries receive separate day numbers, matching Rails", async () => {
  await offline.days(0, async () => [{ ...day, created_at: "2026-10-25T09:00:00Z" }, { ...day, id: "day_second", created_at: "2026-10-25T11:00:00Z" }]);
  expect((client.getQueryData<Day[]>(["days", 0, account.id]))?.map((day) => day.day_number)).toEqual([2, 1]);
});
test("discarding a failed edit accepts a confirmed server deletion", async () => {
  await offline.days(0, async () => [day]);
  await offline.save(body, day.id);
  fetchMock.mockResolvedValueOnce(response({ error: "Day missing" }, 404)); await offline.sync();
  fetchMock.mockResolvedValueOnce(response({ error: "Day missing" }, 404)); await offline.resolve(day.id, false);
  expect(await (await localStore()).changes(account.id)).toEqual([]);
  expect(await (await localStore()).get(account.id, "day:" + day.id)).toBeUndefined();
});
test("a response arriving after logout cannot recreate purged local account data", async () => {
  await offline.save(body, undefined, { resort: day.resort, skis: [], tags: [], photos: [] });
  let finish!: (value: Response) => void;
  fetchMock.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
  const syncing = offline.sync(); while (!finish) await Promise.resolve();
  offline.detach(); await (await localStore()).purge(account.id);
  finish(response({ day })); await syncing;
  expect(await (await localStore()).values(account.id, "")).toEqual([]);
  expect(await (await localStore()).changes(account.id)).toEqual([]);
});
test("a cache publication failure after commit still reports a successful durable save", async () => {
  const update = jest.spyOn(client, "setQueryData").mockImplementation(() => { throw new Error("Rendering cache failed"); });
  const saved = await offline.save(body, undefined, { resort: day.resort, skis: [], tags: [], photos: [] });
  expect(saved.sync_state).toBe("pending");
  expect(await (await localStore()).changes(account.id)).toHaveLength(1);
  update.mockRestore();
});
test("a delayed conflict response cannot recreate a purged account", async () => {
  await offline.days(0, async () => [day]); await offline.save(body, day.id);
  let finish!: (value: Response) => void;
  fetchMock.mockResolvedValueOnce(response({ error: "Conflict" }, 409)).mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
  const syncing = offline.sync(); while (!finish) await Promise.resolve();
  offline.detach(); await (await localStore()).purge(account.id);
  finish(response({ ...day, notes: "Private server edit" })); await syncing;
  expect(await (await localStore()).values(account.id, "")).toEqual([]);
});
test("a deleted server day can be recreated only after explicitly choosing the local version", async () => {
  await offline.days(0, async () => [day]); await offline.save(body, day.id);
  fetchMock.mockResolvedValueOnce(response({ error: "Day missing", code: "day_missing" }, 404)); await offline.sync();
  await offline.resolve(day.id, true);
  fetchMock.mockResolvedValueOnce(response({ day: { ...day, id: "new_server_day" } })); await offline.sync();
  expect(JSON.parse(fetchMock.mock.calls[1][1].body).day_id).toBeUndefined();
});
test("offline stats never reuse a different season cutoff", async () => {
  await offline.stats(0, async () => ({ name: "September season" }));
  await offline.rememberAccount({ ...account, season_start_day: "10-01" });
  offline.setOnline(false);
  await expect(offline.stats(0, async () => { throw new Error("Offline"); })).rejects.toThrow("not been saved");
});
test("a restored account includes older seasons found in its durable journal", async () => {
  await (await localStore()).put(account.id, "day:older", { ...day, id: "older", date: "2025-10-25" });
  offline.detach();
  const restored = await offline.activate(account.id, client);
  expect(restored?.available_seasons).toContain(-1);
});
test("editing a rejected entry keeps its recovery actions visible until it is explicitly retried", async () => {
  const saved = await offline.save(body, undefined, { resort: day.resort, skis: [], tags: [], photos: [] });
  fetchMock.mockResolvedValueOnce(response({ error: "Too many entries for this date" }, 422)); await offline.sync();
  const edited = await offline.save({ ...body, date: "2026-10-24" }, saved.id);
  expect(edited.sync_state).toBe("failed");
  expect(client.getQueryData(["day", saved.id, account.id])).toMatchObject({ sync_state: "failed", date: "2026-10-24" });
  await offline.resolve(saved.id, true);
  fetchMock.mockResolvedValueOnce(response({ day: { ...day, date: "2026-10-24" } })); await offline.sync();
  expect(await (await localStore()).changes(account.id)).toEqual([]);
});
test("deleting a rejected new entry clears its blocked changes without leaving invisible work", async () => {
  const saved = await offline.save(body, undefined, { resort: day.resort, skis: [], tags: [], photos: [] });
  fetchMock.mockResolvedValueOnce(response({ error: "Too many entries for this date" }, 422)); await offline.sync();
  await offline.remove(saved.id); await offline.sync();
  expect(await (await localStore()).changes(account.id)).toEqual([]);
  expect(await (await localStore()).get(account.id, "day:" + saved.id)).toBeUndefined();
  expect(client.getQueryData(["days", 0, account.id])).toEqual([]);
});
