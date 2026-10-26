import { openDatabaseAsync } from "expo-sqlite";
import { randomUUID } from "expo-crypto";
import { File } from "expo-file-system";
import type { QueryClient } from "@tanstack/react-query";
import { ApiClient, ApiError, api } from "./api";
import type { Account, Day, DayEntry, DayInput, Photo, Resort, Tag } from "./types";
import { dateString } from "./dates";
import { seasonDateRange } from "./seasons";
import { OfflineStore, type Change, type ServerDay } from "./offline-store";
import { isLocalPhoto, purgeLocalPhotos, relativePhotoUri, resolvePhotoUri } from "./offline-photos";
import { seasonForDate } from "./day-form";

let database: Promise<OfflineStore> | undefined;
export const localStore = () => database ||= openDatabaseAsync("shredday-journal.db").then(async (db) => {
  const store = new OfflineStore(db); await store.initialize(); return store;
});
type Active = { owner: string; token: string; client: QueryClient };
let active: Active | undefined;
let online = true;
let running: Promise<void> | undefined;
let wake: (() => void) | undefined;
const listeners = new Set<() => void>();
let summary = { pending: 0, failed: 0, syncing: false, offline: false };
const emit = () => { listeners.forEach((listener) => listener()); };
const rangeFor = (season: number, account?: Account) => {
  const range = seasonDateRange(season, account?.season_start_day || "09-01");
  return { start: dateString(range.start), end: dateString(range.end) };
};
const entry = (day: Day): DayEntry => ({ ...day, resort_name: day.resort.name,
  ski_names: day.skis.map((ski) => ski.name), tag_names: day.tags.map((tag) => tag.name) });
const stillActive = (context: Active) => active === context && api.token === context.token;
async function accountWithLocalSeasons(account: Account, previousStart?: string): Promise<Account> {
  const store = await localStore();
  const currentStart = rangeFor(0, account).start;
  const shift = previousStart ? Number(previousStart.slice(0, 4)) - Number(currentStart.slice(0, 4)) : 0;
  const local = (await store.values<Day>(account.id, "day:")).map((row) => seasonForDate(row.value.date, account.season_start_day));
  return { ...account, available_seasons: [...new Set([...account.available_seasons.map((season) => season + shift), ...local])].sort((a, b) => b - a) };
}
async function displayDay(owner: string, day: Day): Promise<Day> {
  const store = await localStore();
  const photos = await Promise.all(day.photos.map(async (photo) => {
    const local = await store.get<string>(owner, "image:" + photo.id);
    return local ? { ...photo, preview_url: resolvePhotoUri(local), full_url: resolvePhotoUri(local) }
      : { ...photo, preview_url: photo.preview_url ? resolvePhotoUri(photo.preview_url) : null,
        full_url: photo.full_url ? resolvePhotoUri(photo.full_url) : null };
  }));
  return { ...day, photos };
}
async function localDays(context: Active, season: number) {
  const store = await localStore();
  const account = await store.get<Account>(context.owner, "account");
  const { start, end } = rangeFor(season, account);
  const deleted = new Set((await store.changes(context.owner)).filter((change) => change.kind === "delete" && !change.error).map((change) => change.localId));
  const days = (await store.values<Day>(context.owner, "day:"))
    .filter((row) => !deleted.has(row.key.slice(4)) && row.value.date >= start && row.value.date <= end).map((row) => row.value);
  const sorted = days.sort((a, b) => a.date.localeCompare(b.date) || (a.created_at || "").localeCompare(b.created_at || "") || a.id.localeCompare(b.id));
  return Promise.all(sorted.map(async (day, index) => entry({ ...await displayDay(context.owner, day), day_number: index + 1 }))).then((days) => days.reverse());
}
async function publish(context: Active) {
  const store = await localStore();
  const revision = await store.revision(context.owner);
  const changes = await store.changes(context.owner);
  const rows = await store.values<Day>(context.owner, "day:");
  if (!stillActive(context)) return;
  const updates: { key: (string | number)[]; value: unknown }[] = [];
  for (const row of rows) {
    const day = await displayDay(context.owner, row.value);
    updates.push({ key: ["day", row.key.slice(4), context.owner], value: day }, { key: ["day", day.id, context.owner], value: day });
  }
  const queries = context.client.getQueryCache().findAll({ queryKey: ["days"] });
  const seasons = new Set([0, ...queries.filter((query) => query.queryKey[2] === context.owner).map((query) => Number(query.queryKey[1]))]);
  for (const season of seasons) {
    const days = await localDays(context, season);
    const account = await store.get<Account>(context.owner, "account");
    const { start, end } = rangeFor(season, account);
    const loaded = await store.get(context.owner, "season:" + start + ":" + end);
    if (loaded || days.length || queries.some((query) => query.queryKey[1] === season && query.queryKey[2] === context.owner)) {
      updates.push({ key: ["days", season, context.owner], value: days });
    }
  }
  if (stillActive(context)) {
    if (await store.revision(context.owner) !== revision) return publish(context);
    for (const update of updates) context.client.setQueryData(update.key, update.value);
    summary = { ...summary, pending: changes.length, failed: new Set(changes.filter((change) => change.error).map((change) => change.localId)).size };
    emit();
  }
}
export const offline = {
  subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
  status: () => summary,
  setWake(callback?: () => void) { wake = callback; },
  setOnline(value: boolean) { online = value; summary = { ...summary, offline: !value }; emit(); if (value) wake?.(); },
  detach() { active = undefined; summary = { pending: 0, failed: 0, syncing: false, offline: !online }; emit(); },
  async activate(owner: string, client: QueryClient) {
    const context = { owner, token: api.token!, client };
    active = context;
    const store = await localStore();
    const saved = await store.get<Account>(owner, "account");
    const account = saved ? await accountWithLocalSeasons(saved, await store.get<string>(owner, "account-season")) : undefined;
    for (const key of ["skis", "tags", "recent-resorts"]) {
      const value = await store.get(owner, key);
      if (stillActive(context) && value) client.setQueryData([key, owner], value, { updatedAt: 0 });
    }
    for (const season of new Set([0, ...(account?.available_seasons || [])])) {
      const { start, end } = rangeFor(season, account);
      const stats = await store.get(owner, "stats:" + start + ":" + end);
      if (stillActive(context) && stats) client.setQueryData(["stats", season, owner], stats, { updatedAt: 0 });
    }
    await publish(context);
    return stillActive(context) ? account : undefined;
  },
  async rememberAccount(account: Account) {
    const context = active;
    if (context?.owner !== account.id) return account;
    const store = await localStore();
    const next = await accountWithLocalSeasons(account);
    await store.guardedPut(account.id, "account", next, () => stillActive(context));
    await store.guardedPut(account.id, "account-season", rangeFor(0, account).start, () => stillActive(context));
    return next;
  },
  async stats<T>(season: number, fetch: () => Promise<T>) {
    const context = active; if (!context) return fetch();
    const account = await (await localStore()).get<Account>(context.owner, "account");
    const { start, end } = rangeFor(season, account);
    return offline.cached("stats:" + start + ":" + end, fetch);
  },
  async cached<T>(key: string, fetch: () => Promise<T>): Promise<T> {
    const context = active;
    if (!context) return fetch();
    const store = await localStore();
    const cached = await store.get<T>(context.owner, key);
    if (!online && cached !== undefined) return cached;
    if (!online) throw new Error("This has not been saved on this device yet. Connect to load it.");
    try {
      const result = await fetch();
      if (!stillActive(context)) throw new Error("Your sign-in changed.");
      await store.guardedPut(context.owner, key, result, () => stillActive(context));
      return result;
    } catch (error) {
      if (stillActive(context) && cached !== undefined && !(error instanceof ApiError && error.status < 500 && error.status !== 429)) return cached;
      throw error;
    }
  },
  async resorts(query: string, fetch: () => Promise<Resort[]>) {
    try { return await offline.cached("resorts:" + query, fetch); }
    catch (error) {
      const context = active;
      if (!context || error instanceof ApiError && error.status === 401) throw error;
      const store = await localStore();
      const known = [...(await store.values<Resort[]>(context.owner, "resorts:")).flatMap((row) => row.value),
        ...await store.get<Resort[]>(context.owner, "recent-resorts") || [],
        ...(await store.values<Day>(context.owner, "day:")).map((row) => row.value.resort)];
      const results = [...new Map(known.map((resort) => [resort.id, resort])).values()]
        .filter((resort) => resort.name.toLocaleLowerCase().includes(query.toLocaleLowerCase()));
      if (results.length) return results;
      throw error;
    }
  },
  async days(season: number, fetch: () => Promise<Day[]>) {
    const context = active;
    if (!context) return (await fetch()).map(entry);
    const store = await localStore();
    if (online) {
      try {
        const revision = await store.revision(context.owner);
        const days = await fetch();
        if (!stillActive(context)) throw new Error("Your sign-in changed.");
        const account = await store.get<Account>(context.owner, "account");
        const { start, end } = rangeFor(season, account);
        await store.snapshot(context.owner, days, start, end, revision, () => stillActive(context));
        await publish(context);
      } catch (error) {
        const account = await store.get<Account>(context.owner, "account");
        const { start, end } = rangeFor(season, account);
        if (!stillActive(context) || error instanceof ApiError && error.status === 401 ||
          !await store.get(context.owner, "season:" + start + ":" + end) && !(await localDays(context, season)).length) throw error;
      }
    }
    return localDays(context, season);
  },
  async day(id: string, fetch: (id: string) => Promise<Day>) {
    const context = active;
    if (!context) return fetch(id);
    const store = await localStore();
    const row = (await store.values<Day>(context.owner, "day:")).find((row) => row.key === "day:" + id || row.value.id === id);
    if (row?.value.sync_state || !online && row) return displayDay(context.owner, row.value);
    if (!online) throw new Error("Open this day while connected to save it on this device.");
    const localId = row?.key.slice(4) || id;
    const revision = await store.revision(context.owner);
    try {
      const value = await fetch(row?.value.id || id);
      if (!stillActive(context)) throw new Error("Your sign-in changed.");
      await store.refreshDay(context.owner, localId, value, revision, () => stillActive(context));
      return displayDay(context.owner, await store.get<Day>(context.owner, "day:" + localId) || value);
    } catch (error) {
      if (stillActive(context) && row && !(error instanceof ApiError && error.status < 500 && error.status !== 429)) return displayDay(context.owner, row.value);
      throw error;
    }
  },
  async save(body: DayInput, id?: string, details?: { resort: Resort; skis: Tag[]; tags: Tag[]; photos: Photo[] }) {
    const context = active;
    if (!context) throw new Error("Your local journal is not ready. Please reopen Shred.Day.");
    const store = await localStore();
    const rows = await store.values<Day>(context.owner, "day:");
    const row = id ? rows.find((row) => row.key === "day:" + id || row.value.id === id) : undefined;
    if (id && !row) throw new Error("Open this day while connected before editing it offline.");
    const localId = row?.key.slice(4) || "local_" + randomUUID();
    const resort = details?.resort || row?.value.resort;
    if (!resort) throw new Error("Choose a resort.");
    const day: Day = { ...row?.value, created_at: row?.value.created_at || new Date().toISOString(), id: row?.value.id || localId, date: body.date, notes: body.notes, resort,
      skis: details?.skis || row?.value.skis || [], tags: details?.tags || row?.value.tags || [],
      photos: details?.photos || row?.value.photos.filter((photo) => body.photo_ids.includes(photo.id)) || [],
      shared_at: row?.value.shared_at || null, day_number: row?.value.day_number || 0, sync_state: "pending", sync_error: undefined };
    const change: Change = { operationId: randomUUID(), localId, kind: "save", body,
      photos: day.photos.filter((photo) => isLocalPhoto(photo.id) && photo.full_url).map((photo) => ({ id: photo.id, uri: relativePhotoUri(photo.full_url!) })) };
    if (!stillActive(context)) throw new Error("Your sign-in changed.");
    const saved = await store.enqueue(context.owner, day, change, () => stillActive(context));
    try {
      const account = await store.get<Account>(context.owner, "account");
      if (account) {
        const season = seasonForDate(day.date, account.season_start_day);
        await store.guardedPut(context.owner, "account", { ...account, available_seasons: [...new Set([...account.available_seasons, season])] }, () => stillActive(context));
      }
      await publish(context);
    } catch { /* The durable day and outbox already committed; refresh can recover. */ }
    wake?.();
    return saved;
  },
  async remove(id: string) {
    const context = active;
    if (!context) throw new Error("Your local journal is not ready.");
    const store = await localStore();
    const row = (await store.values<Day>(context.owner, "day:")).find((row) => row.key === "day:" + id || row.value.id === id);
    if (!row) throw new Error("Open this day before deleting it offline.");
    await store.enqueue(context.owner, { ...row.value, sync_state: "pending" }, { operationId: randomUUID(), localId: row.key.slice(4), kind: "delete",
      body: { date: row.value.date, resort_id: row.value.resort.id, ski_ids: [], tag_ids: [], photo_ids: [], notes: row.value.notes }, photos: [] }, () => stillActive(context));
    await publish(context).catch(() => {}); wake?.();
  },
  async resolve(id: string, keepLocal: boolean) {
    const context = active; if (!context) return;
    const store = await localStore();
    const rows = await store.values<Day>(context.owner, "day:");
    const localId = rows.find((row) => row.key === "day:" + id || row.value.id === id)?.key.slice(4) || id;
    const changes = (await store.changes(context.owner)).filter((change) => change.localId === localId);
    const latest = changes.at(-1); if (!latest) return;
    let conflict = await store.get<Day>(context.owner, "conflict:" + localId);
    if (!keepLocal && !conflict) {
      const server = await store.get<ServerDay>(context.owner, "server:" + localId);
      if (server) conflict = await api.request<Day>("/api/v1/days/" + server.id).catch((error) => {
        if (error instanceof ApiError && error.status === 404) return undefined;
        throw error;
      });
    }
    await store.resolve(context.owner, localId, conflict, keepLocal ? { ...latest, operationId: randomUUID(), error: undefined, errorCode: undefined } : undefined,
      () => stillActive(context), latest.errorCode === "day_missing");
    await publish(context); wake?.();
  },
  async purge(owner: string) { if (active?.owner === owner) offline.detach(); await (await localStore()).purge(owner); purgeLocalPhotos(owner); },
  sync() {
    if (running) return running;
    const context = active;
    if (!context || !online) return Promise.resolve();
    running = syncChanges(context).finally(() => { running = undefined; summary = { ...summary, syncing: false }; emit(); });
    return running;
  },
};

async function syncChanges(context: Active) {
  summary = { ...summary, syncing: true }; emit();
  const store = await localStore();
  const client = new ApiClient(api.baseUrl); client.token = context.token;
  client.onUnauthorized = (code) => { if (stillActive(context)) api.onUnauthorized?.(code); };
  const blocked = new Set<string>();
  for (const change of await store.changes(context.owner)) {
    if (!stillActive(context) || !online) break;
    if (change.error || blocked.has(change.localId)) { blocked.add(change.localId); continue; }
    try {
      let request = await store.get<Record<string, unknown>>(context.owner, "request:" + change.operationId);
      if (!request) {
        const photoIds: string[] = [];
        for (const id of change.body.photo_ids) {
          if (!isLocalPhoto(id)) { photoIds.push(id); continue; }
          const local = change.photos.find((photo) => photo.id === id);
          let photo = await store.get<Photo>(context.owner, "photo:" + id);
          if (!photo) {
            if (!local) throw new ApiError("A local photo is missing. Edit this day to remove it.", 422);
            const form = new FormData(); form.append("file", new File(resolvePhotoUri(local.uri))); form.append("upload_id", id);
            photo = await client.request<Photo>("/api/v1/photos", { method: "POST", body: form });
            if (!stillActive(context)) return;
            await store.guardedPut(context.owner, "photo:" + id, photo, () => stillActive(context));
          }
          if (local) await store.guardedPut(context.owner, "image:" + photo.id, relativePhotoUri(local.uri), () => stillActive(context));
          photoIds.push(photo.id);
        }
        const server = await store.get<ServerDay>(context.owner, "server:" + change.localId);
        if (change.kind === "delete" && !server) {
          await store.acknowledge(context.owner, change, null, () => stillActive(context)); await publish(context); continue;
        }
        request = { operation_id: change.operationId, action_type: change.kind, day_id: server?.id,
          version: server?.version, day: { ...change.body, photo_ids: photoIds } };
        await store.guardedPut(context.owner, "request:" + change.operationId, request, () => stillActive(context));
      }
      if (!stillActive(context)) break;
      const result = await client.request<{ day: Day | null }>("/api/v1/mobile/day_changes", { method: "POST", body: request });
      await store.acknowledge(context.owner, change, result.day, () => stillActive(context));
    } catch (error) {
      if (!stillActive(context)) return;
      if (error instanceof ApiError && [404, 409, 422].includes(error.status)) {
        let conflict: Day | undefined;
        const server = await store.get<ServerDay>(context.owner, "server:" + change.localId);
        if (error.status === 409 && server) conflict = await client.request<Day>("/api/v1/days/" + server.id).catch(() => undefined);
        await store.fail(context.owner, { ...change, errorCode: error.code }, error.status === 409 ? "Changed on another device. Choose which version to keep." : error.message,
          conflict, () => stillActive(context));
        blocked.add(change.localId);
      } else { await publish(context); throw error; }
    }
    await publish(context);
  }
}
