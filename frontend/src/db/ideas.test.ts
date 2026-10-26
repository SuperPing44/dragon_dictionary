import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { type Db, openDb, resolveDataDir } from "./connection";
import {
  countIdeas,
  createIdea,
  deleteIdea,
  getIdea,
  listIdeas,
  updateIdea,
} from "./ideas";
import { idea } from "./schema";

let db: Db;

beforeEach(() => {
  db = openDb(":memory:");
});

describe("createIdea", () => {
  it("stores a trimmed title with matching created and updated times", () => {
    const now = new Date("2026-10-25T10:00:00.000Z");
    const created = createIdea(db, "  The Wild Hunt  ", now);

    expect(created).toMatchObject({
      title: "The Wild Hunt",
      note: null,
      rating: null,
      created: now.toISOString(),
      updated: now.toISOString(),
    });
    expect(listIdeas(db)).toEqual([created]);
  });

  it("ignores a blank title", () => {
    expect(createIdea(db, "   ")).toBeUndefined();
    expect(countIdeas(db)).toBe(0);
  });

  it("gives each idea a UUID v7", () => {
    const created = createIdea(db, "Loki before Marvel");
    expect(created?.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });
});

describe("listIdeas", () => {
  it("sorts by rating, highest first, unrated last, ties to the newest", () => {
    const at = (day: number) =>
      `2026-10-${String(day).padStart(2, "0")}T00:00:00.000Z`;
    const rows = [
      { title: "unrated old", rating: null, day: 1 },
      { title: "seven", rating: 7, day: 2 },
      { title: "nine", rating: 9, day: 3 },
      { title: "unrated new", rating: null, day: 4 },
      { title: "seven newer", rating: 7, day: 5 },
    ];
    for (const [i, r] of rows.entries()) {
      db.insert(idea)
        .values({
          id: `id-${i}`,
          title: r.title,
          rating: r.rating,
          created: at(r.day),
          updated: at(r.day),
        })
        .run();
    }

    expect(listIdeas(db).map((i) => i.title)).toEqual([
      "nine",
      "seven newer",
      "seven",
      "unrated new",
      "unrated old",
    ]);
  });
});

describe("listIdeas sorts", () => {
  const at = (day: number) =>
    `2026-10-${String(day).padStart(2, "0")}T00:00:00.000Z`;

  beforeEach(() => {
    const rows = [
      { title: "beta", rating: 3, day: 1 },
      { title: "Alpha", rating: null, day: 2 },
      { title: "alpha", rating: 9, day: 3 },
      { title: "Gamma", rating: 3, day: 4 },
    ];
    for (const [i, r] of rows.entries()) {
      db.insert(idea)
        .values({
          id: `id-${i}`,
          title: r.title,
          rating: r.rating,
          created: at(r.day),
          updated: at(r.day),
        })
        .run();
    }
  });

  it("newest first", () => {
    expect(listIdeas(db, "newest").map((i) => i.title)).toEqual([
      "Gamma",
      "alpha",
      "Alpha",
      "beta",
    ]);
  });

  it("title A–Z ignoring case, ties to the newest", () => {
    expect(listIdeas(db, "title").map((i) => i.title)).toEqual([
      "alpha",
      "Alpha",
      "beta",
      "Gamma",
    ]);
  });
});

describe("updateIdea", () => {
  const created = new Date("2026-10-01T00:00:00.000Z");
  const later = new Date("2026-10-02T00:00:00.000Z");
  let id: string;

  beforeEach(() => {
    id = createIdea(db, "Krampus", created)?.id ?? "";
  });

  it("changes title and note and bumps updated", () => {
    const updated = updateIdea(
      db,
      id,
      { title: " Krampus night ", note: "Alpine processions" },
      later,
    );
    expect(updated).toMatchObject({
      title: "Krampus night",
      note: "Alpine processions",
      created: created.toISOString(),
      updated: later.toISOString(),
    });
  });

  it("rejects a blank title and keeps the old one", () => {
    expect(() => updateIdea(db, id, { title: "  " })).toThrow();
    expect(getIdea(db, id)?.title).toBe("Krampus");
  });

  it("stores a blank note as no note", () => {
    updateIdea(db, id, { note: "something" });
    expect(updateIdea(db, id, { note: "   " })?.note).toBeNull();
  });

  it("sets, changes and clears the rating", () => {
    expect(updateIdea(db, id, { rating: 1 })?.rating).toBe(1);
    expect(updateIdea(db, id, { rating: 10 })?.rating).toBe(10);
    expect(updateIdea(db, id, { rating: null })?.rating).toBeNull();
  });

  it.each([0, 11, 4.5, Number.NaN])("rejects rating %s", (rating) => {
    expect(() => updateIdea(db, id, { rating })).toThrow();
  });
});

describe("deleteIdea", () => {
  it("removes the idea permanently", () => {
    const keep = createIdea(db, "keep");
    const gone = createIdea(db, "gone");
    deleteIdea(db, gone?.id ?? "");
    expect(listIdeas(db)).toEqual([keep]);
  });
});

describe("openDb", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), "dragon-db-"));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("keeps ideas across reopening the database file", () => {
    const file = path.join(dir, "app.db");
    const first = openDb(file);
    createIdea(first, "Fenrir");
    first.$client.close();

    const second = openDb(file);
    expect(listIdeas(second).map((i) => i.title)).toEqual(["Fenrir"]);
    second.$client.close();
  });

  it("uses WAL mode for a database file", () => {
    const file = openDb(path.join(dir, "app.db"));
    expect(file.$client.pragma("journal_mode", { simple: true })).toBe("wal");
    file.$client.close();
  });
});

describe("resolveDataDir", () => {
  it("uses DATA_DIR when set", () => {
    expect(resolveDataDir({ DATA_DIR: "D:\\dragon" })).toBe("D:\\dragon");
  });

  it("defaults to DragonDictionary in the home folder", () => {
    expect(resolveDataDir({})).toMatch(/[\\/]DragonDictionary$/);
  });
});
