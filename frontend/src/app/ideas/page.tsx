import Link from "next/link";
import { Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import { type Idea, type IdeaSort, listIdeas } from "@/db";
import { formatDay, ideaCountLine } from "@/lib/format";
import { IdeaPanel } from "./idea-panel";
import { QuickCapture } from "./quick-capture";
import { type IdeaSearch, ideaHref, parseIdeaSearch } from "./search";

export default function IdeasPage({ searchParams }: PageProps<"/ideas">) {
  return (
    <>
      <PageHeader
        title="Idea List"
        subtitle={
          <Suspense>
            <IdeaCount />
          </Suspense>
        }
      />
      <QuickCapture />
      <Suspense>
        <IdeaBrowser searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function IdeaCount() {
  return ideaCountLine((await listIdeas()).length);
}

async function IdeaBrowser({
  searchParams,
}: {
  searchParams: PageProps<"/ideas">["searchParams"];
}) {
  const search = parseIdeaSearch(await searchParams);
  const ideas = await listIdeas(search.sort);
  const selected = ideas.find((idea) => idea.id === search.idea);
  const now = new Date();

  return (
    <>
      <SortToolbar search={search} />
      <div className="flex items-start gap-5">
        {ideas.length === 0 ? (
          <p className="flex-1 text-[17px] text-fg-muted italic">
            No ideas yet — capture one above.
          </p>
        ) : (
          <ul className="flex min-w-0 flex-1 flex-col gap-2.5">
            {ideas.map((idea) => (
              <IdeaRow
                key={idea.id}
                idea={idea}
                selected={idea === selected}
                href={ideaHref({ sort: search.sort, idea: idea.id })}
                now={now}
              />
            ))}
          </ul>
        )}
        {selected && (
          <IdeaPanel
            key={selected.id}
            idea={selected}
            createdLabel={formatDay(selected.created, now)}
            afterDeleteHref={ideaHref({ sort: search.sort })}
          />
        )}
      </div>
    </>
  );
}

const SORT_LABELS: Record<IdeaSort, string> = {
  rating: "Rating",
  newest: "Newest",
  title: "Title A–Z",
};

function SortToolbar({ search }: { search: IdeaSearch }) {
  return (
    <div className="flex items-center gap-3">
      <p className="font-label font-semibold text-[11px] text-fg-muted uppercase tracking-[1.1px]">
        Sort
      </p>
      <nav
        aria-label="Sort ideas"
        className="flex gap-1 rounded-xl border border-border-soft bg-surface-2 p-1"
      >
        {Object.entries(SORT_LABELS).map(([sort, label]) => {
          const active = sort === search.sort;
          return (
            <Link
              key={sort}
              href={ideaHref({ ...search, sort: sort as IdeaSort })}
              scroll={false}
              aria-current={active ? "true" : undefined}
              className={`rounded-[9px] border px-3 py-1.5 font-label font-medium text-[13px] ${
                active
                  ? "border-border-strong bg-surface-3 text-fg"
                  : "border-transparent text-fg-muted hover:text-fg"
              }`}
            >
              {label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

type IdeaRowProps = {
  idea: Idea;
  selected: boolean;
  href: string;
  now: Date;
};

function IdeaRow({ idea, selected, href, now }: IdeaRowProps) {
  return (
    <li>
      <Link
        href={href}
        scroll={false}
        aria-current={selected ? "true" : undefined}
        className={`flex items-center gap-4 rounded-2xl border px-[18px] py-3.5 transition-colors ${
          selected
            ? "border-accent bg-surface-2 shadow-[0_0_20px_rgb(158_107_255/0.22)]"
            : "border-border-soft bg-surface-1 hover:border-border-strong"
        }`}
      >
        <RatingBadge rating={idea.rating} />
        <div className="flex min-w-0 flex-1 flex-col gap-[5px]">
          <p className="truncate font-semibold text-[21px] text-fg">
            {idea.title}
          </p>
          {idea.note && (
            <p className="truncate text-[15px] text-fg-muted italic">
              {idea.note}
            </p>
          )}
          <p className="font-label text-fg-faint text-xs">
            {formatDay(idea.created, now)}
          </p>
        </div>
      </Link>
    </li>
  );
}

function RatingBadge({ rating }: { rating: number | null }) {
  const rated = rating !== null;
  return (
    <span
      role="img"
      aria-label={rated ? `Rating ${rating}` : "Unrated"}
      className={`flex size-10 shrink-0 items-center justify-center rounded-xl border-[1.2px] font-bold font-heading text-[17px] ${
        rated
          ? "border-gold bg-gold/10 text-gold"
          : "border-border-strong bg-surface-2 text-fg-faint"
      }`}
    >
      {rated ? rating : "–"}
    </span>
  );
}
