import { describe, expect, it } from "vitest";
import {
  formatDay,
  ideaCountLine,
  numberInWords,
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
