import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import path from "path";
import fs from "fs";
import * as schema from "./schema";

export type Db = BetterSQLite3Database<typeof schema>;

const DATA_DIR = path.resolve(process.cwd(), process.env.DATA_DIR ?? "./data");
const DB_PATH = path.join(DATA_DIR, "app.db");
const MIGRATIONS_DIR = path.resolve(process.cwd(), "drizzle");

// Survive Next dev hot-reload: keep the handle on globalThis.
const g = globalThis as unknown as { __utDb?: Db; __utSqlite?: Database.Database };

function createDb(): Db {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const sqlite = new Database(DB_PATH);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: MIGRATIONS_DIR });
  g.__utSqlite = sqlite;
  return db;
}

export function getDb(): Db {
  if (!g.__utDb) g.__utDb = createDb();
  return g.__utDb;
}

/** Close + delete the db file (test/rebuild helper). */
export function resetDb(): void {
  g.__utSqlite?.close();
  g.__utDb = undefined;
  g.__utSqlite = undefined;
  for (const suffix of ["", "-wal", "-shm"]) {
    const p = DB_PATH + suffix;
    if (fs.existsSync(p)) fs.rmSync(p);
  }
}
