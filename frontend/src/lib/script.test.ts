import { describe, expect, it } from "vitest";
import {
  canonicalInsertIndex,
  countWords,
  type DocNode,
  hasContent,
  missingKinds,
  moveItem,
  parseDoc,
} from "./script";

const p = (...content: DocNode[]): DocNode => ({ type: "paragraph", content });
const t = (text: string): DocNode => ({ type: "text", text });
const doc = (...content: DocNode[]): DocNode => ({ type: "doc", content });
const direction: DocNode = { type: "stageDirection" };

describe("countWords", () => {
  it("counts words across paragraphs", () => {
    expect(
      countWords(doc(p(t("Before the end")), p(t("comes the winter.")))),
    ).toBe(6);
  });

  it("joins marked text inside a word", () => {
    // "Fimbul" + bold "winter" is one word.
    expect(countWords(doc(p(t("the Fimbul"), t("winter comes"))))).toBe(3);
  });

  it("ignores punctuation-only tokens", () => {
    expect(countWords(doc(p(t("Snow — and frost … again"))))).toBe(4);
  });

  it("never counts stage directions, and they separate words", () => {
    expect(countWords(doc(p(t("cruel."), direction, t("Brothers will"))))).toBe(
      3,
    );
    expect(countWords(doc(p(t("end"), direction, t("less"))))).toBe(2);
  });

  it("is zero for an empty document", () => {
    expect(countWords(doc(p()))).toBe(0);
    expect(countWords({ type: "doc" })).toBe(0);
  });
});

describe("hasContent", () => {
  it("is true for text or a stage direction alone", () => {
    expect(hasContent(doc(p(t("word"))))).toBe(true);
    expect(hasContent(doc(p(direction)))).toBe(true);
    expect(hasContent(doc(p(t("  "))))).toBe(false);
  });
});

describe("parseDoc", () => {
  it("reads JSON and treats junk as empty", () => {
    expect(parseDoc('{"type":"doc","content":[]}')).toEqual({
      type: "doc",
      content: [],
    });
    expect(parseDoc("not json")).toEqual({ type: "doc" });
  });
});

describe("canonicalInsertIndex", () => {
  it("goes after the nearest preceding kind that exists", () => {
    expect(canonicalInsertIndex(["hook", "main", "outro"], "intro")).toBe(1);
    expect(
      canonicalInsertIndex(["opening_story", "hook", "intro", "main"], "outro"),
    ).toBe(4);
  });

  it("skips missing kinds when looking back", () => {
    expect(canonicalInsertIndex(["opening_story", "outro"], "main")).toBe(1);
  });

  it("goes to the top with nothing before it", () => {
    expect(canonicalInsertIndex(["main", "outro"], "hook")).toBe(0);
    expect(canonicalInsertIndex([], "intro")).toBe(0);
  });

  it("follows the current order, not the canonical one", () => {
    // The hook was dragged to the end; the intro still follows the hook.
    expect(canonicalInsertIndex(["main", "outro", "hook"], "intro")).toBe(3);
  });
});

describe("missingKinds", () => {
  it("lists missing kinds in canonical order", () => {
    expect(missingKinds(["outro", "hook", "main"])).toEqual([
      "opening_story",
      "intro",
      "closing_story",
    ]);
  });
});

describe("moveItem", () => {
  it("moves down and up", () => {
    expect(moveItem(["a", "b", "c", "d"], 0, 2)).toEqual(["b", "c", "a", "d"]);
    expect(moveItem(["a", "b", "c", "d"], 3, 1)).toEqual(["a", "d", "b", "c"]);
    expect(moveItem(["a", "b"], 1, 1)).toEqual(["a", "b"]);
  });
});
