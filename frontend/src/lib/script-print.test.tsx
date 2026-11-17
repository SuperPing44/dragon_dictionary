import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { canPrint, type PrintSection, printEntries } from "./script-print";
import { PrintScript } from "./script-print-render";

const doc = (...content: object[]) => JSON.stringify({ type: "doc", content });
const para = (...content: object[]) => ({ type: "paragraph", content });
const text = (t: string, ...marks: string[]) => ({
  type: "text",
  text: t,
  ...(marks.length ? { marks: marks.map((type) => ({ type })) } : {}),
});
const EMPTY = doc({ type: "paragraph" });

const section = (
  id: string,
  content: string,
  extra: Partial<PrintSection> = {},
): PrintSection => ({
  id,
  kind: null,
  title: null,
  parent: null,
  content,
  ...extra,
});

// Script order: top-level sections, each followed by its subsections.
const script: PrintSection[] = [
  section("opening", EMPTY, { kind: "opening_story" }),
  section("hook", doc(para(text("Wolves."))), { kind: "hook" }),
  section("intro", EMPTY, { kind: "intro" }),
  section("main", EMPTY, { kind: "main" }),
  section("sub1", doc(para(text("Signs."))), {
    parent: "main",
    title: "Signs of the end",
  }),
  section("sub2", EMPTY, { parent: "main", title: "Empty one" }),
  section(
    "sub3",
    doc(para({ type: "stageDirection", attrs: { description: "a map" } })),
    { parent: "main", title: "" },
  ),
  section("outro", doc(para(text("Bye."))), { kind: "outro" }),
];

const render = (sections: PrintSection[], title = "Fenrir") =>
  renderToStaticMarkup(
    <PrintScript title={title} entries={printEntries(sections)} />,
  );

/** The headings' text, in document order. */
const headings = (html: string) =>
  [...html.matchAll(/<(h[123])>(.*?)<\/\1>/g)].map((m) => `${m[1]} ${m[2]}`);

describe("Script PDF layout", () => {
  it("starts with the project title", () => {
    expect(headings(render(script))[0]).toBe("h1 Fenrir");
  });

  it("puts every section with text under its heading, in outline order", () => {
    expect(headings(render(script))).toEqual([
      "h1 Fenrir",
      "h2 Hook",
      "h2 Main part",
      "h3 Signs of the end",
      "h3 Untitled",
      "h2 Outro",
    ]);
  });

  it("leaves empty sections out, but keeps the Main part over its subsections", () => {
    const html = render(script);
    expect(html).not.toContain("Opening story sketch");
    expect(html).not.toContain("Intro");
    expect(html).not.toContain("Empty one");
    // The Main part has no lead-in: just its heading.
    expect(html).toContain("<h2>Main part</h2></section>");
  });

  it("leaves the Main part out when its subsections are empty too", () => {
    const sections = script.filter((s) => s.id !== "sub1" && s.id !== "sub3");
    expect(headings(render(sections))).toEqual([
      "h1 Fenrir",
      "h2 Hook",
      "h2 Outro",
    ]);
  });

  it("renders bold, italic and underline", () => {
    const html = render([
      section(
        "hook",
        doc(
          para(
            text("Never", "bold"),
            text(" "),
            text("ever", "italic"),
            text(" "),
            text("again", "underline"),
          ),
        ),
        { kind: "hook" },
      ),
    ]);
    expect(html).toContain(
      "<p><strong>Never</strong> <em>ever</em> <u>again</u></p>",
    );
  });

  it("renders stage directions inline in grey italics as [Image: …]", () => {
    const html = render([
      section(
        "hook",
        doc(
          para(
            text("Look "),
            { type: "stageDirection", attrs: { description: "map of Asgard" } },
            text(" here."),
          ),
        ),
        { kind: "hook" },
      ),
    ]);
    expect(html).toContain(
      '<p>Look <span class="print-direction">[Image: map of Asgard]</span> here.</p>',
    );
  });

  it("shows nothing but the title, headings and text", () => {
    const html = render(script);
    expect(html).not.toMatch(/wpm|words|min|source/i);
  });
});

describe("canPrint", () => {
  it("is false for a script with no text", () => {
    expect(canPrint(script.map((s) => ({ ...s, content: EMPTY })))).toBe(false);
    expect(canPrint(script)).toBe(true);
  });
});
