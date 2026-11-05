import { beforeEach, describe, expect, it } from "vitest";
import {
  brollCopyText,
  brollProgress,
  scriptBrollGroups,
  withDirectionFound,
} from "@/lib/broll";
import { parseDoc } from "@/lib/script";
import {
  addBrollItem,
  deleteBrollItem,
  editBrollItem,
  listBrollItems,
  setBrollItemFound,
  setScriptItemFound,
} from "./broll";
import { type Db, openDb } from "./connection";
import { createIdea } from "./ideas";
import { listSections, makeVideoProject } from "./projects";
import {
  addSubsection,
  renameSubsection,
  saveSectionContent,
} from "./sections";

let db: Db;
let projectId: string;

beforeEach(() => {
  db = openDb(":memory:");
  projectId =
    makeVideoProject(db, createIdea(db, "Ragnarök")?.id ?? "")?.id ?? "";
});

const dir = (description: string, found?: boolean) => ({
  type: "stageDirection",
  attrs: found === undefined ? { description } : { description, found },
});
const para = (...content: object[]) => ({ type: "paragraph", content });
const text = (t: string) => ({ type: "text", text: t });
const doc = (...content: object[]) => JSON.stringify({ type: "doc", content });

const sectionOf = (kind: string) =>
  listSections(db, projectId).find((s) => s.kind === kind)?.id ?? "";

function writeScript() {
  saveSectionContent(
    db,
    sectionOf("opening_story"),
    doc(
      para(text("Long ago "), dir("longship on a stormy sea")),
      para(dir("old woman by a fire"), dir("   ")),
    ),
  );
  saveSectionContent(
    db,
    sectionOf("hook"),
    doc(
      para(
        dir("wolf eye close-up", true),
        text(" and "),
        dir("wolf eye close-up"),
      ),
    ),
  );
  const sub = addSubsection(db, sectionOf("main"));
  renameSubsection(db, sub.id, "Signs of the end");
  saveSectionContent(db, sub.id, doc(para(dir("brothers fighting"))));
  return sub.id;
}

const groups = () => scriptBrollGroups(listSections(db, projectId));

describe("script items", () => {
  it("are the directions in script order, grouped under their entry", () => {
    writeScript();
    expect(
      groups().map((g) => ({
        label: g.label,
        items: g.items.map((i) => [i.index, i.description, i.found]),
      })),
    ).toEqual([
      {
        label: "Opening story sketch",
        items: [
          [0, "longship on a stormy sea", false],
          [1, "old woman by a fire", false],
        ],
      },
      {
        label: "Hook",
        items: [
          [0, "wolf eye close-up", true],
          [1, "wolf eye close-up", false],
        ],
      },
      {
        label: "Main part · Signs of the end",
        items: [[0, "brothers fighting", false]],
      },
    ]);
  });

  it("leave out empty descriptions but keep counting positions", () => {
    writeScript();
    const opening = groups()[0];
    expect(opening.items).toHaveLength(2);
    // The blank direction is the third (index 2) and isn't listed.
    expect(opening.items.map((i) => i.index)).toEqual([0, 1]);
  });

  it("are ticked on the stage direction itself, saving the section", () => {
    writeScript();
    const hook = sectionOf("hook");
    expect(setScriptItemFound(db, hook, 1, true)).toBe(true);
    expect(groups()[1].items.map((i) => i.found)).toEqual([true, true]);

    setScriptItemFound(db, hook, 0, false);
    const content = listSections(db, projectId).find(
      (s) => s.id === hook,
    )?.content;
    const nodes = parseDoc(content ?? "").content?.[0].content ?? [];
    // Unticking removes the attribute; the other direction keeps its tick.
    expect(nodes[0].attrs).toEqual({ description: "wolf eye close-up" });
    expect(nodes[2].attrs).toEqual({
      description: "wolf eye close-up",
      found: true,
    });
  });

  it("report a direction that's gone", () => {
    writeScript();
    expect(setScriptItemFound(db, sectionOf("hook"), 5, true)).toBe(false);
    expect(setScriptItemFound(db, "nope", 0, true)).toBe(false);
  });

  it("keep the word count when ticked", () => {
    writeScript();
    const opening = sectionOf("opening_story");
    const before = listSections(db, projectId).find(
      (s) => s.id === opening,
    )?.wordCount;
    setScriptItemFound(db, opening, 0, true);
    expect(
      listSections(db, projectId).find((s) => s.id === opening)?.wordCount,
    ).toBe(before);
  });
});

describe("withDirectionFound", () => {
  it("keeps the rest of the document as it was", () => {
    const original = parseDoc(
      doc(para(text("a"), dir("one")), para(dir("two"))),
    );
    const next = withDirectionFound(original, 1, true);
    expect(next).toEqual(
      parseDoc(doc(para(text("a"), dir("one")), para(dir("two", true)))),
    );
    expect(original).toEqual(
      parseDoc(doc(para(text("a"), dir("one")), para(dir("two")))),
    );
  });
});

describe("extra items", () => {
  it("are added in order, edited and deleted", () => {
    const a = addBrollItem(db, projectId, " drone shot of a fjord ");
    const b = addBrollItem(db, projectId, "ambient choir");
    expect(addBrollItem(db, projectId, "  ")).toBeUndefined();
    editBrollItem(db, b?.id ?? "", "ambient choir for the outro");
    editBrollItem(db, a?.id ?? "", "   ");
    expect(listBrollItems(db, projectId).map((i) => i.text)).toEqual([
      "drone shot of a fjord",
      "ambient choir for the outro",
    ]);
    deleteBrollItem(db, a?.id ?? "");
    expect(listBrollItems(db, projectId).map((i) => i.text)).toEqual([
      "ambient choir for the outro",
    ]);
  });

  it("are ticked in their own table", () => {
    const a = addBrollItem(db, projectId, "drone shot");
    setBrollItemFound(db, a?.id ?? "", true);
    expect(listBrollItems(db, projectId)[0].found).toBe(true);
  });
});

describe("progress and copy", () => {
  it("count found items across script and extra items", () => {
    writeScript();
    setScriptItemFound(db, sectionOf("opening_story"), 0, true);
    const extra = addBrollItem(db, projectId, "drone shot of a fjord");
    setBrollItemFound(db, extra?.id ?? "", true);
    addBrollItem(db, projectId, "ambient choir");
    expect(brollProgress(groups(), listBrollItems(db, projectId))).toEqual({
      found: 3,
      total: 7,
    });
  });

  it("copy plain lines with the entry or Extra in front", () => {
    writeScript();
    addBrollItem(db, projectId, "drone shot of a fjord");
    expect(brollCopyText(groups(), listBrollItems(db, projectId))).toBe(
      [
        "Opening story sketch: longship on a stormy sea",
        "Opening story sketch: old woman by a fire",
        "Hook: wolf eye close-up",
        "Hook: wolf eye close-up",
        "Main part · Signs of the end: brothers fighting",
        "Extra: drone shot of a fjord",
      ].join("\n"),
    );
  });
});
