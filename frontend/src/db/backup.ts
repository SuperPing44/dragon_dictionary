import { existsSync } from "node:fs";
import { cp, mkdir, readdir, rename, rm } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import type { Db } from "./connection";
import { getMeta, setMeta } from "./meta";

/** How many backups are kept; older ones are deleted automatically. */
export const BACKUPS_KEPT = 10;
/** A backup at startup only runs when the last one is older than this. */
export const BACKUP_INTERVAL_MS = 24 * 60 * 60 * 1000;

const LAST_AT = "last_backup_at";
const LAST_ERROR = "last_backup_error";
const LAST_ERROR_AT = "last_backup_error_at";

/** Backup folder names: a sortable local date and time. */
const NAME = /^\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}(-\d+)?$/;

/** Where backups go: `BACKUP_DIR`, or `OneDrive\DragonDictionary Backups`. */
export function resolveBackupDir(
  env: Record<string, string | undefined> = process.env,
): string {
  return (
    env.BACKUP_DIR ||
    path.join(homedir(), "OneDrive", "DragonDictionary Backups")
  );
}

function folderName(now: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
}

export type BackupStatus = {
  /** When the last backup succeeded (ISO), if ever. */
  lastAt: string | null;
  /** The last failure, if it happened after the last success. */
  error: { message: string; at: string } | null;
  /** Where backups are written. */
  dir: string;
};

export function backupStatus(db: Db, dir = resolveBackupDir()): BackupStatus {
  const lastAt = getMeta(db, LAST_AT) ?? null;
  const message = getMeta(db, LAST_ERROR);
  const at = getMeta(db, LAST_ERROR_AT);
  const error =
    message && at && (!lastAt || at > lastAt) ? { message, at } : null;
  return { lastAt, error, dir };
}

export type BackupResult =
  | { ok: true; folder: string; at: string }
  | { ok: false; error: string; at: string };

/**
 * Writes one backup: a dated folder with a `VACUUM INTO` copy of the
 * database and a full copy of `files/`. It is assembled under a temporary
 * name and renamed when complete, so only finished snapshots ever appear
 * in the backup folder (and never the live database file). Afterwards only
 * the newest ten are kept. Never throws: the outcome is returned.
 */
export async function writeBackup(
  db: Db,
  {
    dataDir,
    backupDir,
    now = new Date(),
  }: {
    dataDir: string;
    backupDir: string;
    now?: Date;
  },
): Promise<BackupResult> {
  const at = now.toISOString();
  let name = folderName(now);
  for (let n = 2; existsSync(path.join(backupDir, name)); n++) {
    name = `${folderName(now)}-${n}`;
  }
  const temp = path.join(backupDir, `.${name}.partial`);
  try {
    await mkdir(temp, { recursive: true });
    db.$client.prepare("VACUUM INTO ?").run(path.join(temp, "app.db"));
    const files = path.join(dataDir, "files");
    if (existsSync(files)) {
      await cp(files, path.join(temp, "files"), { recursive: true });
    } else {
      await mkdir(path.join(temp, "files"));
    }
    await rename(temp, path.join(backupDir, name));
    await pruneBackups(backupDir);
    return { ok: true, folder: path.join(backupDir, name), at };
  } catch (error) {
    await rm(temp, { recursive: true, force: true }).catch(() => {});
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
      at,
    };
  }
}

/** Deletes all but the newest ten finished backups. */
export async function pruneBackups(backupDir: string): Promise<string[]> {
  const entries = await readdir(backupDir, { withFileTypes: true });
  const backups = entries
    .filter((e) => e.isDirectory() && NAME.test(e.name))
    .map((e) => e.name)
    .sort()
    .reverse();
  const old = backups.slice(BACKUPS_KEPT);
  for (const name of old) {
    await rm(path.join(backupDir, name), { recursive: true, force: true });
  }
  return old;
}

/** Stores a backup's outcome in app_meta for the sidebar. */
export function recordBackup(db: Db, result: BackupResult): void {
  if (result.ok) {
    setMeta(db, LAST_AT, result.at);
  } else {
    setMeta(db, LAST_ERROR, result.error);
    setMeta(db, LAST_ERROR_AT, result.at);
  }
}

/** Backs up now and records the outcome. */
export async function backUp(
  db: Db,
  options: { dataDir: string; backupDir: string; now?: Date },
): Promise<BackupResult> {
  const result = await writeBackup(db, options);
  recordBackup(db, result);
  return result;
}

/** Whether the startup backup is due: never backed up, or over 24 h ago. */
export function isBackupDue(db: Db, now = new Date()): boolean {
  const lastAt = getMeta(db, LAST_AT);
  return !lastAt || now.getTime() - Date.parse(lastAt) > BACKUP_INTERVAL_MS;
}
