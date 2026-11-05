import { beforeEach, describe, expect, it } from "vitest";
import {
  hasTag,
  splitTagInput,
  tagSuggestions,
  tagsCopyText,
} from "@/lib/tags";
import { type Db, openDb } from "./connection";
import { createIdea } from "./ideas";
import { deleteVideoProject, makeVideoProject } from "./projects";
import {
  addProjectTag,
  listProjectTags,
  removeProjectTag,
  tagUsage,
} from "./tags";

let db: Db;

beforeEach(() => {
  db = openDb(":memory:");
});

const newProject = (title: string) =>
  makeVideoProject(db, createIdea(db, title)?.id ?? "")?.id ?? "";

describe("project tags", () => {
  it("are kept as typed, in entry order", () => {
    const p = newProject("Ragnarök");
    addProjectTag(db, p, " Norse mythology ");
    addProjectTag(db, p, "Ragnarök");
    addProjectTag(db, p, "fenrir");
    expect(listProjectTags(db, p)).toEqual([
      "Norse mythology",
      "Ragnarök",
      "fenrir",
    ]);
  });

  it("ignore duplicates regardless of case, and blank text", () => {
    const p = newProject("Ragnarök");
    expect(addProjectTag(db, p, "Fenrir")).toBe(true);
    expect(addProjectTag(db, p, "FENRIR")).toBe(false);
    expect(addProjectTag(db, p, "  ")).toBe(false);
    expect(listProjectTags(db, p)).toEqual(["Fenrir"]);
  });

  it("allow the same tag on different projects", () => {
    const a = newProject("Ragnarök");
    const b = newProject("Loki");
    addProjectTag(db, a, "Norse");
    addProjectTag(db, b, "norse");
    expect(listProjectTags(db, b)).toEqual(["norse"]);
  });

  it("are removed ignoring case, keeping the order of the rest", () => {
    const p = newProject("Ragnarök");
    for (const t of ["Odin", "Fenrir", "Loki"]) addProjectTag(db, p, t);
    removeProjectTag(db, p, "fenrir");
    addProjectTag(db, p, "Thor");
    expect(listProjectTags(db, p)).toEqual(["Odin", "Loki", "Thor"]);
  });

  it("go when the project is deleted", () => {
    const p = newProject("Ragnarök");
    addProjectTag(db, p, "Odin");
    deleteVideoProject(db, p);
    expect(listProjectTags(db, p)).toEqual([]);
  });
});

describe("tag usage", () => {
  it("counts the projects using each tag, ignoring case and this project", () => {
    const here = newProject("Ragnarök");
    const a = newProject("Loki");
    const b = newProject("Baldr");
    const c = newProject("Lokasenna");
    addProjectTag(db, here, "Loki");
    addProjectTag(db, a, "Loki");
    addProjectTag(db, b, "loki");
    addProjectTag(db, c, "Loki");
    addProjectTag(db, c, "Lokasenna");

    const usage = tagUsage(db, here);
    const byKey = Object.fromEntries(
      usage.map((u) => [u.text.toLowerCase(), u.projects]),
    );
    expect(byKey).toEqual({ loki: 3, lokasenna: 1 });
  });
});

describe("suggestions", () => {
  const usage = [
    { text: "Lokasenna", projects: 1 },
    { text: "Loki", projects: 3 },
    { text: "Norse mythology", projects: 5 },
  ];

  it("match the query anywhere, most used first", () => {
    expect(tagSuggestions(usage, "lok", [])).toEqual([
      { text: "Loki", projects: 3 },
      { text: "Lokasenna", projects: 1 },
    ]);
  });

  it("leave out tags the project already has, and an empty query", () => {
    expect(tagSuggestions(usage, "lok", ["LOKI"])).toEqual([
      { text: "Lokasenna", projects: 1 },
    ]);
    expect(tagSuggestions(usage, "  ", [])).toEqual([]);
  });
});

describe("input and copy", () => {
  it("split at commas, keeping the text after the last one", () => {
    expect(splitTagInput("norse mythology, ragnarok,fen")).toEqual({
      add: ["norse mythology", "ragnarok"],
      rest: "fen",
    });
    expect(splitTagInput("odin,")).toEqual({ add: ["odin"], rest: "" });
    expect(splitTagInput(" , ,thor")).toEqual({ add: [], rest: "thor" });
  });

  it("copy as a comma-separated string", () => {
    expect(tagsCopyText(["norse mythology", "ragnarok", "fenrir"])).toBe(
      "norse mythology, ragnarok, fenrir",
    );
    expect(tagsCopyText([])).toBe("");
  });

  it("find a tag ignoring case", () => {
    expect(hasTag(["Fenrir"], " fenrir ")).toBe(true);
    expect(hasTag(["Fenrir"], "Fen")).toBe(false);
  });
});
