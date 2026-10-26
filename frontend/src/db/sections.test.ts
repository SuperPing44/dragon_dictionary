import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { type Db, openDb } from "./connection";
import { createIdea } from "./ideas";
import { getVideoProject, listSections, makeVideoProject } from "./projects";
import { section } from "./schema";
import {
  addSection,
  addSubsection,
  removeSection,
  renameSubsection,
  reorderSections,
  saveSectionContent,
} from "./sections";

let db: Db;
let projectId: string;

beforeEach(() => {
  db = openDb(":memory:");
  const idea = createIdea(db, "Ragnarök", new Date("2026-10-01T00:00:00Z"));
  projectId =
    makeVideoProject(db, idea?.id ?? "", new Date("2026-10-01T00:00:00Z"))
      ?.id ?? "";
});

const kinds = () => listSections(db, projectId).map((s) => s.kind);
const sectionOf = (kind: string) =>
  listSections(db, projectId).find((s) => s.kind === kind)?.id ?? "";
const doc = (text: string) =>
  JSON.stringify({
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [
          { type: "text", text },
          { type: "stageDirection", attrs: { description: "map of Asgard" } },
        ],
      },
    ],
  });

describe("saveSectionContent", () => {
  it("stores the content and its word count without stage directions", () => {
    const hook = sectionOf("hook");
    const now = new Date("2026-10-02T00:00:00Z");
    expect(saveSectionContent(db, hook, doc("The world will end."), now)).toBe(
      4,
    );
    const saved = listSections(db, projectId).find((s) => s.id === hook);
    expect(saved?.wordCount).toBe(4);
    expect(JSON.parse(saved?.content ?? "")).toEqual(
      JSON.parse(doc("The world will end.")),
    );
    expect(getVideoProject(db, projectId)?.updated).toBe(now.toISOString());
  });

  it("rejects content that isn't a document", () => {
    expect(() => saveSectionContent(db, sectionOf("hook"), "[]")).toThrow();
  });
});

describe("removeSection", () => {
  it("removes a section, and the Main part takes its subsections", () => {
    const main = sectionOf("main");
    db.insert(section)
      .values({
        id: "sub-1",
        videoProject: projectId,
        parent: main,
        title: "Signs of the end",
        position: 0,
        content: "{}",
      })
      .run();

    removeSection(db, main);

    expect(kinds()).toEqual([
      "opening_story",
      "hook",
      "intro",
      "outro",
      "closing_story",
    ]);
    expect(listSections(db, projectId).some((s) => s.id === "sub-1")).toBe(
      false,
    );
  });

  it("allows an empty script", () => {
    for (const s of listSections(db, projectId)) removeSection(db, s.id);
    expect(kinds()).toEqual([]);
  });
});

describe("addSection", () => {
  it("re-adds a section at its canonical position", () => {
    removeSection(db, sectionOf("intro"));
    addSection(db, projectId, "intro");
    expect(kinds()).toEqual([
      "opening_story",
      "hook",
      "intro",
      "main",
      "outro",
      "closing_story",
    ]);
  });

  it("goes to the top when nothing canonical precedes it", () => {
    removeSection(db, sectionOf("opening_story"));
    removeSection(db, sectionOf("hook"));
    addSection(db, projectId, "hook");
    expect(kinds()[0]).toBe("hook");
  });

  it("follows the current order after reordering", () => {
    removeSection(db, sectionOf("intro"));
    // Move the hook to the end.
    db.update(section).set({ position: 99 }).where(sqlKind("hook")).run();
    addSection(db, projectId, "intro");
    expect(kinds()).toEqual([
      "opening_story",
      "main",
      "outro",
      "closing_story",
      "hook",
      "intro",
    ]);
  });

  it("refuses a kind the script already has", () => {
    expect(() => addSection(db, projectId, "hook")).toThrow();
  });
});

function sqlKind(kind: string) {
  return eq(section.id, sectionOf(kind));
}

describe("subsections", () => {
  const subs = () =>
    listSections(db, projectId)
      .filter((s) => s.parent)
      .map((s) => s.title);

  it("adds untitled subsections at the end of the Main part", () => {
    const main = sectionOf("main");
    const first = addSubsection(db, main);
    addSubsection(db, main);
    expect(first).toMatchObject({ parent: main, kind: null, wordCount: 0 });
    expect(subs()).toEqual(["Untitled subsection", "Untitled subsection"]);
    // Listed right after the Main part, before the Outro.
    expect(listSections(db, projectId).map((s) => s.kind ?? "sub")).toEqual([
      "opening_story",
      "hook",
      "intro",
      "main",
      "sub",
      "sub",
      "outro",
      "closing_story",
    ]);
  });

  it("only the Main part has subsections", () => {
    expect(() => addSubsection(db, sectionOf("hook"))).toThrow();
  });

  it("renames, keeping an empty title", () => {
    const sub = addSubsection(db, sectionOf("main"));
    renameSubsection(db, sub.id, "  Signs of the end ");
    expect(subs()).toEqual(["Signs of the end"]);
    renameSubsection(db, sub.id, "");
    expect(subs()).toEqual([""]);
  });

  it("never renames a top-level section", () => {
    renameSubsection(db, sectionOf("hook"), "Not a hook");
    expect(
      listSections(db, projectId).find((s) => s.kind === "hook")?.title,
    ).toBeNull();
  });

  it("adding the first subsection leaves the Main part's lead-in alone", () => {
    const main = sectionOf("main");
    saveSectionContent(db, main, doc("Lead-in words"));
    addSubsection(db, main);
    expect(
      listSections(db, projectId).find((s) => s.id === main)?.wordCount,
    ).toBe(2);
  });
});

describe("reorderSections", () => {
  it("reorders top-level sections", () => {
    const ids = listSections(db, projectId).map((s) => s.id);
    reorderSections(db, projectId, null, [ids[5], ...ids.slice(0, 5)]);
    expect(kinds()).toEqual([
      "closing_story",
      "opening_story",
      "hook",
      "intro",
      "main",
      "outro",
    ]);
  });

  it("reorders subsections within the Main part", () => {
    const main = sectionOf("main");
    const a = addSubsection(db, main);
    const b = addSubsection(db, main);
    renameSubsection(db, a.id, "A");
    renameSubsection(db, b.id, "B");
    reorderSections(db, projectId, main, [b.id, a.id]);
    expect(
      listSections(db, projectId)
        .filter((s) => s.parent)
        .map((s) => s.title),
    ).toEqual(["B", "A"]);
  });

  it("refuses an order that isn't exactly the siblings", () => {
    const main = sectionOf("main");
    const sub = addSubsection(db, main);
    const tops = listSections(db, projectId)
      .filter((s) => !s.parent)
      .map((s) => s.id);
    // A subsection can't be moved to the top level.
    expect(() =>
      reorderSections(db, projectId, null, [...tops, sub.id]),
    ).toThrow();
    expect(() => reorderSections(db, projectId, null, tops.slice(1))).toThrow();
    expect(() => reorderSections(db, projectId, main, [tops[0]])).toThrow();
  });
});
