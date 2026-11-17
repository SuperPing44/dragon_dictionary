import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  advance,
  canPrompt,
  isValidSpeedLevel,
  isValidTextSize,
  jumpTarget,
  type KeyInput,
  keyAction,
  MAX_FRAME_MS,
  type PromptSection,
  pixelsPerSecond,
  prompterEntries,
  startEntryId,
  stepSpeedLevel,
  stepTextSize,
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

  it("renders bold, italic and underline", () => {
    const html = renderToStaticMarkup(
      renderEntry({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              { type: "text", text: "Never", marks: [{ type: "bold" }] },
              { type: "text", text: " " },
              { type: "text", text: "ever", marks: [{ type: "italic" }] },
              { type: "text", text: " " },
              { type: "text", text: "again", marks: [{ type: "underline" }] },
            ],
          },
        ],
      }),
    );
    expect(html).toBe(
      "<p><strong>Never</strong> <em>ever</em> <u>again</u></p>",
    );
  });
});

describe("speed and size", () => {
  it("accepts levels 1–20 and sizes 32–96 px in steps of 4", () => {
    expect([1, 8, 20].every(isValidSpeedLevel)).toBe(true);
    expect([0, 21, 1.5].some(isValidSpeedLevel)).toBe(false);
    expect([32, 56, 96].every(isValidTextSize)).toBe(true);
    expect([28, 100, 58].some(isValidTextSize)).toBe(false);
  });

  it("steps one level or 4 px at a time and stops at the limits", () => {
    expect(stepSpeedLevel(8, 1)).toBe(9);
    expect(stepSpeedLevel(20, 1)).toBe(20);
    expect(stepSpeedLevel(1, -1)).toBe(1);
    expect(stepTextSize(56, 1)).toBe(60);
    expect(stepTextSize(96, 1)).toBe(96);
    expect(stepTextSize(32, -1)).toBe(32);
  });
});

const key = (input: Partial<KeyInput>): KeyInput => ({
  code: "",
  key: "",
  repeat: false,
  isComposing: false,
  ctrlKey: false,
  metaKey: false,
  altKey: false,
  ...input,
});

describe("keyAction", () => {
  it.each([
    [{ code: "Space", key: " " }, "toggle"],
    [{ code: "ArrowUp", key: "ArrowUp" }, "faster"],
    [{ code: "ArrowDown", key: "ArrowDown" }, "slower"],
    [{ code: "ArrowLeft", key: "ArrowLeft" }, "previous"],
    [{ code: "ArrowRight", key: "ArrowRight" }, "next"],
    [{ code: "Home", key: "Home" }, "top"],
    [{ code: "Escape", key: "Escape" }, "leave"],
    [{ code: "KeyF", key: "f" }, "fullscreen"],
  ] as const)("maps %o by code to %s", (input, action) => {
    expect(keyAction(key(input))).toBe(action);
  });

  it("matches + and − on the character, wherever the layout puts them", () => {
    // German layout: + has its own key (code BracketRight), − is Slash.
    expect(keyAction(key({ code: "BracketRight", key: "+" }))).toBe("bigger");
    expect(keyAction(key({ code: "Slash", key: "-" }))).toBe("smaller");
    // US layout: Shift+= gives +; the numpad keys work too.
    expect(keyAction(key({ code: "Equal", key: "+" }))).toBe("bigger");
    expect(keyAction(key({ code: "NumpadSubtract", key: "-" }))).toBe(
      "smaller",
    );
    expect(keyAction(key({ code: "Equal", key: "=" }))).toBeNull();
  });

  it("shows the key hint on ?", () => {
    expect(keyAction(key({ code: "Minus", key: "?" }))).toBe("hints");
  });

  it("repeats speed and size while held, but not play/pause or jumps", () => {
    expect(keyAction(key({ code: "ArrowUp", repeat: true }))).toBe("faster");
    expect(keyAction(key({ code: "Slash", key: "-", repeat: true }))).toBe(
      "smaller",
    );
    expect(keyAction(key({ code: "Space", repeat: true }))).toBe("none");
    expect(keyAction(key({ code: "ArrowRight", repeat: true }))).toBe("none");
  });

  it("ignores IME composition and modifier combinations", () => {
    expect(keyAction(key({ code: "Space", isComposing: true }))).toBeNull();
    expect(keyAction(key({ code: "ArrowUp", ctrlKey: true }))).toBeNull();
    expect(keyAction(key({ code: "Home", altKey: true }))).toBeNull();
    expect(keyAction(key({ code: "Space", metaKey: true }))).toBeNull();
    expect(keyAction(key({ code: "KeyX", key: "x" }))).toBeNull();
  });
});

describe("jumpTarget", () => {
  // Entry tops in px; empty entries aren't rendered, so never in the list.
  const tops = [0, 400, 1200];

  it("goes to the next entry's start", () => {
    expect(jumpTarget(tops, 0, 1)).toBe(400);
    expect(jumpTarget(tops, 650, 1)).toBe(1200);
  });

  it("goes to the start of the entry before the current position", () => {
    expect(jumpTarget(tops, 650, -1)).toBe(400);
    expect(jumpTarget(tops, 400, -1)).toBe(0);
  });

  it("stays put past either end", () => {
    expect(jumpTarget(tops, 1200, 1)).toBeUndefined();
    expect(jumpTarget(tops, 0, -1)).toBeUndefined();
  });
});
