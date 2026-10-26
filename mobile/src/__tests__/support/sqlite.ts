import { DatabaseSync } from "node:sqlite";
import type { SQLiteDatabase } from "expo-sqlite";

export function testDatabase() {
  const native = new DatabaseSync(":memory:");
  const db = {
    execAsync: async (sql: string) => { native.exec(sql); },
    runAsync: async (sql: string, ...params: (string | number | null)[]) => {
      const result = native.prepare(sql).run(...params);
      return { changes: Number(result.changes), lastInsertRowId: Number(result.lastInsertRowid) };
    },
    getFirstAsync: async (sql: string, ...params: (string | number | null)[]) => native.prepare(sql).get(...params) || null,
    getAllAsync: async (sql: string, ...params: (string | number | null)[]) => native.prepare(sql).all(...params),
    withExclusiveTransactionAsync: async (action: (db: SQLiteDatabase) => Promise<void>) => {
      native.exec("BEGIN");
      try { await action(db as unknown as SQLiteDatabase); native.exec("COMMIT"); }
      catch (error) { native.exec("ROLLBACK"); throw error; }
    },
  };
  return { native, db: db as unknown as SQLiteDatabase };
}
