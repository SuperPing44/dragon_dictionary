import { describe, expect, it } from "vitest";
import { formatDay, ideaCountLine, numberInWords } from "./format";

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
