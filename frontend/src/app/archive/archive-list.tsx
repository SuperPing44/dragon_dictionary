"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { CategoryFilter } from "@/components/category-filter";
import { PageHeader } from "@/components/page-header";
import { TitleSearch } from "@/components/title-search";
import type { VideoProjectWithCategories } from "@/db/projects";
import type { Category } from "@/db/schema";
import {
  type ArchiveFilter,
  archiveYears,
  isArchiveFiltering,
  matchesArchiveFilter,
  NO_ARCHIVE_FILTER,
} from "@/lib/archive";
import { archiveCountLine, filterCountLine } from "@/lib/format";
import { ArchiveRow } from "./archive-row";

type ArchiveListProps = {
  title: string;
  projects: VideoProjectWithCategories[];
  /** Every category, for the filter. */
  categories: Category[];
  /** Words per minute for the estimated length. */
  rate: number;
};

/**
 * The Archive's header with its filters and the rows (spec §5.4, Figma
 * A1). The filters live here, so they reset when you leave the screen.
 */
export function ArchiveList({
  title,
  projects,
  categories,
  rate,
}: ArchiveListProps) {
  const [filter, setFilter] = useState<ArchiveFilter>(NO_ARCHIVE_FILTER);

  // Next keeps a left route's state for going back, so clear the filter
  // whenever the Archive is hidden.
  useEffect(() => () => setFilter(NO_ARCHIVE_FILTER), []);

  const filtering = isArchiveFiltering(filter);
  const shown = projects.filter((p) => matchesArchiveFilter(p, filter));
  const years = archiveYears(projects);

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeader
          title={title}
          subtitle={
            filtering ? (
              <>
                {filterCountLine(shown.length, projects.length)} ·{" "}
                <button
                  type="button"
                  onClick={() => setFilter(NO_ARCHIVE_FILTER)}
                  className="text-accent-glow not-italic hover:underline"
                >
                  Clear filters
                </button>
              </>
            ) : (
              archiveCountLine(projects.length)
            )
          }
        />
        <div className="flex items-center gap-3 pt-2">
          <TitleSearch
            value={filter.query}
            onChange={(query) => setFilter({ ...filter, query })}
          />
          {categories.length > 0 && (
            <CategoryFilter
              categories={categories}
              picked={filter.cats}
              onChange={(cats) => setFilter({ ...filter, cats })}
              hint="A video shows if it has any picked category"
              emptyLabel="All categories"
            />
          )}
          {years.length > 0 && (
            <YearFilter
              years={years}
              year={filter.year}
              onChange={(year) => setFilter({ ...filter, year })}
            />
          )}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2">
        <div
          aria-hidden
          className="flex items-center gap-5 px-3 font-label font-semibold text-[11px] text-fg-muted uppercase tracking-[1.1px]"
        >
          <span className="w-24 shrink-0" />
          <span className="flex-1">Video</span>
          <span className="w-32 shrink-0">Published</span>
          <span className="w-20 shrink-0">Length</span>
          <span className="w-52 shrink-0">YouTube</span>
        </div>
        {shown.length === 0 ? (
          <p className="px-3 py-6 text-[17px] text-fg-muted italic">
            No published videos match these filters.
          </p>
        ) : (
          <ul className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
            {shown.map((project) => (
              <ArchiveRow key={project.id} project={project} rate={rate} />
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

/** The year filter: only years that have published videos. */
function YearFilter({
  years,
  year,
  onChange,
}: {
  years: number[];
  year: number | null;
  onChange: (year: number | null) => void;
}) {
  return (
    <label
      className={`relative flex items-center gap-2.5 rounded-xl border bg-surface-2 py-[9px] pr-9 pl-3.5 font-label text-[14px] focus-within:border-accent ${
        year === null
          ? "border-border-strong text-fg-muted"
          : "border-accent text-fg"
      }`}
    >
      <Image src="/design/icon-clock-small.svg" alt="" width={14} height={14} />
      <select
        value={year ?? ""}
        onChange={(e) =>
          onChange(e.target.value === "" ? null : Number(e.target.value))
        }
        aria-label="Publish year"
        className="cursor-pointer appearance-none bg-transparent outline-none [color-scheme:dark]"
      >
        <option value="">All years</option>
        {years.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>
      <Image
        src="/design/icon-chevron.svg"
        alt=""
        width={14}
        height={14}
        className="pointer-events-none absolute right-3.5"
      />
    </label>
  );
}
