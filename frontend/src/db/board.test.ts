import { beforeEach, describe, expect, it } from "vitest";
import { boardColumns } from "@/lib/board";
import { type Db, migrateDb, openDb } from "./connection";
import { createIdea } from "./ideas";
import {
  countVideoProjects,
  listVideoProjects,
  makeVideoProject,
  updateVideoProject,
} from "./projects";
import { undoNewestMigration } from "./test-migrations";

let db: Db;
let clock: number;
const tick = () => new Date(Date.UTC(2026, 10, 1) + clock++ * 60_000);

beforeEach(() => {
  db = openDb(":memory:");
  clock = 0;
});

const make = (title: string) =>
  makeVideoProject(db, createIdea(db, title, tick())?.id ?? "", tick())?.id ??
  "";

/** Titles per board column, Research to Upload. */
const columns = () =>
  Object.fromEntries(
    boardColumns(listVideoProjects(db)).map((c) => [
      c.stage,
      c.cards.map((p) => p.title),
    ]),
  );

describe("the 0.4.0 migration", () => {
  it("numbers each stage by updated, newest on top", () => {
    undoNewestMigration(db);
    db.$client.exec(`
      insert into video_project (id, title, stage, created, updated) values
        ('a', 'Old research', 'research', '2026-01-01', '2026-01-02'),
        ('b', 'New research', 'research', '2026-01-01', '2026-03-01'),
        ('c', 'Mid research', 'research', '2026-01-01', '2026-02-01'),
        ('d', 'Only script', 'script', '2026-01-01', '2026-01-05');
    `);
    migrateDb(db);
    const position = Object.fromEntries(
      (
        db.$client
          .prepare("select id, board_position as p from video_project")
          .all() as { id: string; p: number }[]
      ).map((r) => [r.id, r.p]),
    );
    expect(position).toEqual({ b: 0, c: 1, a: 2, d: 0 });
  });
});

describe("board order", () => {
  it("puts a new project from the idea list on top of Research", () => {
    make("Loki");
    make("Fenrir");
    make("Odin");
    expect(columns().research).toEqual(["Odin", "Fenrir", "Loki"]);
  });

  it("puts a project moved with the stars on top of its new column", () => {
    const loki = make("Loki");
    const fenrir = make("Fenrir");
    const odin = make("Odin");
    updateVideoProject(db, loki, { stage: "script" }, tick());
    updateVideoProject(db, fenrir, { stage: "script" }, tick());
    expect(columns().script).toEqual(["Fenrir", "Loki"]);
    expect(columns().research).toEqual(["Odin"]);
    // Setting the same stage again doesn't move it.
    updateVideoProject(db, loki, { stage: "script" }, tick());
    expect(columns().script).toEqual(["Fenrir", "Loki"]);
    expect(odin).toBeTruthy();
  });

  it("renumbers the column it lands in", () => {
    const a = make("A");
    const b = make("B");
    updateVideoProject(db, a, { stage: "editing" }, tick());
    updateVideoProject(db, b, { stage: "editing" }, tick());
    const positions = db.$client
      .prepare(
        "select title, board_position as p from video_project where stage = 'editing' order by p",
      )
      .all();
    expect(positions).toEqual([
      { title: "B", p: 0 },
      { title: "A", p: 1 },
    ]);
  });
});

describe("the board", () => {
  it("has six columns and leaves out published projects", () => {
    const loki = make("Loki");
    make("Fenrir");
    updateVideoProject(db, loki, { stage: "published" }, tick());
    expect(columns()).toEqual({
      research: ["Fenrir"],
      script: [],
      recording: [],
      editing: [],
      thumbnail: [],
      upload: [],
    });
  });

  it("counts only the projects on the board", () => {
    const loki = make("Loki");
    make("Fenrir");
    expect(countVideoProjects(db)).toBe(2);
    updateVideoProject(db, loki, { stage: "published" }, tick());
    expect(countVideoProjects(db)).toBe(1);
  });
});
