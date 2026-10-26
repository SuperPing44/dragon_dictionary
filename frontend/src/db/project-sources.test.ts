import { beforeEach, describe, expect, it } from "vitest";
import type { SourceValues } from "@/lib/sources";
import { type Db, openDb } from "./connection";
import { createIdea } from "./ideas";
import {
  linkSource,
  listProjectSources,
  projectsOfSource,
  unlinkSource,
} from "./project-sources";
import {
  deleteVideoProject,
  getVideoProject,
  listVideoProjects,
  makeVideoProject,
} from "./projects";
import { createSource, deleteSource, getSource, listSources } from "./sources";

let db: Db;
let clock: number;
const tick = () => new Date(Date.UTC(2026, 9, 1) + clock++ * 1000);
const project = (title: string) =>
  makeVideoProject(db, createIdea(db, title, tick())?.id ?? "", tick())?.id ??
  "";
const src = (title: string, link: string | null = null) =>
  createSource(
    db,
    {
      type: "book",
      title,
      author: null,
      link,
      publisher: null,
      date: null,
      note: null,
    } satisfies SourceValues,
    tick(),
  ).id;

beforeEach(() => {
  db = openDb(":memory:");
  clock = 0;
});

describe("project sources", () => {
  it("links sources in order and counts both ways", () => {
    const ragnarok = project("Ragnarök");
    const loki = project("Loki");
    const edda = src("The Poetic Edda");
    const voluspa = src("Völuspá");
    linkSource(db, ragnarok, voluspa, tick());
    linkSource(db, ragnarok, edda, tick());
    linkSource(db, ragnarok, edda, tick());
    linkSource(db, loki, edda, tick());

    expect(listProjectSources(db, ragnarok).map((s) => s.title)).toEqual([
      "Völuspá",
      "The Poetic Edda",
    ]);
    expect(getSource(db, edda)?.projects).toBe(2);
    expect(listSources(db).map((s) => [s.title, s.projects])).toEqual([
      ["The Poetic Edda", 2],
      ["Völuspá", 1],
    ]);
    expect(getVideoProject(db, ragnarok)?.sourceCount).toBe(2);
    expect(listVideoProjects(db).map((p) => [p.title, p.sourceCount])).toEqual(
      expect.arrayContaining([
        ["Ragnarök", 2],
        ["Loki", 1],
      ]),
    );
    expect(projectsOfSource(db, edda).map((p) => p.title)).toEqual([
      "Loki",
      "Ragnarök",
    ]);
  });

  it("linking bumps the project's updated time", () => {
    const id = project("Ragnarök");
    const now = tick();
    linkSource(db, id, src("Edda"), now);
    expect(getVideoProject(db, id)?.updated).toBe(now.toISOString());
  });

  it("unlinking keeps the source in the library", () => {
    const id = project("Ragnarök");
    const edda = src("Edda");
    linkSource(db, id, edda);
    unlinkSource(db, id, edda);
    expect(listProjectSources(db, id)).toEqual([]);
    expect(getSource(db, edda)).toMatchObject({ title: "Edda", projects: 0 });
  });

  it("deleting a project removes its links; the sources stay", () => {
    const id = project("Ragnarök");
    const edda = src("Edda");
    linkSource(db, id, edda);
    deleteVideoProject(db, id);
    expect(getSource(db, edda)?.projects).toBe(0);
  });

  it("deleting a source removes its links", async () => {
    const id = project("Ragnarök");
    const edda = src("Edda");
    linkSource(db, id, edda);
    await deleteSource(db, edda, "unused-files-root");
    expect(listProjectSources(db, id)).toEqual([]);
    expect(getVideoProject(db, id)?.sourceCount).toBe(0);
  });
});
