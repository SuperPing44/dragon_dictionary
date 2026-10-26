import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
import {
  type BetterSQLite3Database,
  drizzle,
} from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import {
  backUp,
  isBackupDue,
  recordBackup,
  resolveBackupDir,
  writeBackup,
} from "./backup";
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

/** Opens a database file (or `:memory:`) without migrating it. */
export function connect(file: string): Db {
  const sqlite = new Database(file);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  return drizzle(sqlite, { schema });
}

/** How many migrations in the repo this database hasn't had yet. */
export function pendingMigrations(db: Db): number {
  const journal = JSON.parse(
    readFileSync(path.join(MIGRATIONS_DIR, "meta", "_journal.json"), "utf8"),
  ) as { entries: unknown[] };
  const hasTable = db.$client
    .prepare(
      "select 1 from sqlite_master where type = 'table' and name = '__drizzle_migrations'",
    )
    .get();
  const applied = hasTable
    ? (
        db.$client
          .prepare("select count(*) as n from __drizzle_migrations")
          .get() as { n: number }
      ).n
    : 0;
  return Math.max(journal.entries.length - applied, 0);
}

export function migrateDb(db: Db): void {
  migrate(db, { migrationsFolder: MIGRATIONS_DIR });
}

/** Opens a database file (or `:memory:`) and applies pending migrations. */
export function openDb(file: string): Db {
  const db = connect(file);
  migrateDb(db);
  return db;
}

/** Where uploaded PDFs live: <data folder>/files. */
export function resolveFilesRoot(): string {
  return path.join(resolveDataDir(), "files");
}

let instance: Db | undefined;

/**
 * Opens the app's database at server start. A database with pending
 * migrations is backed up first; then, if the last backup is over a day
 * old, it is backed up again. A failed backup never stops the app: its
 * error is recorded and shown in the sidebar.
 */
export async function initDb({
  dataDir = resolveDataDir(),
  backupDir = resolveBackupDir(),
  now = new Date(),
}: {
  dataDir?: string;
  backupDir?: string;
  now?: Date;
} = {}): Promise<Db> {
  mkdirSync(path.join(dataDir, "files"), { recursive: true });
  const file = path.join(dataDir, "app.db");
  const existed = existsSync(file);
  const db = connect(file);
  const options = { dataDir, backupDir, now };
  const beforeMigration =
    existed && pendingMigrations(db) > 0
      ? await writeBackup(db, options)
      : undefined;
  migrateDb(db);
  // Recorded after migrating: an older database may not have app_meta yet.
  if (beforeMigration) recordBackup(db, beforeMigration);
  if (isBackupDue(db, now)) await backUp(db, options);
  instance = db;
  return db;
}

/** The app's database, opened and migrated on first use. */
export function getDb(): Db {
  if (!instance) {
    const dataDir = resolveDataDir();
    mkdirSync(path.join(dataDir, "files"), { recursive: true });
    instance = openDb(path.join(dataDir, "app.db"));
  }
  return instance;
}
