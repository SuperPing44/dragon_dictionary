import { beforeEach, describe, expect, it } from "vitest";
import type { SourceValues } from "@/lib/sources";
import { type Db, openDb } from "./connection";
import {
  createSource,
  deleteSource,
  getSource,
  linkIndex,
  listSources,
  updateSource,
} from "./sources";

let db: Db;
let clock: number;
const tick = () => new Date(Date.UTC(2026, 9, 1) + clock++ * 1000);

const values = (over: Partial<SourceValues>): SourceValues => ({
  type: "book",
  title: "Untitled",
  author: null,
  link: null,
  publisher: null,
  date: null,
  note: null,
  ...over,
});

beforeEach(() => {
  db = openDb(":memory:");
  clock = 0;
});

describe("sources", () => {
  it("creates, updates and deletes a source", async () => {
    const created = createSource(
      db,
      values({ title: "The Poetic Edda", date: "1996" }),
      tick(),
    );
    expect(getSource(db, created.id)).toMatchObject({
      title: "The Poetic Edda",
      date: "1996",
      projects: 0,
    });

    const later = tick();
    updateSource(
      db,
      created.id,
      values({ type: "paper", title: "Edda" }),
      later,
    );
    expect(getSource(db, created.id)).toMatchObject({
      type: "paper",
      title: "Edda",
      date: null,
      updated: later.toISOString(),
      created: created.created,
    });

    await deleteSource(db, created.id, "unused-files-root");
    expect(getSource(db, created.id)).toBeUndefined();
  });
});

describe("listSources", () => {
  beforeEach(() => {
    createSource(
      db,
      values({ title: "the Prose Edda", author: "Snorri Sturluson" }),
      tick(),
    );
    createSource(
      db,
      values({ type: "website", title: "Wild Hunt (Wikipedia)" }),
      tick(),
    );
    createSource(
      db,
      values({
        type: "youtube",
        title: "God of War — every myth",
        author: "Jackson Crawford",
      }),
      tick(),
    );
    createSource(
      db,
      values({ type: "pdf", title: "Gylfaginning 100%", author: "Snorri" }),
      tick(),
    );
  });

  const titles = (q: Parameters<typeof listSources>[1]) =>
    listSources(db, q).map((s) => s.title);

  it("sorts by title ignoring case, or newest first", () => {
    expect(titles({})).toEqual([
      "God of War — every myth",
      "Gylfaginning 100%",
      "the Prose Edda",
      "Wild Hunt (Wikipedia)",
    ]);
    expect(titles({ sort: "newest" })).toEqual([
      "Gylfaginning 100%",
      "God of War — every myth",
      "Wild Hunt (Wikipedia)",
      "the Prose Edda",
    ]);
  });

  it("filters by type", () => {
    expect(titles({ type: "youtube" })).toEqual(["God of War — every myth"]);
  });

  it("searches title and author, ignoring case", () => {
    expect(titles({ search: "SNORRI" })).toEqual([
      "Gylfaginning 100%",
      "the Prose Edda",
    ]);
    expect(titles({ search: "hunt" })).toEqual(["Wild Hunt (Wikipedia)"]);
    expect(titles({ search: "crawford", type: "book" })).toEqual([]);
  });

  it("treats % and _ in a search as plain text", () => {
    expect(titles({ search: "100%" })).toEqual(["Gylfaginning 100%"]);
    expect(titles({ search: "%" })).toEqual(["Gylfaginning 100%"]);
    expect(titles({ search: "_" })).toEqual([]);
  });
});

describe("linkIndex", () => {
  it("lists normalized links of sources that have one", () => {
    const a = createSource(
      db,
      values({
        title: "Völuspá",
        link: "https://www.sacred-texts.com/neu/poe/poe03.htm",
      }),
    );
    createSource(db, values({ title: "No link" }));
    expect(linkIndex(db)).toEqual([
      {
        id: a.id,
        title: "Völuspá",
        link: "sacred-texts.com/neu/poe/poe03.htm",
      },
    ]);
  });
});
