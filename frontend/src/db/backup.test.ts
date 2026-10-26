import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  BACKUP_INTERVAL_MS,
  BACKUPS_KEPT,
  backUp,
  backupStatus,
  isBackupDue,
  resolveBackupDir,
  writeBackup,
} from "./backup";
import { type Db, initDb, openDb } from "./connection";
import { createIdea } from "./ideas";

let work: string;
let dataDir: string;
let backupDir: string;
let db: Db;

const backups = () => readdirSync(backupDir).filter((n) => !n.startsWith("."));

beforeEach(() => {
  work = mkdtempSync(path.join(tmpdir(), "dragon-backup-"));
  dataDir = path.join(work, "data");
  backupDir = path.join(work, "backups");
  mkdirSync(path.join(dataDir, "files", "source-1"), { recursive: true });
  writeFileSync(
    path.join(dataDir, "files", "source-1", "file-1.pdf"),
    "%PDF-1.4",
  );
  db = openDb(path.join(dataDir, "app.db"));
  createIdea(db, "The Wild Hunt");
});

afterEach(() => {
  db.$client.close();
  rmSync(work, { recursive: true, force: true });
});

describe("resolveBackupDir", () => {
  it("uses BACKUP_DIR, else OneDrive", () => {
    expect(resolveBackupDir({ BACKUP_DIR: "D:\\backups" })).toBe("D:\\backups");
    expect(resolveBackupDir({})).toMatch(
      /OneDrive[\\/]DragonDictionary Backups$/,
    );
  });
});

describe("writeBackup", () => {
  it("writes a dated folder with a database copy and the files", async () => {
    const now = new Date(2026, 9, 26, 9, 12, 5);
    const result = await writeBackup(db, { dataDir, backupDir, now });

    expect(result).toMatchObject({ ok: true });
    expect(backups()).toEqual(["2026-10-26_09-12-05"]);
    const folder = path.join(backupDir, "2026-10-26_09-12-05");
    expect(
      readFileSync(
        path.join(folder, "files", "source-1", "file-1.pdf"),
        "utf8",
      ),
    ).toBe("%PDF-1.4");
    const copy = new Database(path.join(folder, "app.db"), { readonly: true });
    expect(copy.prepare("select title from idea").all()).toEqual([
      { title: "The Wild Hunt" },
    ]);
    copy.close();
  });

  it("leaves only finished snapshots, never the live database files", async () => {
    await writeBackup(db, { dataDir, backupDir });
    expect(readdirSync(backupDir).some((n) => n.startsWith("."))).toBe(false);
    const folder = path.join(backupDir, backups()[0]);
    expect(readdirSync(folder).sort()).toEqual(["app.db", "files"]);
  });

  it("keeps the newest ten and deletes older ones", async () => {
    mkdirSync(path.join(backupDir, "keep me"), { recursive: true });
    for (let i = 0; i < BACKUPS_KEPT + 2; i++) {
      await writeBackup(db, {
        dataDir,
        backupDir,
        now: new Date(2026, 9, 1 + i, 12, 0, 0),
      });
    }
    const left = backups()
      .filter((n) => n !== "keep me")
      .sort();
    expect(left).toHaveLength(BACKUPS_KEPT);
    expect(left[0]).toBe("2026-10-03_12-00-00");
    expect(existsSync(path.join(backupDir, "keep me"))).toBe(true);
  });

  it("reports a failure instead of throwing, and cleans up", async () => {
    // A file where the backup folder should be makes every write fail.
    writeFileSync(path.join(work, "not-a-folder"), "");
    const result = await writeBackup(db, {
      dataDir,
      backupDir: path.join(work, "not-a-folder"),
    });
    expect(result).toMatchObject({ ok: false, error: expect.any(String) });
  });
});

describe("backup status", () => {
  it("records success, failure, and clears the failure after a success", async () => {
    expect(backupStatus(db, backupDir)).toEqual({
      lastAt: null,
      error: null,
      dir: backupDir,
    });

    const t1 = new Date(2026, 9, 26, 9, 0, 0);
    await backUp(db, { dataDir, backupDir, now: t1 });
    expect(backupStatus(db, backupDir).lastAt).toBe(t1.toISOString());

    writeFileSync(path.join(work, "blocked"), "");
    const t2 = new Date(2026, 9, 27, 9, 0, 0);
    await backUp(db, {
      dataDir,
      backupDir: path.join(work, "blocked"),
      now: t2,
    });
    const failed = backupStatus(db, backupDir);
    expect(failed.lastAt).toBe(t1.toISOString());
    expect(failed.error).toMatchObject({ at: t2.toISOString() });

    const t3 = new Date(2026, 9, 27, 10, 0, 0);
    await backUp(db, { dataDir, backupDir, now: t3 });
    expect(backupStatus(db, backupDir)).toMatchObject({
      lastAt: t3.toISOString(),
      error: null,
    });
  });

  it("is due when never backed up or over 24 h ago", async () => {
    const t = new Date(2026, 9, 26, 9, 0, 0);
    expect(isBackupDue(db, t)).toBe(true);
    await backUp(db, { dataDir, backupDir, now: t });
    expect(
      isBackupDue(db, new Date(t.getTime() + BACKUP_INTERVAL_MS - 1000)),
    ).toBe(false);
    expect(
      isBackupDue(db, new Date(t.getTime() + BACKUP_INTERVAL_MS + 1000)),
    ).toBe(true);
  });
});

describe("initDb", () => {
  it("backs up at startup only when the last backup is over a day old", async () => {
    db.$client.close();
    const t = new Date(2026, 9, 26, 9, 0, 0);
    const first = await initDb({ dataDir, backupDir, now: t });
    expect(backups()).toHaveLength(1);
    first.$client.close();

    const soon = await initDb({
      dataDir,
      backupDir,
      now: new Date(t.getTime() + 3_600_000),
    });
    expect(backups()).toHaveLength(1);
    soon.$client.close();

    db = await initDb({
      dataDir,
      backupDir,
      now: new Date(t.getTime() + BACKUP_INTERVAL_MS + 3_600_000),
    });
    expect(backups()).toHaveLength(2);
  });

  it("backs up before applying a pending migration", async () => {
    // Undo the newest migration, so it is pending again.
    db.$client.exec(`
      drop table project_source;
      delete from __drizzle_migrations
        where created_at = (select max(created_at) from __drizzle_migrations);
      insert into app_meta (key, value) values ('last_backup_at', '${new Date().toISOString()}');
    `);
    db.$client.close();

    db = await initDb({ dataDir, backupDir });

    expect(backups()).toHaveLength(1);
    const snapshot = new Database(
      path.join(backupDir, backups()[0], "app.db"),
      {
        readonly: true,
      },
    );
    const hasTable = (d: Database.Database) =>
      Boolean(
        d
          .prepare("select 1 from sqlite_master where name = 'project_source'")
          .get(),
      );
    expect(hasTable(snapshot)).toBe(false);
    snapshot.close();
    expect(hasTable(db.$client)).toBe(true);
  });
});
