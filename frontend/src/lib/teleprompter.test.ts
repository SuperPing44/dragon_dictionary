import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  advance,
  canPrompt,
  MAX_FRAME_MS,
  type PromptSection,
  pixelsPerSecond,
  prompterEntries,
  startEntryId,
} from "./teleprompter";
import { renderEntry } from "./teleprompter-render";

const text = (t: string) =>
  JSON.stringify({
    type: "doc",
    content: [{ type: "paragraph", content: [{ type: "text", text: t }] }],
  });
const EMPTY = JSON.stringify({ type: "doc", content: [{ type: "paragraph" }] });
const directionOnly = JSON.stringify({
  type: "doc",
  content: [
    {
      type: "paragraph",
      content: [{ type: "stageDirection", attrs: { description: "a map" } }],
    },
  ],
});

const section = (
  id: string,
  content: string,
  extra: Partial<PromptSection> = {},
): PromptSection => ({
  id,
  kind: null,
  title: null,
  parent: null,
  content,
  ...extra,
});

// Script order: top-level sections, each followed by its subsections.
const script: PromptSection[] = [
  section("hook", text("Wolves."), { kind: "hook" }),
  section("intro", EMPTY, { kind: "intro" }),
  section("main", EMPTY, { kind: "main" }),
  section("sub1", text("Signs."), {
    parent: "main",
    title: "Signs of the end",
  }),
  section("sub2", directionOnly, { parent: "main", title: "" }),
  section("outro", EMPTY, { kind: "outro" }),
];

describe("prompterEntries", () => {
  it("keeps script order and skips empty entries entirely", () => {
    expect(prompterEntries(script).map((e) => e.id)).toEqual([
      "hook",
      "sub1",
      "sub2",
    ]);
  });

  it("labels sections by kind and subsections as 'Main part · <title>'", () => {
    expect(prompterEntries(script).map((e) => e.label)).toEqual([
      "Hook",
      "Main part · Signs of the end",
      "Main part · Untitled",
    ]);
  });
});

describe("startEntryId", () => {
  it("starts at the selected entry when it has text", () => {
    expect(startEntryId(script, "sub1")).toBe("sub1");
  });

  it("starts at the next entry with text when the selected one is empty", () => {
    expect(startEntryId(script, "intro")).toBe("sub1");
    expect(startEntryId(script, "main")).toBe("sub1");
  });

  it("falls back to the last entry with text before an empty tail", () => {
    expect(startEntryId(script, "outro")).toBe("sub2");
  });

  it("starts at the top for an unknown or missing entry", () => {
    expect(startEntryId(script, "nope")).toBe("hook");
    expect(startEntryId(script, undefined)).toBe("hook");
  });

  it("has no start in an empty script", () => {
    expect(startEntryId([section("a", EMPTY)], "a")).toBeUndefined();
  });
});

describe("canPrompt", () => {
  it("is false only when the whole script is empty", () => {
    expect(canPrompt(script)).toBe(true);
    expect(canPrompt([section("a", EMPTY), section("b", "not json")])).toBe(
      false,
    );
    expect(canPrompt([section("a", directionOnly)])).toBe(true);
  });
});

describe("pixelsPerSecond", () => {
  it("moves 3 lines per minute per speed level", () => {
    // Level 8 at 56 px: 24 lines/min × 75.6 px per line ÷ 60 s.
    expect(pixelsPerSecond(8, 56)).toBeCloseTo((24 * 56 * 1.35) / 60);
  });

  it("keeps the pace in lines when the text size changes", () => {
    const linesPerSecond = (size: number) =>
      pixelsPerSecond(10, size) / (size * 1.35);
    expect(linesPerSecond(32)).toBeCloseTo(linesPerSecond(96));
  });
});

describe("advance", () => {
  it("moves by elapsed time × speed", () => {
    expect(advance(100, 50, 60, 10_000)).toEqual({ y: 103, ended: false });
  });

  it("caps the frame delta so nothing jumps after Alt+Tab", () => {
    expect(advance(0, 5_000, 100, 10_000).y).toBe((MAX_FRAME_MS / 1000) * 100);
  });

  it("stops at the end", () => {
    expect(advance(990, 100, 200, 1_000)).toEqual({ y: 1_000, ended: true });
  });
});

describe("renderEntry", () => {
  it("renders a stage direction as an unbreakable ◆ Image pill", () => {
    const html = renderToStaticMarkup(
      renderEntry(prompterEntries(script)[2].doc),
    );
    expect(html).toContain("◆ Image: a map");
    expect(html).toContain("whitespace-nowrap");
  });

  it("renders the spoken text as paragraphs", () => {
    const html = renderToStaticMarkup(
      renderEntry(prompterEntries(script)[0].doc),
    );
    expect(html).toBe("<p>Wolves.</p>");
  });
});
