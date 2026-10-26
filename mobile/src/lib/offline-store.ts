import type { SQLiteDatabase } from "expo-sqlite";
import type { Day, DayInput } from "./types";

export type LocalPhoto = { id: string; uri: string };
export type Change = {
  operationId: string; localId: string; kind: "save" | "delete";
  body: DayInput; photos: LocalPhoto[]; error?: string; errorCode?: string;
};
export type ServerDay = { id: string; version?: string };

const writes = new WeakMap<SQLiteDatabase, Promise<void>>();
export class OfflineStore {
  constructor(private db: SQLiteDatabase, private insideTransaction = false) {}
  private write<T>(action: () => Promise<T>): Promise<T> {
    if (this.insideTransaction) return action();
    const operation = (writes.get(this.db) || Promise.resolve()).then(action);
    writes.set(this.db, operation.then(() => {}, () => {}));
    return operation;
  }
  private transaction(action: (db: SQLiteDatabase) => Promise<void>) {
    return this.write(() => this.db.withExclusiveTransactionAsync(action));
  }
  async initialize() {
    await this.db.execAsync(`
      PRAGMA journal_mode = WAL;
      PRAGMA busy_timeout = 5000;
      CREATE TABLE IF NOT EXISTS local_values (
        owner TEXT NOT NULL, key TEXT NOT NULL, value TEXT NOT NULL, PRIMARY KEY (owner, key)
      );
      CREATE TABLE IF NOT EXISTS pending_changes (
        sequence INTEGER PRIMARY KEY AUTOINCREMENT, owner TEXT NOT NULL,
        operation_id TEXT NOT NULL UNIQUE, local_id TEXT NOT NULL, value TEXT NOT NULL
      );
      PRAGMA user_version = 1;
    `);
  }
  async get<T>(owner: string, key: string): Promise<T | undefined> {
    const row = await this.db.getFirstAsync<{ value: string }>(
      "SELECT value FROM local_values WHERE owner = ? AND key = ?", owner, key);
    return row ? JSON.parse(row.value) : undefined;
  }
  async put(owner: string, key: string, value: unknown) {
    await this.write(() => this.db.runAsync("INSERT OR REPLACE INTO local_values (owner, key, value) VALUES (?, ?, ?)", owner, key, JSON.stringify(value)));
  }
  async guardedPut(owner: string, key: string, value: unknown, allowed: () => boolean) {
    await this.transaction(async (tx) => {
      if (allowed()) await new OfflineStore(tx, true).put(owner, key, value);
    });
  }
  async revision(owner: string) { return await this.get<number>(owner, "revision") || 0; }
  private async changed(owner: string) { await this.put(owner, "revision", await this.revision(owner) + 1); }
  async values<T>(owner: string, prefix: string): Promise<{ key: string; value: T }[]> {
    const rows = await this.db.getAllAsync<{ key: string; value: string }>(
      "SELECT key, value FROM local_values WHERE owner = ? AND key LIKE ?", owner, prefix + "%");
    return rows.map((row) => ({ key: row.key, value: JSON.parse(row.value) }));
  }
  async changes(owner: string): Promise<Change[]> {
    const rows = await this.db.getAllAsync<{ value: string }>(
      "SELECT value FROM pending_changes WHERE owner = ? ORDER BY sequence", owner);
    return rows.map((row) => JSON.parse(row.value));
  }
  async enqueue(owner: string, day: Day, change: Change, allowed = () => true) {
    await this.transaction(async (tx) => {
      if (!allowed()) throw new Error("Your sign-in changed.");
      const store = new OfflineStore(tx, true);
      await store.put(owner, "day:" + change.localId, day);
      await tx.runAsync("INSERT INTO pending_changes (owner, operation_id, local_id, value) VALUES (?, ?, ?, ?)",
        owner, change.operationId, change.localId, JSON.stringify(change));
      await store.changed(owner);
    });
  }
  async fail(owner: string, change: Change, message: string, conflict?: Day, allowed = () => true) {
    await this.transaction(async (tx) => {
      if (!allowed()) return;
      const store = new OfflineStore(tx, true);
      await tx.runAsync("UPDATE pending_changes SET value = ? WHERE owner = ? AND operation_id = ?",
        JSON.stringify({ ...change, error: message }), owner, change.operationId);
      const day = await store.get<Day>(owner, "day:" + change.localId);
      if (day) await store.put(owner, "day:" + change.localId, { ...day, sync_state: "failed", sync_error: message });
      if (conflict) await store.put(owner, "conflict:" + change.localId, conflict);
      await store.changed(owner);
    });
  }
  async acknowledge(owner: string, change: Change, day: Day | null, allowed = () => true) {
    await this.transaction(async (tx) => {
      if (!allowed()) return;
      const store = new OfflineStore(tx, true);
      await tx.runAsync("DELETE FROM pending_changes WHERE owner = ? AND operation_id = ?", owner, change.operationId);
      const remaining = (await store.changes(owner)).some((next) => next.localId === change.localId);
      if (day) {
        await store.put(owner, "server:" + change.localId, { id: day.id, version: day.updated_at });
        if (!remaining) await store.put(owner, "day:" + change.localId, day);
      } else if (!remaining) {
        await tx.runAsync("DELETE FROM local_values WHERE owner = ? AND key = ?", owner, "day:" + change.localId);
      }
      await tx.runAsync("DELETE FROM local_values WHERE owner = ? AND key = ?", owner, "request:" + change.operationId);
      await store.changed(owner);
    });
  }
  async snapshot(owner: string, days: Day[], start: string, end: string, expectedRevision?: number, allowed = () => true) {
    await this.transaction(async (tx) => {
      if (!allowed()) return;
      const store = new OfflineStore(tx, true);
      if (expectedRevision !== undefined && await store.revision(owner) !== expectedRevision) return;
      const pending = new Set((await store.changes(owner)).map((change) => change.localId));
      const existing = await store.values<Day>(owner, "day:");
      const serverIds = new Set(days.map((day) => day.id));
      for (const row of existing) {
        const localId = row.key.slice(4);
        const server = await store.get<ServerDay>(owner, "server:" + localId);
        if (pending.has(localId)) { serverIds.delete(server?.id || localId); continue; }
        const fresh = days.find((day) => day.id === (server?.id || localId));
        if (fresh) {
          await store.put(owner, row.key, fresh);
          await store.put(owner, "server:" + localId, { id: fresh.id, version: fresh.updated_at });
          serverIds.delete(fresh.id);
        } else if (row.value.date >= start && row.value.date <= end) {
          await tx.runAsync("DELETE FROM local_values WHERE owner = ? AND key = ?", owner, row.key);
        }
      }
      for (const day of days.filter((day) => serverIds.has(day.id))) {
        await store.put(owner, "day:" + day.id, day);
        await store.put(owner, "server:" + day.id, { id: day.id, version: day.updated_at });
      }
      await store.put(owner, "season:" + start + ":" + end, true);
      await store.changed(owner);
    });
  }
  async resolve(owner: string, localId: string, server: Day | undefined, replacement?: Change, allowed = () => true, forgetServer = false) {
    await this.transaction(async (tx) => {
      if (!allowed()) return;
      const store = new OfflineStore(tx, true);
      await tx.runAsync("DELETE FROM pending_changes WHERE owner = ? AND local_id = ?", owner, localId);
      await tx.runAsync("DELETE FROM local_values WHERE owner = ? AND key = ?", owner, "conflict:" + localId);
      if (server) await store.put(owner, "server:" + localId, { id: server.id, version: server.updated_at });
      else if (forgetServer || !replacement) await tx.runAsync("DELETE FROM local_values WHERE owner = ? AND key = ?", owner, "server:" + localId);
      const day = replacement ? await store.get<Day>(owner, "day:" + localId) : server;
      if (day) await store.put(owner, "day:" + localId, { ...day, sync_state: replacement ? "pending" : undefined, sync_error: undefined });
      else await tx.runAsync("DELETE FROM local_values WHERE owner = ? AND key = ?", owner, "day:" + localId);
      if (replacement) await tx.runAsync("INSERT INTO pending_changes (owner, operation_id, local_id, value) VALUES (?, ?, ?, ?)",
        owner, replacement.operationId, localId, JSON.stringify(replacement));
      await store.changed(owner);
    });
  }
  async refreshDay(owner: string, localId: string, day: Day, revision: number, allowed = () => true) {
    await this.transaction(async (tx) => {
      if (!allowed()) return;
      const store = new OfflineStore(tx, true);
      if (await store.revision(owner) !== revision) return;
      await store.put(owner, "day:" + localId, day);
      await store.put(owner, "server:" + localId, { id: day.id, version: day.updated_at });
      await store.changed(owner);
    });
  }
  async purge(owner: string) {
    await this.transaction(async (tx) => {
      await tx.runAsync("DELETE FROM pending_changes WHERE owner = ?", owner);
      await tx.runAsync("DELETE FROM local_values WHERE owner = ?", owner);
    });
  }
}
