"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { categoryColour } from "@/components/category-chip";
import type { Category } from "@/db/schema";

export type CategoryFilterProps = {
  categories: Category[];
  picked: string[];
  onChange: (cats: string[]) => void;
  /** The note under the list, e.g. "A card shows if it has any picked category". */
  hint: string;
  /** The button text with nothing picked. */
  emptyLabel?: string;
};

/**
 * The Categories popover of the board and the Archive: checkboxes; an item
 * shows if it has any picked category.
 */
export function CategoryFilter({
  categories,
  picked,
  onChange,
  hint,
  emptyLabel = "Categories",
}: CategoryFilterProps) {
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
            : emptyLabel}
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
            {hint}
          </p>
        </fieldset>
      )}
    </div>
  );
}
