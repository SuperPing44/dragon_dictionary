import { describe, expect, it } from "vitest";
import {
  editedLine,
  formatDay,
  ideaCountLine,
  numberInWords,
  projectCountLine,
  usageLine,
  usageSentence,
} from "./format";

describe("formatDay", () => {
  const now = new Date(2026, 9, 25, 15, 0);

  it("says Today for the same local day", () => {
    expect(formatDay(new Date(2026, 9, 25, 0, 5).toISOString(), now)).toBe(
      "Today",
    );
  });

  it("shows day, short month and year otherwise", () => {
    expect(formatDay(new Date(2026, 8, 7, 12).toISOString(), now)).toBe(
      "07 Sep 2026",
    );
  });
});

describe("numberInWords", () => {
  it.each([
    [0, "zero"],
    [7, "seven"],
    [13, "thirteen"],
    [20, "twenty"],
    [23, "twenty-three"],
    [99, "ninety-nine"],
    [100, "100"],
  ])("%i → %s", (n, words) => {
    expect(numberInWords(n)).toBe(words);
  });
});

describe("ideaCountLine", () => {
  it("handles none, one and many", () => {
    expect(ideaCountLine(0)).toBe("The hoard is empty");
    expect(ideaCountLine(1)).toBe("One idea sleeping in the hoard");
    expect(ideaCountLine(23)).toBe("Twenty-three ideas sleeping in the hoard");
  });
});

describe("usageLine", () => {
  it.each([
    [0, 0, "unused"],
    [1, 0, "1 idea"],
    [2, 0, "2 ideas"],
    [0, 1, "1 video project"],
    [3, 1, "3 ideas, 1 video project"],
    [5, 2, "5 ideas, 2 video projects"],
  ])("%i ideas, %i projects → %s", (ideas, projects, line) => {
    expect(usageLine(ideas, projects)).toBe(line);
  });

  it("reads as a sentence", () => {
    expect(usageSentence(7, 3)).toBe("7 ideas and 3 video projects");
    expect(usageSentence(1, 0)).toBe("1 idea");
  });
});

describe("editedLine", () => {
  const now = new Date(2026, 9, 25, 15, 0);
  const at = (d: Date) => d.toISOString();

  it("says created for an untouched project", () => {
    const t = at(new Date(2026, 9, 25, 9, 0));
    expect(editedLine(t, t, now)).toBe("created today");
    const y = at(new Date(2026, 9, 24, 23, 0));
    expect(editedLine(y, y, now)).toBe("created yesterday");
  });

  it.each([
    [new Date(2026, 9, 25, 14, 59, 40), "edited just now"],
    [new Date(2026, 9, 25, 14, 59), "edited 1 minute ago"],
    [new Date(2026, 9, 25, 14, 15), "edited 45 minutes ago"],
    [new Date(2026, 9, 25, 13, 0), "edited 2 hours ago"],
    [new Date(2026, 9, 24, 22, 0), "edited yesterday"],
    [new Date(2026, 9, 21, 12, 0), "edited 4 days ago"],
    [new Date(2026, 9, 4, 12, 0), "edited 3 weeks ago"],
    [new Date(2026, 6, 4, 12, 0), "edited on 04 Jul 2026"],
  ])("%s → %s", (updated, line) => {
    expect(editedLine(at(new Date(2026, 0, 1)), at(updated), now)).toBe(line);
  });
});

describe("projectCountLine", () => {
  it("handles none, one and many", () => {
    expect(projectCountLine(0)).toBe("No tales in the making yet");
    expect(projectCountLine(1)).toBe(
      "One tale in the making — most recently touched first",
    );
    expect(projectCountLine(5)).toBe(
      "Five tales in the making — most recently touched first",
    );
  });
});
