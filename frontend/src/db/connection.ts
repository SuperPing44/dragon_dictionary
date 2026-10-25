import { mkdirSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
import {
  type BetterSQLite3Database,
  drizzle,
} from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import * as schema from "./schema";

export type Db = BetterSQLite3Database<typeof schema> & {
  $client: Database.Database;
};

const MIGRATIONS_DIR = path.join(process.cwd(), "drizzle");

/** The data folder: `DATA_DIR`, or `%USERPROFILE%\DragonDictionary`. */
export function resolveDataDir(
  env: Record<string, string | undefined> = process.env,
): string {
  return env.DATA_DIR || path.join(homedir(), "DragonDictionary");
}

/** Opens a database file (or `:memory:`) and applies pending migrations. */
export function openDb(file: string): Db {
  const sqlite = new Database(file);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: MIGRATIONS_DIR });
  return db;
}

let instance: Db | undefined;

/** The app's database, opened and migrated on first use. */
export function getDb(): Db {
  if (!instance) {
    const dataDir = resolveDataDir();
    mkdirSync(path.join(dataDir, "files"), { recursive: true });
    instance = openDb(path.join(dataDir, "app.db"));
  }
  return instance;
}
