"use client";

import Image from "next/image";
import Link from "next/link";
import {
  startTransition,
  useEffect,
  useOptimistic,
  useRef,
  useState,
} from "react";
import { categoryColour } from "@/components/category-chip";
import { PageHeader } from "@/components/page-header";
import type { VideoProjectWithCategories } from "@/db/projects";
import type { Category } from "@/db/schema";
import {
  applyBoardMove,
  type BoardFilter,
  type BoardMove,
  type BoardStage,
  boardColumns,
  isFiltering,
  matchesBoardFilter,
  NO_FILTER,
  placeAmongVisible,
} from "@/lib/board";
import { boardCountLine, filterCountLine, speakingTime } from "@/lib/format";
import { STAGE_LABELS } from "@/lib/labels";
import { moveCardAction } from "./actions";

type BoardViewProps = {
  title: string;
  projects: VideoProjectWithCategories[];
  /** Every category, for the filter. */
  categories: Category[];
  /** Words per minute for the estimated length. */
  rate: number;
};

/** Where a dragged card would go: a column, and a card to go before. */
type DropTarget = { stage: BoardStage; beforeId: string | null };

/**
 * The board (spec §5.3, Figma K1–K3): its header with the filter, and the
 * columns. Cards are dragged between columns to change the stage, landing
 * on top, or within a column to reorder it. Moves show at once and save
 * immediately.
 */
export function BoardView({
  title,
  projects,
  categories,
  rate,
}: BoardViewProps) {
  const [shown, move] = useOptimistic(
    projects,
    (current: VideoProjectWithCategories[], m: BoardMove) =>
      applyBoardMove(current, m),
  );
  const [dragging, setDragging] = useState<VideoProjectWithCategories | null>(
    null,
  );
  const [over, setOver] = useState<DropTarget | null>(null);
  const [filter, setFilter] = useState<BoardFilter>(NO_FILTER);

  // The filter resets when you leave the screen. Next keeps a left route's
  // state for going back, so clear it whenever the board is hidden.
  useEffect(() => () => setFilter(NO_FILTER), []);

  const filtering = isFiltering(filter);
  const visible = shown.filter((p) => matchesBoardFilter(p, filter));

  function drop(target: DropTarget) {
    const card = dragging;
    setDragging(null);
    setOver(null);
    if (!card) return;
    if (card.stage === target.stage && target.beforeId === card.id) return;
    // Within a column, the card is placed relative to the cards you can see.
    const ids = (list: VideoProjectWithCategories[]) =>
      list.filter((p) => p.stage === target.stage).map((p) => p.id);
    const beforeId =
      card.stage === target.stage
        ? placeAmongVisible(ids(shown), ids(visible), card.id, target.beforeId)
        : null;
    const m: BoardMove = { id: card.id, stage: target.stage, beforeId };
    startTransition(async () => {
      move(m);
      await moveCardAction(m);
    });
  }

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeader
          title={title}
          subtitle={
            filtering ? (
              <>
                {filterCountLine(visible.length, shown.length)} ·{" "}
                <button
                  type="button"
                  onClick={() => setFilter(NO_FILTER)}
                  className="text-accent-glow not-italic hover:underline"
                >
                  Clear filters
                </button>
              </>
            ) : (
              boardCountLine(shown.length)
            )
          }
        />
        <div className="flex items-center gap-3 pt-2">
          <label className="flex w-[240px] items-center gap-2.5 rounded-xl border border-border-strong bg-surface-2 px-3.5 py-[9px] focus-within:border-accent">
            <Image
              src="/design/icon-search.svg"
              alt=""
              width={18}
              height={18}
            />
            <input
              type="search"
              value={filter.query}
              onChange={(e) => setFilter({ ...filter, query: e.target.value })}
              placeholder="Search titles…"
              aria-label="Search titles"
              className="min-w-0 flex-1 bg-transparent text-[15px] text-fg outline-none placeholder:text-fg-faint"
            />
          </label>
          {categories.length > 0 && (
            <CategoryFilter
              categories={categories}
              picked={filter.cats}
              onChange={(cats) => setFilter({ ...filter, cats })}
            />
          )}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 gap-3">
        {boardColumns(visible).map((column) => {
          const isTarget = dragging !== null && over?.stage === column.stage;
          const arriving = isTarget && dragging.stage !== column.stage;
          const label = STAGE_LABELS[column.stage];
          return (
            <section
              key={column.stage}
              aria-label={label}
              onDragOver={(e) => {
                if (!dragging) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                // Over the column's empty space: the end of the column.
                if (
                  over?.stage !== column.stage ||
                  e.target === e.currentTarget
                ) {
                  setOver({ stage: column.stage, beforeId: null });
                }
              }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                  setOver((o) => (o?.stage === column.stage ? null : o));
                }
              }}
              onDrop={(e) => {
                e.preventDefault();
                if (over?.stage === column.stage) drop(over);
              }}
              className={`flex min-w-0 flex-1 flex-col gap-2.5 rounded-[18px] border p-2.5 transition-colors ${
                isTarget
                  ? "border-accent bg-accent/5 shadow-[0_0_16px_rgb(157_107_255/0.25)]"
                  : "border-border-soft bg-surface-1"
              }`}
            >
              <h2 className="flex items-baseline gap-2 px-1.5 pt-1">
                <span className="font-label font-semibold text-[11px] text-fg-muted uppercase tracking-[1.1px]">
                  {label}
                </span>
                <span className="font-label text-[12px] text-fg-faint tabular-nums">
                  {column.cards.length}
                </span>
              </h2>

              {arriving && (
                <div className="flex flex-col gap-1.5">
                  <div className="h-0.5 rounded-full bg-accent shadow-[0_0_8px_rgb(157_107_255/0.7)]" />
                  <p className="px-1 text-center font-label text-[11px] text-accent-glow">
                    Drop anywhere — it lands on top
                  </p>
                </div>
              )}

              {column.cards.length === 0 ? (
                <p className="pointer-events-none rounded-xl border border-border-strong border-dashed px-3 py-6 text-center text-[14px] text-fg-faint italic">
                  Nothing in {label}
                </p>
              ) : (
                <ul className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
                  {column.cards.map((project) => {
                    const insertBefore =
                      isTarget &&
                      !arriving &&
                      over?.beforeId === project.id &&
                      dragging.id !== project.id;
                    return (
                      <li
                        key={project.id}
                        onDragOver={(e) => {
                          if (!dragging) return;
                          e.preventDefault();
                          e.stopPropagation();
                          setOver({
                            stage: column.stage,
                            beforeId: project.id,
                          });
                        }}
                        className="flex flex-col gap-2"
                      >
                        {insertBefore && <InsertLine />}
                        <BoardCard
                          project={project}
                          rate={rate}
                          isDragging={dragging?.id === project.id}
                          onDragStart={() => setDragging(project)}
                          onDragEnd={() => {
                            setDragging(null);
                            setOver(null);
                          }}
                        />
                      </li>
                    );
                  })}
                  {isTarget && !arriving && over?.beforeId === null && (
                    <li aria-hidden>
                      <InsertLine />
                    </li>
                  )}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </>
  );
}

type CategoryFilterProps = {
  categories: Category[];
  picked: string[];
  onChange: (cats: string[]) => void;
};

/** The Categories popover: checkboxes; a card shows with any picked one. */
function CategoryFilter({ categories, picked, onChange }: CategoryFilterProps) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const chosen = categories.filter((c) => picked.includes(c.id));

  useEffect(() => {
    if (!open) return;
    const outside = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((o) => !o)}
        className={`flex max-w-[320px] items-center gap-2.5 rounded-xl border bg-surface-2 px-3.5 py-[9px] font-label text-[14px] ${
          chosen.length > 0 || open
            ? "border-accent text-fg"
            : "border-border-strong text-fg-muted hover:text-fg"
        }`}
      >
        <Image src="/design/icon-tag-small.svg" alt="" width={16} height={16} />
        {chosen.length > 0 && (
          <span aria-hidden className="flex gap-1">
            {chosen.map((c) => (
              <span
                key={c.id}
                className="size-2 rounded-full"
                style={{ backgroundColor: categoryColour(c.colour) }}
              />
            ))}
          </span>
        )}
        <span className="truncate">
          {chosen.length > 0
            ? chosen.map((c) => c.name).join(", ")
            : "Categories"}
        </span>
        <Image src="/design/icon-chevron.svg" alt="" width={14} height={14} />
      </button>
      {open && (
        <fieldset className="absolute top-full right-0 z-20 mt-2 flex max-h-[60vh] w-[250px] flex-col overflow-y-auto rounded-xl border border-border-strong bg-surface-2 p-1.5 shadow-[0_12px_32px_rgb(0_0_0/0.5)]">
          <legend className="sr-only">Filter by category</legend>
          {categories.map((c) => {
            const on = picked.includes(c.id);
            return (
              <label
                key={c.id}
                className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[14px] text-fg-muted hover:bg-surface-3 has-checked:text-fg"
              >
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() =>
                    onChange(
                      on ? picked.filter((x) => x !== c.id) : [...picked, c.id],
                    )
                  }
                  className="size-4 accent-accent"
                />
                <span
                  aria-hidden
                  className="size-2 shrink-0 rounded-full"
                  style={{ backgroundColor: categoryColour(c.colour) }}
                />
                {c.name}
              </label>
            );
          })}
          <p className="mt-1 border-border-soft border-t px-2.5 pt-1.5 pb-0.5 text-[12px] text-fg-faint italic">
            A card shows if it has any picked category
          </p>
        </fieldset>
      )}
    </div>
  );
}

function InsertLine() {
  return (
    <div className="h-0.5 rounded-full bg-accent shadow-[0_0_8px_rgb(157_107_255/0.7)]" />
  );
}

type BoardCardProps = {
  project: VideoProjectWithCategories;
  rate: number;
  isDragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
};

/** A Board card: final thumbnail if any, title, category dots, length. */
function BoardCard({
  project,
  rate,
  isDragging,
  onDragStart,
  onDragEnd,
}: BoardCardProps) {
  const sources = `${project.sourceCount} ${project.sourceCount === 1 ? "source" : "sources"}`;
  return (
    <Link
      href={`/projects/${project.id}`}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", project.id);
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      className={`flex cursor-grab flex-col gap-2 rounded-xl border border-border-soft bg-surface-2 p-2.5 transition-colors hover:border-border-strong hover:bg-surface-3 active:cursor-grabbing ${
        isDragging ? "opacity-40" : ""
      }`}
    >
      {project.finalThumbnail && (
        <div className="relative aspect-video overflow-hidden rounded-lg bg-canvas">
          <Image
            src={`/api/thumbnails/${project.finalThumbnail}`}
            alt=""
            fill
            unoptimized
            draggable={false}
            sizes="240px"
            className="object-contain"
          />
        </div>
      )}
      <p className="line-clamp-3 font-heading font-semibold text-[15px] text-fg leading-snug">
        {project.title}
      </p>
      {project.categories.length > 0 && (
        <ul
          aria-label="Categories"
          className="flex flex-wrap items-center gap-1.5"
        >
          {project.categories.map((c) => (
            <li
              key={c.id}
              title={c.name}
              aria-label={c.name}
              className="size-2.5 rounded-full"
              style={{ backgroundColor: categoryColour(c.colour) }}
            />
          ))}
        </ul>
      )}
      <p className="font-label text-[12px] text-fg-muted">
        {speakingTime(project.wordCount, rate)} · {sources}
      </p>
    </Link>
  );
}
