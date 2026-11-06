import { describe, expect, it } from "vitest";
import {
  archiveYears,
  isArchiveFiltering,
  matchesArchiveFilter,
  NO_ARCHIVE_FILTER,
} from "./archive";

const video = (
  title: string,
  publishedOn: string | null,
  ...cats: string[]
) => ({
  title,
  publishedOn,
  categories: cats.map((id) => ({ id })),
});

describe("archiveYears", () => {
  it("offers only years with published videos, newest first", () => {
    expect(
      archiveYears([
        video("A", "2025-09-03"),
        video("B", "2026-10-22"),
        video("C", null),
        video("D", "2026-01-01"),
        video("E", "2024-12-31"),
      ]),
    ).toEqual([2026, 2025, 2024]);
    expect(archiveYears([video("C", null)])).toEqual([]);
  });
});

describe("matchesArchiveFilter", () => {
  const year = (y: number) => ({ ...NO_ARCHIVE_FILTER, year: y });

  it("shows everything without a filter", () => {
    expect(isArchiveFiltering(NO_ARCHIVE_FILTER)).toBe(false);
    expect(matchesArchiveFilter(video("A", null), NO_ARCHIVE_FILTER)).toBe(
      true,
    );
  });

  it("matches the publish year; no date matches no year", () => {
    expect(isArchiveFiltering(year(2026))).toBe(true);
    expect(matchesArchiveFilter(video("A", "2026-10-22"), year(2026))).toBe(
      true,
    );
    expect(matchesArchiveFilter(video("A", "2025-12-31"), year(2026))).toBe(
      false,
    );
    expect(matchesArchiveFilter(video("A", null), year(2026))).toBe(false);
  });

  it("combines search, categories and year", () => {
    const f = { query: "loki", cats: ["norse", "pop"], year: 2026 };
    expect(matchesArchiveFilter(video("Loki", "2026-03-01", "pop"), f)).toBe(
      true,
    );
    expect(matchesArchiveFilter(video("Loki", "2025-03-01", "pop"), f)).toBe(
      false,
    );
    expect(matchesArchiveFilter(video("Loki", "2026-03-01", "greek"), f)).toBe(
      false,
    );
    expect(matchesArchiveFilter(video("Odin", "2026-03-01", "norse"), f)).toBe(
      false,
    );
  });
});
