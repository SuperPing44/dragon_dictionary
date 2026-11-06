import { describe, expect, it } from "vitest";
import {
  backupAge,
  backupWhen,
  boardCountLine,
  formatBytes,
  formatDay,
  ideaCountLine,
  numberInWords,
  speakingTime,
  usageLine,
  usageSentence,
  wordsLine,
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

describe("boardCountLine", () => {
  it("counts the projects in production", () => {
    expect(boardCountLine(0)).toBe(
      "0 in production · new projects come from the idea list",
    );
    expect(boardCountLine(10)).toBe(
      "10 in production · new projects come from the idea list",
    );
  });
});

describe("speakingTime", () => {
  it.each([
    [0, 150, "≈ 0:00"],
    [150, 150, "≈ 1:00"],
    [2180, 150, "≈ 14:30"], // 872 s → nearest 5 s is 870 s
    [462, 150, "≈ 3:05"], // 184.8 s → 185 s
    [6, 150, "≈ 0:00"], // 2.4 s → 0 s
    [7, 150, "≈ 0:05"], // 2.8 s → 5 s
    [9000, 150, "≈ 1:00:00"],
    [9500, 150, "≈ 1:03:20"],
    [8990, 150, "≈ 59:55"], // 3596 s → 3595 s, still under an hour
    [300, 300, "≈ 1:00"],
    [300, 60, "≈ 5:00"],
  ])("%i words at %i wpm → %s", (words, rate, time) => {
    expect(speakingTime(words, rate)).toBe(time);
  });
});

describe("wordsLine", () => {
  it("pluralises and groups thousands", () => {
    expect(wordsLine(1)).toBe("1 word");
    expect(wordsLine(2180)).toBe("2,180 words");
  });
});

describe("formatBytes", () => {
  it.each([
    [512, "512 B"],
    [860_000, "860 KB"],
    [2_400_000, "2.4 MB"],
    [48_600_000, "49 MB"],
  ])("%i → %s", (bytes, text) => {
    expect(formatBytes(bytes)).toBe(text);
  });
});

describe("backupWhen", () => {
  const now = new Date(2026, 9, 26, 15, 0);
  it.each([
    [new Date(2026, 9, 26, 9, 12), "Today, 09:12"],
    [new Date(2026, 9, 25, 18, 40), "Yesterday, 18:40"],
    [new Date(2026, 9, 21, 9, 5), "21 Oct 2026, 09:05"],
  ])("%s → %s", (date, text) => {
    expect(backupWhen(date.toISOString(), now)).toBe(text);
  });
});

describe("backupAge", () => {
  const now = new Date(2026, 9, 26, 15, 0);
  it.each([
    [new Date(2026, 9, 26, 14, 30), "less than an hour ago"],
    [new Date(2026, 9, 26, 10, 0), "5 hours ago"],
    [new Date(2026, 9, 25, 14, 0), "1 day ago"],
    [new Date(2026, 9, 23, 9, 0), "3 days ago"],
  ])("%s → %s", (date, text) => {
    expect(backupAge(date.toISOString(), now)).toBe(text);
  });
});
