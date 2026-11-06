import { beforeEach, describe, expect, it } from "vitest";
import { applyBoardMove, boardColumns, reorderColumn } from "@/lib/board";
import { type Db, migrateDb, openDb } from "./connection";
import { createIdea } from "./ideas";
import {
  countVideoProjects,
  listVideoProjects,
  makeVideoProject,
  moveOnBoard,
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

describe("moving cards", () => {
  const ids = () => {
    const [a, b, c] = [make("A"), make("B"), make("C")];
    return { a, b, c }; // Research reads C, B, A
  };

  it("into another column lands on top, wherever it was dropped", () => {
    const { a, b, c } = ids();
    moveOnBoard(db, { id: a, stage: "script", beforeId: null }, tick());
    moveOnBoard(db, { id: c, stage: "script", beforeId: null }, tick());
    expect(columns().script).toEqual(["C", "A"]);
    expect(columns().research).toEqual(["B"]);
    expect(b).toBeTruthy();
  });

  it("can go backward or skip columns, like the stars", () => {
    const { a } = ids();
    moveOnBoard(db, { id: a, stage: "upload", beforeId: null }, tick());
    moveOnBoard(db, { id: a, stage: "research", beforeId: null }, tick());
    expect(columns().research).toEqual(["A", "C", "B"]);
    expect(columns().upload).toEqual([]);
  });

  it("renumbers both columns", () => {
    const { a, b } = ids();
    moveOnBoard(db, { id: b, stage: "script", beforeId: null }, tick());
    const rows = db.$client
      .prepare(
        "select title, stage, board_position as p from video_project order by stage, p",
      )
      .all();
    expect(rows).toEqual([
      { title: "C", stage: "research", p: 0 },
      { title: "A", stage: "research", p: 1 },
      { title: "B", stage: "script", p: 0 },
    ]);
    expect(a).toBeTruthy();
  });

  it("within a column goes before the card it's dropped on, or to the end", () => {
    const { a, b, c } = ids();
    moveOnBoard(db, { id: a, stage: "research", beforeId: c }, tick());
    expect(columns().research).toEqual(["A", "C", "B"]);
    moveOnBoard(db, { id: a, stage: "research", beforeId: null }, tick());
    expect(columns().research).toEqual(["C", "B", "A"]);
    moveOnBoard(db, { id: c, stage: "research", beforeId: a }, tick());
    expect(columns().research).toEqual(["B", "C", "A"]);
    expect(b).toBeTruthy();
  });

  it("refuses Published, which isn't a board column", () => {
    const { a } = ids();
    expect(() =>
      moveOnBoard(db, { id: a, stage: "published" as never, beforeId: null }),
    ).toThrow();
  });
});

describe("applyBoardMove (shown at once)", () => {
  const cards = [
    { id: "c", stage: "research" as const },
    { id: "b", stage: "research" as const },
    { id: "a", stage: "research" as const },
    { id: "x", stage: "script" as const },
  ];
  const order = (list: { id: string; stage: string }[]) =>
    list.map((p) => `${p.stage}:${p.id}`);

  it("matches the server: on top of a new column, before a card within one", () => {
    expect(
      order(applyBoardMove(cards, { id: "a", stage: "script", beforeId: "x" })),
    ).toEqual(["script:a", "research:c", "research:b", "script:x"]);
    expect(
      order(
        applyBoardMove(cards, { id: "a", stage: "research", beforeId: "c" }),
      ),
    ).toEqual(["research:a", "research:c", "research:b", "script:x"]);
  });

  it("puts the card at the end of its column for a null target", () => {
    expect(
      order(
        applyBoardMove(cards, { id: "c", stage: "research", beforeId: null }),
      ),
    ).toEqual(["research:b", "research:a", "research:c", "script:x"]);
  });

  it("reorders a column, keeping the rest", () => {
    expect(reorderColumn(["a", "b", "c"], "c", "a")).toEqual(["c", "a", "b"]);
    expect(reorderColumn(["a", "b", "c"], "a", "gone")).toEqual([
      "b",
      "c",
      "a",
    ]);
  });
});
