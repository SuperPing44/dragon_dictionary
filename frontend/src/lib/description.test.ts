import { describe, expect, it } from "vitest";
import { descriptionCopyText } from "./description";

const sources = [
  { title: "The Poetic Edda, Völuspá", link: "https://example.org/voluspa" },
  { title: "A book with no link", link: null },
  { title: "Gylfaginning", link: "https://example.org/gylfaginning" },
];
const footer =
  "Forest Dragon\nSubscribe: https://www.youtube.com/@ForestDragon";

describe("descriptionCopyText", () => {
  it("joins text, sources and footer with one blank line between", () => {
    expect(
      descriptionCopyText({
        text: "Three winters without a summer.\n\n00:00 Fimbulwinter",
        sources,
        footer,
      }),
    ).toBe(
      [
        "Three winters without a summer.",
        "",
        "00:00 Fimbulwinter",
        "",
        "Sources:",
        "The Poetic Edda, Völuspá – https://example.org/voluspa",
        "Gylfaginning – https://example.org/gylfaginning",
        "",
        "Forest Dragon",
        "Subscribe: https://www.youtube.com/@ForestDragon",
      ].join("\n"),
    );
  });

  it("skips empty text", () => {
    expect(descriptionCopyText({ text: "  \n ", sources, footer })).toBe(
      [
        "Sources:",
        "The Poetic Edda, Völuspá – https://example.org/voluspa",
        "Gylfaginning – https://example.org/gylfaginning",
        "",
        "Forest Dragon",
        "Subscribe: https://www.youtube.com/@ForestDragon",
      ].join("\n"),
    );
  });

  it("leaves out the Sources heading when no linked source has a link", () => {
    expect(
      descriptionCopyText({
        text: "Intro.",
        sources: [{ title: "No link", link: null }],
        footer,
      }),
    ).toBe(`Intro.\n\n${footer}`);
    expect(descriptionCopyText({ text: "Intro.", sources: [], footer })).toBe(
      `Intro.\n\n${footer}`,
    );
  });

  it("skips an empty footer", () => {
    expect(
      descriptionCopyText({ text: "Intro.", sources: [], footer: "\n  " }),
    ).toBe("Intro.");
  });

  it("never doubles blank lines around the parts", () => {
    expect(
      descriptionCopyText({
        text: "\n\nIntro.\n\n\n",
        sources: [],
        footer: "\nFooter\n",
      }),
    ).toBe("Intro.\n\nFooter");
  });

  it("is empty when every part is", () => {
    expect(descriptionCopyText({ text: "", sources: [], footer: "" })).toBe("");
  });
});
