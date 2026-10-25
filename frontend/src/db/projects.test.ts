import { beforeEach, describe, expect, it } from "vitest";
import {
  addIdeaCategory,
  createCategory,
  deleteCategory,
  listCategoriesWithUsage,
  mergeCategory,
} from "./categories";
import { type Db, openDb } from "./connection";
import { createIdea, getIdea, updateIdea } from "./ideas";
import {
  addProjectCategory,
  deleteVideoProject,
  EMPTY_DOC,
  getVideoProject,
  listSections,
  listVideoProjects,
  makeVideoProject,
  removeProjectCategory,
  updateVideoProject,
} from "./projects";
import { addSubsection, saveSectionContent } from "./sections";

let db: Db;
let clock: number;
const tick = () => new Date(Date.UTC(2026, 9, 1) + clock++ * 60_000);

beforeEach(() => {
  db = openDb(":memory:");
  clock = 0;
});

const ideaWith = (
  title: string,
  note: string | null,
  rating: number | null,
) => {
  const id = createIdea(db, title, tick())?.id ?? "";
  updateIdea(db, id, { note, rating }, tick());
  return id;
};

describe("makeVideoProject", () => {
  it("turns an idea into a Research project and deletes the idea", () => {
    const norse = createCategory(db, "Norse", "violet", tick());
    const pop = createCategory(db, "Pop", "fuchsia", tick());
    const ideaId = ideaWith("Loki before Marvel", "Eddas vs. comics", 8);
    addIdeaCategory(db, ideaId, norse.id);
    addIdeaCategory(db, ideaId, pop.id);

    const now = tick();
    const project = makeVideoProject(db, ideaId, now);

    expect(project).toMatchObject({
      title: "Loki before Marvel",
      stage: "research",
      originalNote: "Eddas vs. comics",
      originalRating: 8,
      created: now.toISOString(),
      updated: now.toISOString(),
    });
    expect(getIdea(db, ideaId)).toBeUndefined();
    expect(
      getVideoProject(db, project?.id ?? "")?.categories.map((c) => c.name),
    ).toEqual(["Norse", "Pop"]);
  });

  it("creates the six empty template sections in canonical order", () => {
    const project = makeVideoProject(db, ideaWith("Fenrir", null, null));
    const sections = listSections(db, project?.id ?? "");
    expect(sections.map((s) => s.kind)).toEqual([
      "opening_story",
      "hook",
      "intro",
      "main",
      "outro",
      "closing_story",
    ]);
    expect(sections.every((s) => s.content === EMPTY_DOC)).toBe(true);
    expect(sections.every((s) => s.wordCount === 0 && s.parent === null)).toBe(
      true,
    );
  });

  it("keeps a missing note and rating as missing", () => {
    const project = makeVideoProject(db, ideaWith("Fenrir", null, null));
    expect(project).toMatchObject({ originalNote: null, originalRating: null });
  });

  it("does nothing for an unknown idea", () => {
    expect(makeVideoProject(db, "nope")).toBeUndefined();
    expect(listVideoProjects(db)).toEqual([]);
  });
});

describe("video project changes", () => {
  let id: string;

  beforeEach(() => {
    id =
      makeVideoProject(db, ideaWith("Ragnarök", null, null), tick())?.id ?? "";
  });

  it("changes title and stage and bumps updated", () => {
    const now = tick();
    expect(
      updateVideoProject(
        db,
        id,
        { title: " Ragnarök: the end ", stage: "script" },
        now,
      ),
    ).toMatchObject({
      title: "Ragnarök: the end",
      stage: "script",
      updated: now.toISOString(),
    });
  });

  it("rejects a blank title and an unknown stage", () => {
    expect(() => updateVideoProject(db, id, { title: " " })).toThrow();
    // @ts-expect-error an invalid stage on purpose
    expect(() => updateVideoProject(db, id, { stage: "idea" })).toThrow();
  });

  it("adds and removes categories", () => {
    const norse = createCategory(db, "Norse", "violet");
    addProjectCategory(db, id, norse.id);
    addProjectCategory(db, id, norse.id);
    expect(getVideoProject(db, id)?.categories.map((c) => c.name)).toEqual([
      "Norse",
    ]);
    removeProjectCategory(db, id, norse.id);
    expect(getVideoProject(db, id)?.categories).toEqual([]);
  });

  it("lists most recently updated first", () => {
    const other = makeVideoProject(db, ideaWith("Krampus", null, null), tick());
    expect(listVideoProjects(db).map((p) => p.title)).toEqual([
      "Krampus",
      "Ragnarök",
    ]);
    updateVideoProject(db, id, { stage: "editing" }, tick());
    expect(listVideoProjects(db).map((p) => p.title)).toEqual([
      "Ragnarök",
      "Krampus",
    ]);
    expect(other).toBeDefined();
  });

  it("deletes a project with its sections and category links", () => {
    const norse = createCategory(db, "Norse", "violet");
    addProjectCategory(db, id, norse.id);

    deleteVideoProject(db, id);

    expect(listVideoProjects(db)).toEqual([]);
    expect(listSections(db, id)).toEqual([]);
    expect(
      db.$client.prepare("select count(*) as n from project_category").get(),
    ).toEqual({ n: 0 });
    expect(listCategoriesWithUsage(db).map((c) => c.name)).toEqual(["Norse"]);
  });

  it("deleting a category removes it from projects", () => {
    const norse = createCategory(db, "Norse", "violet");
    addProjectCategory(db, id, norse.id);
    deleteCategory(db, norse.id);
    expect(getVideoProject(db, id)?.categories).toEqual([]);
  });
});

describe("categories with video projects", () => {
  it("counts project usage and merges project links", () => {
    const norse = createCategory(db, "Norse Mythology", "violet");
    const myths = createCategory(db, "Norse Myths", "teal");
    const both = makeVideoProject(db, ideaWith("Loki", null, null))?.id ?? "";
    const onlyMyths =
      makeVideoProject(db, ideaWith("Fenrir", null, null))?.id ?? "";
    addProjectCategory(db, both, norse.id);
    addProjectCategory(db, both, myths.id);
    addProjectCategory(db, onlyMyths, myths.id);
    addIdeaCategory(db, ideaWith("Odin", null, null), myths.id);

    expect(
      listCategoriesWithUsage(db).map((c) => [
        c.name,
        c.ideas,
        c.videoProjects,
      ]),
    ).toEqual([
      ["Norse Mythology", 0, 1],
      ["Norse Myths", 1, 2],
    ]);

    mergeCategory(db, myths.id, norse.id);

    expect(
      listCategoriesWithUsage(db).map((c) => [
        c.name,
        c.ideas,
        c.videoProjects,
      ]),
    ).toEqual([["Norse Mythology", 1, 2]]);
  });
});

describe("project word totals", () => {
  it("sums every section's words, subsections included", () => {
    const id = makeVideoProject(db, ideaWith("Ragnarök", null, null))?.id ?? "";
    const other =
      makeVideoProject(db, ideaWith("Krampus", null, null))?.id ?? "";
    const sections = listSections(db, id);
    const words = (n: number) =>
      JSON.stringify({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "word ".repeat(n) }],
          },
        ],
      });
    saveSectionContent(db, sections[1].id, words(120));
    const main = sections.find((s) => s.kind === "main")?.id ?? "";
    const sub = addSubsection(db, main);
    saveSectionContent(db, sub.id, words(30));

    expect(getVideoProject(db, id)?.wordCount).toBe(150);
    expect(listVideoProjects(db).map((p) => [p.title, p.wordCount])).toEqual(
      expect.arrayContaining([
        ["Ragnarök", 150],
        ["Krampus", 0],
      ]),
    );
    expect(other).toBeDefined();
  });
});
