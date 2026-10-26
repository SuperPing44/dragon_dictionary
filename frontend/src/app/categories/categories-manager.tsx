"use client";

import Image from "next/image";
import { startTransition, useRef, useState } from "react";
import { categoryColour } from "@/components/category-chip";
import { PageHeader } from "@/components/page-header";
import type { CategoryWithUsage } from "@/db/categories";
import {
  CATEGORY_COLOURS,
  type Category,
  type CategoryColour,
} from "@/db/schema";
import { usageLine, usageSentence } from "@/lib/format";
import {
  addCategory,
  mergeCategoryAction,
  recolourCategory,
  removeCategoryAction,
  renameCategoryAction,
} from "./actions";

type CategoriesManagerProps = {
  categories: CategoryWithUsage[];
  /** The colour a new category gets unless another is picked. */
  defaultColour: CategoryColour;
};

type Merge = { from: CategoryWithUsage; name: string; into: Category };

export function CategoriesManager({
  categories,
  defaultColour,
}: CategoriesManagerProps) {
  const newNameRef = useRef<HTMLInputElement>(null);
  const renameRef = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(
    null,
  );
  const [recolouring, setRecolouring] = useState<string | null>(null);
  const [merge, setMerge] = useState<Merge | null>(null);
  const [deleting, setDeleting] = useState<CategoryWithUsage | null>(null);

  function startRename(c: CategoryWithUsage) {
    setEditing({ id: c.id, name: c.name });
    setRecolouring(null);
    setMerge(null);
  }

  async function commitRename() {
    if (!editing) return;
    const current = categories.find((c) => c.id === editing.id);
    const name = editing.name.trim();
    if (!current || !name || name === current.name) {
      setEditing(null);
      setMerge(null);
      return;
    }
    const result = await renameCategoryAction(editing.id, name);
    if (result.ok) {
      setEditing(null);
      setMerge(null);
    } else {
      setMerge({ from: current, name, into: result.conflict });
    }
  }

  function confirmMerge() {
    if (!merge) return;
    const { from, into } = merge;
    setMerge(null);
    setEditing(null);
    startTransition(() => mergeCategoryAction(from.id, into.id));
  }

  function keepEditing() {
    setMerge(null);
    renameRef.current?.focus();
  }

  function confirmDelete() {
    if (!deleting) return;
    const { id } = deleting;
    setDeleting(null);
    startTransition(() => removeCategoryAction(id));
  }

  return (
    <>
      <div className="flex items-center gap-3">
        <PageHeader
          title="Categories"
          subtitle="One shared list for ideas and video projects"
        />
        <span className="flex-1" />
        <button
          type="button"
          onClick={() => newNameRef.current?.focus()}
          className={`${BUTTON} ${PRIMARY}`}
        >
          + New category
        </button>
      </div>

      <div className="flex items-start gap-5">
        <div className="min-w-0 flex-1 overflow-hidden rounded-[18px] border border-border-soft bg-surface-1">
          <div className="flex items-center gap-4 bg-surface-2 px-[22px] py-3.5 font-label font-semibold text-[11px] text-fg-muted uppercase tracking-[1.1px]">
            <p className="w-[360px] shrink-0">Name (A–Z)</p>
            <p className="flex-1">Used by</p>
            <p>Actions</p>
          </div>
          {categories.length === 0 && (
            <p className="border-border-soft border-t px-[22px] py-3.5 text-[16px] text-fg-muted italic">
              No categories yet — create one on the right.
            </p>
          )}
          <ul>
            {categories.map((c) => {
              const isEditing = editing?.id === c.id;
              return (
                <li
                  key={c.id}
                  className={`border-border-soft border-t ${isEditing ? "bg-surface-2" : ""}`}
                >
                  <div className="flex items-center gap-4 px-[22px] py-3.5">
                    <div className="flex w-[360px] shrink-0 items-center gap-3">
                      <span
                        aria-hidden
                        className="size-[22px] shrink-0 rounded-full"
                        style={{ backgroundColor: categoryColour(c.colour) }}
                      />
                      {isEditing ? (
                        <input
                          ref={renameRef}
                          value={editing.name}
                          onChange={(e) =>
                            setEditing({ id: c.id, name: e.target.value })
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") commitRename();
                            if (e.key === "Escape") {
                              setEditing(null);
                              setMerge(null);
                            }
                          }}
                          onBlur={() => {
                            if (!merge) commitRename();
                          }}
                          aria-label={`New name for ${c.name}`}
                          // biome-ignore lint/a11y/noAutofocus: rename starts typing straight away
                          autoFocus
                          className="min-w-0 flex-1 rounded-lg border border-accent bg-surface-3 px-2.5 py-1 font-semibold text-[19px] text-fg shadow-[0_0_10px_rgb(158_107_255/0.3)] outline-none"
                        />
                      ) : (
                        <p className="truncate font-semibold text-[19px] text-fg">
                          {c.name}
                        </p>
                      )}
                    </div>
                    <p
                      className={`flex-1 text-[16px] ${
                        c.ideas + c.videoProjects === 0
                          ? "text-fg-faint italic"
                          : "text-fg-muted"
                      }`}
                    >
                      {usageLine(c.ideas, c.videoProjects)}
                    </p>
                    <div className="flex items-center gap-3.5">
                      <IconButton
                        icon="/design/icon-pen.svg"
                        label={`Rename ${c.name}`}
                        onClick={() => startRename(c)}
                      />
                      <IconButton
                        icon="/design/icon-tag-small.svg"
                        label={`Change colour of ${c.name}`}
                        pressed={recolouring === c.id}
                        onClick={() =>
                          setRecolouring(recolouring === c.id ? null : c.id)
                        }
                      />
                      <IconButton
                        icon="/design/icon-trash.svg"
                        label={`Delete ${c.name}`}
                        onClick={() => setDeleting(c)}
                      />
                    </div>
                  </div>
                  {recolouring === c.id && (
                    <div className="px-[22px] pb-3.5 pl-[56px]">
                      <Palette
                        label={`Colour for ${c.name}`}
                        value={c.colour}
                        size="small"
                        onPick={(colour) => {
                          setRecolouring(null);
                          startTransition(() => recolourCategory(c.id, colour));
                        }}
                      />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>

        <div className="flex w-[380px] shrink-0 flex-col gap-5">
          <NewCategoryCard
            key={`${defaultColour}-${categories.length}`}
            inputRef={newNameRef}
            categories={categories}
            defaultColour={defaultColour}
          />

          {merge && (
            <section
              aria-label="Merge categories"
              className="flex flex-col gap-3 rounded-[18px] border border-gold bg-surface-2 p-5"
            >
              <div className="flex items-center gap-2">
                <Image
                  src="/design/icon-alert.svg"
                  alt=""
                  width={18}
                  height={18}
                />
                <h2 className="font-bold font-heading text-[17px] text-gold">
                  Merge categories?
                </h2>
              </div>
              <p className="text-[16px] text-fg leading-[21px]">
                “{merge.name}” matches an existing category, “{merge.into.name}
                ”. Merge them? Items that had both keep one.
              </p>
              <div className="flex gap-2.5">
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={confirmMerge}
                  className={`${BUTTON} ${PRIMARY}`}
                >
                  Merge
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={keepEditing}
                  className={`${BUTTON} text-accent-glow`}
                >
                  Keep editing
                </button>
              </div>
            </section>
          )}

          {deleting && (
            <section
              aria-label="Delete category"
              className="flex flex-col gap-2.5 rounded-[18px] border border-danger bg-surface-1 p-5"
            >
              <h2 className="font-bold font-heading text-[17px] text-danger">
                Delete “{deleting.name}”?
              </h2>
              <p className="text-[16px] text-fg-muted leading-[21px]">
                {deleting.ideas + deleting.videoProjects === 0
                  ? "It isn’t used anywhere."
                  : `It is used by ${usageSentence(deleting.ideas, deleting.videoProjects)}. It will be removed from all of them; they keep everything else.`}
              </p>
              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={confirmDelete}
                  className={`${BUTTON} bg-danger text-canvas`}
                >
                  Delete
                </button>
                <button
                  type="button"
                  onClick={() => setDeleting(null)}
                  className={`${BUTTON} text-accent-glow`}
                >
                  Cancel
                </button>
              </div>
            </section>
          )}
        </div>
      </div>
    </>
  );
}

const BUTTON =
  "rounded-xl px-[18px] py-2.5 font-bold font-heading text-[13px] tracking-[0.78px]";
const PRIMARY =
  "bg-accent text-canvas shadow-[0_4px_9px_rgb(157_107_255/0.45)] disabled:opacity-50";
const LABEL =
  "font-label font-semibold text-[11px] text-fg-muted uppercase tracking-[1.1px]";

function IconButton({
  icon,
  label,
  pressed,
  onClick,
}: {
  icon: string;
  label: string;
  pressed?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      onClick={onClick}
      className="rounded-md p-0.5 opacity-80 hover:bg-surface-3 hover:opacity-100 aria-pressed:bg-surface-3 aria-pressed:opacity-100"
    >
      <Image src={icon} alt="" width={18} height={18} />
    </button>
  );
}

function Palette({
  label,
  value,
  size,
  onPick,
}: {
  label: string;
  value: CategoryColour;
  size: "small" | "large";
  onPick: (colour: CategoryColour) => void;
}) {
  return (
    <fieldset
      className={`flex flex-wrap ${size === "large" ? "gap-2.5" : "gap-2"}`}
    >
      <legend className="sr-only">{label}</legend>
      {CATEGORY_COLOURS.map((colour) => (
        <button
          key={colour}
          type="button"
          aria-label={colour}
          aria-pressed={colour === value}
          onClick={() => onPick(colour)}
          style={{ backgroundColor: categoryColour(colour) }}
          className={`rounded-full transition-shadow ${
            size === "large" ? "size-[30px]" : "size-[22px]"
          } ${
            colour === value
              ? "shadow-[0_0_0_2px_var(--color-surface-1),0_0_0_4px_var(--color-fg)]"
              : "hover:shadow-[0_0_0_2px_var(--color-surface-1),0_0_0_3px_var(--color-fg-faint)]"
          }`}
        />
      ))}
    </fieldset>
  );
}

function NewCategoryCard({
  inputRef,
  categories,
  defaultColour,
}: {
  inputRef: React.RefObject<HTMLInputElement | null>;
  categories: Category[];
  defaultColour: CategoryColour;
}) {
  const [name, setName] = useState("");
  const [colour, setColour] = useState(defaultColour);
  const trimmed = name.trim();
  const taken = categories.find(
    (c) => c.name.toLowerCase() === trimmed.toLowerCase(),
  );

  function create(event: React.FormEvent) {
    event.preventDefault();
    if (!trimmed || taken) return;
    setName("");
    startTransition(() => addCategory(trimmed, colour));
  }

  return (
    <form
      onSubmit={create}
      aria-label="New category"
      className="flex flex-col gap-3.5 rounded-[18px] border border-border-soft bg-surface-1 p-5"
    >
      <div className="flex items-center gap-2">
        <Image src="/design/icon-plus.svg" alt="" width={16} height={16} />
        <h2 className="font-bold font-heading text-[17px] text-fg">
          New category
        </h2>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="new-category-name" className={LABEL}>
          Name
        </label>
        <input
          id="new-category-name"
          ref={inputRef}
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="off"
          aria-invalid={Boolean(taken)}
          className="w-full rounded-[10px] border border-border-strong bg-surface-2 px-3.5 py-2.5 text-[17px] text-fg outline-none transition-shadow focus:border-accent focus:shadow-[0_0_12px_rgb(158_107_255/0.35)]"
        />
        {taken && (
          <p className="text-[14px] text-danger italic">
            “{taken.name}” already exists.
          </p>
        )}
      </div>
      <p className={LABEL}>Colour</p>
      <Palette
        label="Colour for the new category"
        value={colour}
        size="large"
        onPick={setColour}
      />
      <p className="text-[14px] text-fg-faint italic">
        Next unused colour is picked for you. Colours may repeat.
      </p>
      <button
        type="submit"
        disabled={!trimmed || Boolean(taken)}
        className={`${BUTTON} ${PRIMARY} w-full`}
      >
        Create category
      </button>
    </form>
  );
}
