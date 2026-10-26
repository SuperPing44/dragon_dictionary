"use client";

import { startTransition, useState } from "react";
import { CategoryChip, categoryColour } from "@/components/category-chip";
import {
  CATEGORY_COLOURS,
  type Category,
  type CategoryColour,
} from "@/db/schema";

const MAX_SUGGESTIONS = 6;

export type CategoryPick =
  | { categoryId: string }
  | { name: string; colour: CategoryColour };

type CategoryPickerProps = {
  /** Accessible name of the chip list, e.g. "Categories of this idea". */
  label: string;
  assigned: Category[];
  all: Category[];
  /** The colour a new category gets unless another is picked. */
  defaultColour: CategoryColour;
  onAdd: (pick: CategoryPick) => Promise<void>;
  onRemove: (categoryId: string) => Promise<void>;
  /**
   * "panel": chips above an always-visible input (the idea panel).
   * "inline": chips in a row with a "+ category" button that opens the
   * input in place (the project header).
   */
  variant?: "panel" | "inline";
};

/**
 * Category chips plus an input that finds existing categories. Enter on a
 * new name opens the palette with the default colour selected; Enter again
 * creates the category and adds it.
 */
export function CategoryPicker({
  label,
  assigned,
  all,
  defaultColour,
  onAdd,
  onRemove,
  variant = "panel",
}: CategoryPickerProps) {
  const inline = variant === "inline";
  const [open, setOpen] = useState(!inline);
  const [text, setText] = useState("");
  const [highlight, setHighlight] = useState(-1);
  const [creating, setCreating] = useState<{
    name: string;
    colour: CategoryColour;
  } | null>(null);

  const query = text.trim().toLowerCase();
  const assignedIds = new Set(assigned.map((c) => c.id));
  const suggestions = query
    ? all
        .filter(
          (c) => !assignedIds.has(c.id) && c.name.toLowerCase().includes(query),
        )
        .slice(0, MAX_SUGGESTIONS)
    : [];

  function reset() {
    setText("");
    setHighlight(-1);
    setCreating(null);
  }

  function close() {
    reset();
    if (inline) setOpen(false);
  }

  function add(pick: CategoryPick) {
    reset();
    startTransition(() => onAdd(pick));
  }

  function enter() {
    if (creating) return add(creating);
    if (highlight >= 0 && suggestions[highlight]) {
      return add({ categoryId: suggestions[highlight].id });
    }
    const existing = all.find((c) => c.name.toLowerCase() === query);
    if (existing) {
      return assignedIds.has(existing.id)
        ? reset()
        : add({ categoryId: existing.id });
    }
    if (query) setCreating({ name: text.trim(), colour: defaultColour });
  }

  function shiftColour(step: number) {
    if (!creating) return;
    const n = CATEGORY_COLOURS.length;
    const i = CATEGORY_COLOURS.indexOf(creating.colour);
    setCreating({ ...creating, colour: CATEGORY_COLOURS[(i + step + n) % n] });
  }

  function keyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    const keys: Record<string, () => void> = {
      Enter: enter,
      Escape: () => (creating ? setCreating(null) : text ? reset() : close()),
      ArrowDown: () =>
        setHighlight((h) => Math.min(h + 1, suggestions.length - 1)),
      ArrowUp: () => setHighlight((h) => Math.max(h - 1, -1)),
      ...(creating && {
        ArrowRight: () => shiftColour(1),
        ArrowLeft: () => shiftColour(-1),
      }),
    };
    const handler = keys[event.key];
    if (!handler) return;
    event.preventDefault();
    handler();
  }

  const chips = assigned.map((c) => (
    <li key={c.id}>
      <CategoryChip name={c.name} colour={c.colour}>
        <button
          type="button"
          aria-label={`Remove ${c.name}`}
          onClick={() => startTransition(() => onRemove(c.id))}
          className="-mr-1 ml-0.5 text-fg-muted leading-none hover:text-fg"
        >
          ×
        </button>
      </CategoryChip>
    </li>
  ));

  const popover = (
    <>
      {suggestions.length > 0 && !creating && (
        <div className="absolute top-full left-0 z-20 mt-1 flex w-full min-w-64 flex-col gap-0.5 rounded-xl border border-border-strong bg-surface-3 p-1.5 shadow-[0_8px_24px_rgb(0_0_0/0.5)]">
          {suggestions.map((c, i) => (
            <button
              key={c.id}
              type="button"
              tabIndex={-1}
              onMouseDown={(e) => {
                e.preventDefault();
                add({ categoryId: c.id });
              }}
              className={`rounded-lg px-2 py-1.5 text-left ${
                i === highlight ? "bg-surface-2" : "hover:bg-surface-2"
              }`}
            >
              <CategoryChip name={c.name} colour={c.colour} />
            </button>
          ))}
        </div>
      )}
      {creating && (
        <div
          className={`flex flex-col gap-2.5 rounded-xl border border-border-strong bg-surface-3 p-3 shadow-[0_8px_24px_rgb(0_0_0/0.5)] ${
            inline ? "absolute top-full left-0 z-20 mt-1 w-72" : ""
          }`}
        >
          <p className="font-label text-fg-muted text-xs">
            Create “{creating.name}” — pick a colour, Enter to confirm
          </p>
          <fieldset className="flex flex-wrap gap-1.5">
            <legend className="sr-only">Colour for {creating.name}</legend>
            {CATEGORY_COLOURS.map((colour) => {
              const selected = colour === creating.colour;
              return (
                <button
                  key={colour}
                  type="button"
                  aria-label={colour}
                  aria-pressed={selected}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setCreating({ ...creating, colour })}
                  style={{ backgroundColor: categoryColour(colour) }}
                  className={`size-[18px] rounded-full transition-shadow ${
                    selected
                      ? "shadow-[0_0_0_2px_var(--color-surface-3),0_0_0_4px_var(--color-fg)]"
                      : "hover:shadow-[0_0_0_2px_var(--color-surface-3),0_0_0_3px_var(--color-fg-faint)]"
                  }`}
                />
              );
            })}
          </fieldset>
        </div>
      )}
    </>
  );

  const input = (
    <input
      value={text}
      onChange={(e) => {
        setText(e.target.value);
        setHighlight(-1);
        setCreating(null);
      }}
      onKeyDown={keyDown}
      onBlur={() => {
        if (inline && !text.trim()) close();
      }}
      // biome-ignore lint/a11y/noAutofocus: opened on purpose by "+ category"
      autoFocus={inline}
      aria-label="Add a category"
      placeholder={inline ? "Category name" : "+ category"}
      className={
        inline
          ? "w-48 rounded-lg border border-accent bg-surface-2 px-2.5 py-1 font-label text-fg text-xs outline-none placeholder:text-fg-faint"
          : "w-full rounded-[10px] border border-border-strong bg-surface-2 px-3.5 py-2.5 text-[17px] text-fg outline-none transition-shadow placeholder:text-fg-faint focus:border-accent focus:shadow-[0_0_12px_rgb(158_107_255/0.35)]"
      }
    />
  );

  if (inline) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        {assigned.length > 0 && (
          <ul aria-label={label} className="flex flex-wrap items-center gap-2">
            {chips}
          </ul>
        )}
        {open ? (
          <div className="relative">
            {input}
            {popover}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="font-label font-medium text-fg-faint text-xs hover:text-fg-muted"
          >
            + category
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {assigned.length > 0 && (
        <ul aria-label={label} className="flex flex-wrap gap-1.5">
          {chips}
        </ul>
      )}
      <div className="relative">
        {open && input}
        {popover}
      </div>
    </div>
  );
}
