import { type BoardFilter, isFiltering, matchesBoardFilter } from "./board";

/** The Archive's filter (spec §5.4): the board's, plus a publish year. */
export type ArchiveFilter = BoardFilter & { year: number | null };

export const NO_ARCHIVE_FILTER: ArchiveFilter = {
  query: "",
  cats: [],
  year: null,
};

export function isArchiveFiltering(filter: ArchiveFilter): boolean {
  return isFiltering(filter) || filter.year !== null;
}

const yearOf = (publishedOn: string | null) =>
  publishedOn ? Number(publishedOn.slice(0, 4)) : null;

/** The years that have published videos, newest first. */
export function archiveYears(
  projects: { publishedOn: string | null }[],
): number[] {
  const years = new Set<number>();
  for (const p of projects) {
    const y = yearOf(p.publishedOn);
    if (y !== null) years.add(y);
  }
  return [...years].sort((a, b) => b - a);
}

/**
 * A row shows if it matches the title search and categories, as on the
 * board, and with a year picked, was published that year. Projects
 * without a date match no year.
 */
export function matchesArchiveFilter(
  project: {
    title: string;
    categories: { id: string }[];
    publishedOn: string | null;
  },
  filter: ArchiveFilter,
): boolean {
  if (!matchesBoardFilter(project, filter)) return false;
  return filter.year === null || yearOf(project.publishedOn) === filter.year;
}
