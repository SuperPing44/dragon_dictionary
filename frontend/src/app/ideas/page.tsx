import Link from "next/link";
import { Suspense } from "react";
import { CategoryChip } from "@/components/category-chip";
import { PageHeader } from "@/components/page-header";
import {
  type Category,
  type Idea,
  type IdeaSort,
  listCategories,
  listIdeas,
  listIdeasWithCategories,
  nextCategoryColour,
} from "@/db";
import { formatDay, ideaCountLine } from "@/lib/format";
import { IdeaPanel } from "./idea-panel";
import { QuickCapture } from "./quick-capture";
import {
  type IdeaSearch,
  ideaHref,
  parseIdeaSearch,
  toggleCat,
} from "./search";

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
  const categories = await listCategories();
  // Ignore filter entries for categories that no longer exist.
  const cats = search.cats.filter((id) => categories.some((c) => c.id === id));
  const ideas = await listIdeasWithCategories(search.sort, cats);
  const selected = ideas.find((idea) => idea.id === search.idea);
  const now = new Date();

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <SortToolbar search={search} />
        {categories.length > 0 && (
          <>
            <span aria-hidden className="h-6 w-px bg-border-strong" />
            <CategoryFilter
              search={{ ...search, cats }}
              categories={categories}
            />
          </>
        )}
      </div>
      <div className="flex items-start gap-5">
        {ideas.length === 0 ? (
          <p className="flex-1 text-[17px] text-fg-muted italic">
            {cats.length > 0
              ? "No ideas in these categories."
              : "No ideas yet — capture one above."}
          </p>
        ) : (
          <ul className="flex min-w-0 flex-1 flex-col gap-2.5">
            {ideas.map((idea) => (
              <IdeaRow
                key={idea.id}
                idea={idea}
                selected={idea === selected}
                href={ideaHref({ ...search, cats, idea: idea.id })}
                now={now}
              />
            ))}
          </ul>
        )}
        {selected && (
          <IdeaPanel
            key={selected.id}
            idea={selected}
            allCategories={categories}
            defaultColour={await nextCategoryColour()}
            createdLabel={formatDay(selected.created, now)}
            afterDeleteHref={ideaHref({ ...search, cats, idea: undefined })}
          />
        )}
      </div>
    </>
  );
}

const LABEL =
  "font-label font-semibold text-[11px] text-fg-muted uppercase tracking-[1.1px]";

const SORT_LABELS: Record<IdeaSort, string> = {
  rating: "Rating",
  newest: "Newest",
  title: "Title A–Z",
};

function SortToolbar({ search }: { search: IdeaSearch }) {
  return (
    <>
      <p className={LABEL}>Sort</p>
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
    </>
  );
}

/** Toggle chips; with any switched on, the others are dimmed. */
function CategoryFilter({
  search,
  categories,
}: {
  search: IdeaSearch;
  categories: Category[];
}) {
  const filtering = search.cats.length > 0;
  return (
    <>
      <p className={LABEL}>Filter</p>
      <nav aria-label="Filter by category" className="flex flex-wrap gap-2">
        {categories.map((c) => {
          const on = search.cats.includes(c.id);
          return (
            <Link
              key={c.id}
              href={ideaHref({ ...search, cats: toggleCat(search.cats, c.id) })}
              scroll={false}
              aria-pressed={on}
              className="rounded-full"
            >
              <CategoryChip
                name={c.name}
                colour={c.colour}
                dimmed={filtering && !on}
              />
            </Link>
          );
        })}
      </nav>
      {filtering && (
        <Link
          href={ideaHref({ ...search, cats: [] })}
          scroll={false}
          className="font-label font-medium text-[13px] text-accent-glow hover:underline"
        >
          Clear
        </Link>
      )}
    </>
  );
}

type IdeaRowProps = {
  idea: Idea & { categories: Category[] };
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
          <div className="flex flex-wrap items-center gap-2">
            {idea.categories.map((c) => (
              <CategoryChip key={c.id} name={c.name} colour={c.colour} />
            ))}
            <p className="font-label text-fg-faint text-xs">
              {idea.categories.length > 0 && "· "}
              {formatDay(idea.created, now)}
            </p>
          </div>
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
