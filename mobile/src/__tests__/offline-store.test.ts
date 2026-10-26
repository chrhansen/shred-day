import { OfflineStore, type Change } from "../lib/offline-store";
import type { Day } from "../lib/types";
import { testDatabase } from "./support/sqlite";

const day: Day = { id: "day_1", date: "2026-10-25", notes: "Powder", updated_at: "2026-10-25T10:00:00.000001Z",
  resort: { id: "res_1", name: "Sölden", country: "Austria", latitude: null, longitude: null },
  day_number: 1, skis: [], tags: [], photos: [], shared_at: null };
const change: Change = { operationId: "operation-1", localId: day.id, kind: "save", photos: [],
  body: { date: day.date, resort_id: day.resort.id, notes: day.notes, ski_ids: [], tag_ids: [], photo_ids: [] } };
let database: ReturnType<typeof testDatabase>, store: OfflineStore;
beforeEach(async () => { database = testDatabase(); store = new OfflineStore(database.db); await store.initialize(); });
afterEach(() => database.native.close());

test("a saved day and its upload survive rebuilding the store after app termination", async () => {
  await store.enqueue("usr_1", { ...day, sync_state: "pending" }, change);
  const reopened = new OfflineStore(database.db);
  expect(await reopened.get("usr_1", "day:" + day.id)).toMatchObject({ notes: "Powder", sync_state: "pending" });
  expect(await reopened.changes("usr_1")).toEqual([change]);
});
test("an interrupted save rolls back the day together with its upload", async () => {
  await store.enqueue("usr_1", day, change);
  await expect(store.enqueue("usr_1", { ...day, notes: "Unsaved" }, change)).rejects.toThrow();
  expect(await store.get("usr_1", "day:" + day.id)).toMatchObject({ notes: "Powder" });
  expect(await store.changes("usr_1")).toHaveLength(1);
});
test("refreshing a season preserves pending local work and removes server deletions", async () => {
  await store.snapshot("usr_1", [day, { ...day, id: "day_removed" }], "2026-09-01", "2027-08-31");
  await store.enqueue("usr_1", { ...day, notes: "Offline edit", sync_state: "pending" }, change);
  await store.snapshot("usr_1", [{ ...day, notes: "Server edit" }], "2026-09-01", "2027-08-31");
  expect(await store.get("usr_1", "day:" + day.id)).toMatchObject({ notes: "Offline edit" });
  expect(await store.get("usr_1", "day:day_removed")).toBeUndefined();
});
test("a response to an older upload cannot overwrite an edit saved during that request", async () => {
  await store.enqueue("usr_1", day, change);
  await store.enqueue("usr_1", { ...day, notes: "Newer local edit", sync_state: "pending" }, { ...change, operationId: "operation-2" });
  await store.acknowledge("usr_1", change, { ...day, updated_at: "new-version" });
  expect(await store.get("usr_1", "day:" + day.id)).toMatchObject({ notes: "Newer local edit", sync_state: "pending" });
  expect(await store.get("usr_1", "server:" + day.id)).toEqual({ id: day.id, version: "new-version" });
  expect(await store.changes("usr_1")).toHaveLength(1);
});
test("account switching and deletion never mix journals or erase another account", async () => {
  await store.enqueue("usr_1", day, change);
  expect(await store.values("usr_2", "day:")).toEqual([]);
  expect(await store.changes("usr_2")).toEqual([]);
  await store.put("usr_2", "account", { id: "usr_2" });
  await store.purge("usr_1");
  expect(await store.changes("usr_1")).toEqual([]);
  expect(await store.values("usr_1", "")).toEqual([]);
  expect(await store.get("usr_2", "account")).toEqual({ id: "usr_2" });
});
test("failed changes retain the local version and can be replaced after explicit resolution", async () => {
  await store.enqueue("usr_1", day, change);
  const server = { ...day, notes: "Other device", updated_at: "new-version" };
  await store.fail("usr_1", change, "Conflict", server);
  expect(await store.get("usr_1", "day:" + day.id)).toMatchObject({ notes: "Powder", sync_state: "failed" });
  await store.resolve("usr_1", day.id, server, { ...change, operationId: "replacement" });
  expect(await store.changes("usr_1")).toEqual([{ ...change, operationId: "replacement" }]);
  expect(await store.get("usr_1", "server:" + day.id)).toEqual({ id: day.id, version: "new-version" });
});
test("accepting the server version clears the failed queue atomically", async () => {
  await store.enqueue("usr_1", day, change);
  const server = { ...day, notes: "Other device" };
  await store.resolve("usr_1", day.id, server);
  expect(await store.changes("usr_1")).toEqual([]);
  expect(await store.get("usr_1", "day:" + day.id)).toMatchObject({ notes: "Other device" });
});
test("concurrent saves and cache writes serialize through the same database", async () => {
  const otherStore = new OfflineStore(database.db);
  await Promise.all([
    store.enqueue("usr_1", day, change),
    otherStore.enqueue("usr_1", { ...day, id: "day_2" }, { ...change, localId: "day_2", operationId: "second-operation" }),
    store.put("usr_1", "skis", []),
  ]);
  expect(await store.changes("usr_1")).toHaveLength(2);
  expect(await store.get("usr_1", "skis")).toEqual([]);
});
