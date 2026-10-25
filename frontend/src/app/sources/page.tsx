import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import {
  listSources,
  SOURCE_SORTS,
  SOURCE_TYPES,
  type SourceSort,
  type SourceType,
} from "@/db";
import { sourceCountLine } from "@/lib/format";
import { SOURCE_TYPE_SHORT } from "@/lib/sources";
import { SearchBox } from "./search-box";

const HEAD =
  "font-label font-semibold text-[11px] text-fg-muted uppercase tracking-[1.1px]";

type Params = Record<string, string | string[] | undefined>;
type LibrarySearch = { q?: string; type?: SourceType; sort: SourceSort };

const first = (v: string | string[] | undefined) =>
  Array.isArray(v) ? v[0] : v;

function parseSearch(params: Params): LibrarySearch {
  const type = first(params.type);
  const sort = first(params.sort);
  return {
    q: first(params.q)?.trim() || undefined,
    type: SOURCE_TYPES.includes(type as SourceType)
      ? (type as SourceType)
      : undefined,
    sort: SOURCE_SORTS.includes(sort as SourceSort)
      ? (sort as SourceSort)
      : "title",
  };
}

function libraryHref({ q, type, sort }: LibrarySearch): string {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (type) params.set("type", type);
  if (sort !== "title") params.set("sort", sort);
  const query = params.toString();
  return query ? `/sources?${query}` : "/sources";
}

export default function SourcesPage({ searchParams }: PageProps<"/sources">) {
  return (
    <>
      <div className="flex items-center gap-3">
        <PageHeader
          title="Source Library"
          subtitle={
            <Suspense>
              <SourceCount />
            </Suspense>
          }
        />
        <span className="flex-1" />
        <Link
          href="/sources/new"
          className="rounded-xl bg-accent px-[18px] py-2.5 font-bold font-heading text-[13px] text-canvas tracking-[0.78px] shadow-[0_4px_9px_rgb(157_107_255/0.45)]"
        >
          + New source
        </Link>
      </div>
      <Suspense>
        <Library searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function SourceCount() {
  return sourceCountLine((await listSources()).length);
}

async function Library({
  searchParams,
}: {
  searchParams: PageProps<"/sources">["searchParams"];
}) {
  const search = parseSearch(await searchParams);
  const sources = await listSources({
    search: search.q,
    type: search.type,
    sort: search.sort,
  });
  const filtered = Boolean(search.q || search.type);

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <SearchBox />
        <p className={HEAD}>Type</p>
        <Segmented
          label="Filter by type"
          options={[
            {
              label: "All",
              href: libraryHref({ ...search, type: undefined }),
              active: !search.type,
            },
            ...SOURCE_TYPES.map((type) => ({
              label: SOURCE_TYPE_SHORT[type],
              href: libraryHref({ ...search, type }),
              active: search.type === type,
            })),
          ]}
        />
        <span className="flex-1" />
        <p className={HEAD}>Sort</p>
        <Segmented
          label="Sort sources"
          options={[
            {
              label: "Title",
              href: libraryHref({ ...search, sort: "title" }),
              active: search.sort === "title",
            },
            {
              label: "Newest",
              href: libraryHref({ ...search, sort: "newest" }),
              active: search.sort === "newest",
            },
          ]}
        />
      </div>

      {sources.length === 0 ? (
        <p className="text-[17px] text-fg-muted italic">
          {filtered
            ? "No sources match."
            : "No sources yet — add one with + New source."}
        </p>
      ) : (
        <div className="overflow-hidden rounded-[18px] border border-border-soft bg-surface-1">
          <div className="flex items-center gap-4 bg-surface-2 px-[22px] py-[13px]">
            <p className={`${HEAD} w-[150px]`}>Type</p>
            <p className={`${HEAD} flex-1`}>Title</p>
            <p className={`${HEAD} w-[260px]`}>Author</p>
            <p className={`${HEAD} w-[110px]`}>Projects</p>
          </div>
          <ul>
            {sources.map((s) => (
              <li key={s.id} className="border-border-soft border-t">
                <Link
                  href={`/sources/${s.id}`}
                  className="flex items-center gap-4 px-[22px] py-3 hover:bg-surface-2"
                >
                  <span className="flex w-[150px] items-center gap-2 font-label font-medium text-fg-muted text-xs">
                    <span className="rounded-lg bg-surface-3 p-1.5">
                      <Image
                        src={`/design/type-${s.type}.svg`}
                        alt=""
                        width={15}
                        height={15}
                      />
                    </span>
                    {SOURCE_TYPE_SHORT[s.type]}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-semibold text-[18px] text-fg">
                    {s.title}
                  </span>
                  <span className="w-[260px] truncate text-[16px] text-fg-muted">
                    {s.author ?? "—"}
                  </span>
                  <span
                    className={`w-[110px] font-label font-medium text-[13px] ${
                      s.projects ? "text-fg" : "text-fg-faint"
                    }`}
                  >
                    {s.projects || "none yet"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}

function Segmented({
  label,
  options,
}: {
  label: string;
  options: { label: string; href: string; active: boolean }[];
}) {
  return (
    <nav
      aria-label={label}
      className="flex gap-1 rounded-xl border border-border-soft bg-surface-2 p-1"
    >
      {options.map((o) => (
        <Link
          key={o.label}
          href={o.href}
          scroll={false}
          aria-current={o.active ? "true" : undefined}
          className={`rounded-[9px] border px-3 py-1.5 font-label font-medium text-[13px] ${
            o.active
              ? "border-border-strong bg-surface-3 text-fg"
              : "border-transparent text-fg-muted hover:text-fg"
          }`}
        >
          {o.label}
        </Link>
      ))}
    </nav>
  );
}
