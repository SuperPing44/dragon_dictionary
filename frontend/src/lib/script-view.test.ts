import { describe, expect, it } from "vitest";
import {
  entryAfterSwitch,
  entryAtTop,
  isScriptView,
  teleprompterEntry,
} from "./script-view";
import { type PromptSection, startEntryId } from "./teleprompter";

describe("isScriptView", () => {
  it("knows the two views", () => {
    expect(isScriptView("sections")).toBe(true);
    expect(isScriptView("full")).toBe(true);
    expect(isScriptView("pages")).toBe(false);
    expect(isScriptView(undefined)).toBe(false);
  });
});

describe("entryAtTop", () => {
  // Headings' tops, with the sticky header ending at 120 px.
  const tops = [
    { id: "hook", top: -900 },
    { id: "intro", top: -200 },
    { id: "main", top: 300 },
  ];

  it("is the last entry whose heading has scrolled up to the header", () => {
    expect(entryAtTop(tops, 120)).toBe("intro");
  });

  it("counts a heading sitting right at the header", () => {
    expect(entryAtTop(tops, 300)).toBe("main");
    expect(entryAtTop(tops, 299.5)).toBe("main");
  });

  it("is the first entry before any heading has reached the header", () => {
    expect(entryAtTop([{ id: "hook", top: 400 }], 120)).toBe("hook");
  });

  it("is nothing without entries", () => {
    expect(entryAtTop([], 120)).toBeUndefined();
  });
});

describe("switching views keeps the place", () => {
  it("Sections → Full script goes to the entry that was selected", () => {
    expect(
      entryAfterSwitch("full", {
        selectedId: "intro",
        cursorId: "outro",
        topId: "hook",
      }),
    ).toBe("intro");
  });

  it("Full script → Sections selects the entry with the cursor", () => {
    expect(
      entryAfterSwitch("sections", {
        selectedId: "hook",
        cursorId: "sub1",
        topId: "intro",
      }),
    ).toBe("sub1");
  });

  it("Full script → Sections without a cursor selects the entry at the top", () => {
    expect(
      entryAfterSwitch("sections", {
        selectedId: "hook",
        cursorId: undefined,
        topId: "main",
      }),
    ).toBe("main");
  });
});

describe("teleprompter start in Full script", () => {
  const text = (t: string) =>
    JSON.stringify({
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: t }] }],
    });
  const EMPTY = JSON.stringify({
    type: "doc",
    content: [{ type: "paragraph" }],
  });
  const section = (id: string, content: string): PromptSection => ({
    id,
    kind: null,
    title: null,
    parent: null,
    content,
  });
  const script = [
    section("hook", EMPTY),
    section("intro", text("Wolves.")),
    section("main", text("Signs.")),
  ];
  const start = (view: "sections" | "full", cursorId?: string) =>
    startEntryId(
      script,
      teleprompterEntry(view, { selectedId: "hook", cursorId }),
    );

  it("starts at the entry with the cursor", () => {
    expect(start("full", "main")).toBe("main");
  });

  it("starts at the first entry (with text) when the cursor isn't in the text", () => {
    expect(start("full")).toBe("intro");
    expect(
      teleprompterEntry("full", { selectedId: "main", cursorId: undefined }),
    ).toBeUndefined();
  });

  it("still starts at the selected entry in Sections", () => {
    expect(
      teleprompterEntry("sections", { selectedId: "main", cursorId: "intro" }),
    ).toBe("main");
  });
});
