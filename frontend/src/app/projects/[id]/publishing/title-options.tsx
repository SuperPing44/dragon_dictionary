"use client";

import Image from "next/image";
import { startTransition, useOptimistic, useState } from "react";
import type { TitleOption } from "@/db/schema";
import {
  finalOption,
  isDuplicateOption,
  TITLE_LIMIT,
} from "@/lib/title-options";
import {
  addTitleOptionAction,
  deleteTitleOptionAction,
  editTitleOptionAction,
  markTitleOptionFinalAction,
  reorderTitleOptionsAction,
} from "../../actions";

const DUPLICATE_HINT = "Already an option";

type TitleOptionsProps = {
  projectId: string;
  /** The project title, which is the final title. */
  title: string;
  options: TitleOption[];
};

/**
 * The Title options card (spec §5.2, Figma F1). The option matching the
 * project title is final: it shows a gold Final badge and can't be deleted.
 */
export function TitleOptions({ projectId, title, options }: TitleOptionsProps) {
  const [list, reorder] = useOptimistic(options, (current, ids: string[]) =>
    ids
      .map((id) => current.find((o) => o.id === id))
      .filter((o): o is TitleOption => o !== undefined),
  );
  const finalId = finalOption(list, title)?.id;
  const [dragging, setDragging] = useState<number | null>(null);
  const [over, setOver] = useState<number | null>(null);

  function move(from: number, to: number) {
    if (to < 0 || to >= list.length || from === to) return;
    const ids = list.map((o) => o.id);
    const [moved] = ids.splice(from, 1);
    ids.splice(to, 0, moved);
    startTransition(async () => {
      reorder(ids);
      await reorderTitleOptionsAction(projectId, ids);
    });
  }

  return (
    <section
      aria-labelledby="title-options-label"
      className="flex flex-col gap-3 rounded-[18px] border border-border-soft bg-surface-1 p-5"
    >
      <div className="flex items-baseline gap-3">
        <h2 id="title-options-label" className={LABEL}>
          Title options
        </h2>
        <span className="flex-1" />
        <span className="font-label text-[11px] text-fg-faint">
          Drag to reorder · click a title to edit
        </span>
      </div>

      <AddOption projectId={projectId} options={list} />

      <ol className="flex flex-col gap-1.5">
        {list.map((option, index) => (
          <OptionRow
            key={option.id}
            option={option}
            options={list}
            isFinal={option.id === finalId}
            isDragging={dragging === index}
            isOver={over === index && dragging !== null && dragging !== index}
            onDragStart={() => setDragging(index)}
            onDragEnd={() => {
              setDragging(null);
              setOver(null);
            }}
            onDragOver={() => dragging !== null && setOver(index)}
            onDrop={() => {
              if (dragging !== null) move(dragging, index);
              setDragging(null);
              setOver(null);
            }}
            onStep={(step) => move(index, index + step)}
          />
        ))}
      </ol>
    </section>
  );
}

function AddOption({
  projectId,
  options,
}: {
  projectId: string;
  options: TitleOption[];
}) {
  const [text, setText] = useState("");
  const [hint, setHint] = useState<string | null>(null);

  async function submit() {
    const clean = text.trim();
    if (!clean) return;
    if (isDuplicateOption(options, clean)) return setHint(DUPLICATE_HINT);
    const refused = await addTitleOptionAction(projectId, clean);
    if (refused === "duplicate") return setHint(DUPLICATE_HINT);
    setText("");
    setHint(null);
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div
        className={`flex items-center gap-2.5 rounded-[10px] border bg-surface-2 px-3.5 transition-shadow focus-within:shadow-[0_0_12px_rgb(158_107_255/0.35)] ${
          hint
            ? "border-amber"
            : "border-border-strong focus-within:border-accent"
        }`}
      >
        <Image
          src="/design/icon-plus-small.svg"
          alt=""
          width={14}
          height={14}
        />
        <input
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setHint(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void submit();
            }
          }}
          aria-label="Add a title option"
          aria-invalid={hint !== null}
          aria-describedby={hint ? "title-option-hint" : undefined}
          placeholder="Add a title idea…"
          className="min-w-0 flex-1 bg-transparent py-2.5 text-[17px] text-fg outline-none placeholder:text-fg-faint placeholder:italic"
        />
        <span className="font-label text-[11px] text-fg-faint">↵ adds</span>
      </div>
      {hint && <Hint id="title-option-hint">{hint}</Hint>}
    </div>
  );
}

type OptionRowProps = {
  option: TitleOption;
  options: TitleOption[];
  isFinal: boolean;
  isDragging: boolean;
  isOver: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDragOver: () => void;
  onDrop: () => void;
  /** Moves the row one place up (-1) or down (1). */
  onStep: (step: -1 | 1) => void;
};

function OptionRow({
  option,
  options,
  isFinal,
  isDragging,
  isOver,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  onStep,
}: OptionRowProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(option.text);
  const [hint, setHint] = useState<string | null>(null);
  const length = (editing ? draft : option.text).length;
  const hintId = `title-option-hint-${option.id}`;

  function cancel() {
    setDraft(option.text);
    setHint(null);
    setEditing(false);
  }

  async function commit() {
    const clean = draft.trim();
    if (!clean || clean === option.text) return cancel();
    if (isDuplicateOption(options, clean, option.id)) {
      return setHint(DUPLICATE_HINT);
    }
    const refused = await editTitleOptionAction(option.id, clean);
    if (refused === "duplicate") return setHint(DUPLICATE_HINT);
    setHint(null);
    setEditing(false);
  }

  return (
    <li
      onDragOver={(e) => {
        e.preventDefault();
        onDragOver();
      }}
      onDrop={(e) => {
        e.preventDefault();
        onDrop();
      }}
      className={`group flex flex-col gap-1 rounded-[10px] border px-3 py-2 ${
        isFinal
          ? "border-gold/60 bg-gold/5"
          : "border-transparent hover:border-border-soft hover:bg-surface-2"
      } ${isOver ? "outline-2 outline-accent" : ""} ${isDragging ? "opacity-50" : ""}`}
    >
      <div className="flex items-center gap-3">
        <button
          type="button"
          draggable
          aria-label={`Move “${option.text}”`}
          title="Drag to reorder, or focus and use the arrow keys"
          onDragStart={(e) => {
            e.dataTransfer.effectAllowed = "move";
            e.dataTransfer.setData("text/plain", option.id);
            onDragStart();
          }}
          onDragEnd={onDragEnd}
          onKeyDown={(e) => {
            if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
            e.preventDefault();
            onStep(e.key === "ArrowUp" ? -1 : 1);
          }}
          className="shrink-0 cursor-grab rounded p-0.5 focus-visible:outline-1 focus-visible:outline-accent active:cursor-grabbing"
        >
          <Image src="/design/icon-grip.svg" alt="" width={14} height={14} />
        </button>

        {editing ? (
          <input
            // biome-ignore lint/a11y/noAutofocus: opened by a click on the text
            autoFocus
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              setHint(null);
            }}
            onBlur={() => void commit()}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void commit();
              }
              if (e.key === "Escape") cancel();
            }}
            aria-label="Title option"
            aria-invalid={hint !== null}
            aria-describedby={hint ? hintId : undefined}
            className={`min-w-0 flex-1 rounded-md border bg-surface-2 px-2 py-0.5 font-heading font-semibold text-[16px] text-fg outline-none ${
              hint ? "border-amber" : "border-accent"
            }`}
          />
        ) : (
          <button
            type="button"
            onClick={() => {
              setDraft(option.text);
              setEditing(true);
            }}
            title="Click to edit"
            className="min-w-0 flex-1 cursor-text text-left font-heading font-semibold text-[16px] text-fg leading-snug"
          >
            {option.text}
          </button>
        )}

        <span
          className={`shrink-0 font-label text-[12px] tabular-nums ${
            length > TITLE_LIMIT ? "text-amber" : "text-fg-faint"
          }`}
        >
          {length}/{TITLE_LIMIT}
        </span>

        {isFinal ? (
          <span className="flex shrink-0 items-center gap-1 rounded-md border border-gold/50 bg-gold/10 px-2 py-0.5 font-bold font-label text-[11px] text-gold uppercase tracking-[1px]">
            <span aria-hidden>✦</span> Final
          </span>
        ) : (
          <span className="flex shrink-0 items-center gap-2.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
            <button
              type="button"
              onClick={() =>
                startTransition(() => markTitleOptionFinalAction(option.id))
              }
              className="font-label font-medium text-[13px] text-accent-glow hover:underline"
            >
              Mark as final
            </button>
            <button
              type="button"
              aria-label={`Delete “${option.text}”`}
              onClick={() =>
                startTransition(() => deleteTitleOptionAction(option.id))
              }
              className="rounded p-0.5 hover:bg-surface-3"
            >
              <Image src="/design/icon-x.svg" alt="" width={14} height={14} />
            </button>
          </span>
        )}
      </div>
      {hint && (
        <Hint id={hintId} className="pl-8">
          {hint}
        </Hint>
      )}
    </li>
  );
}

function Hint({
  id,
  className = "",
  children,
}: {
  id: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <output
      id={id}
      className={`flex items-center gap-1.5 font-label text-[13px] text-amber ${className}`}
    >
      <Image src="/design/icon-alert-amber.svg" alt="" width={14} height={14} />
      {children}
    </output>
  );
}

const LABEL =
  "font-label font-semibold text-[11px] text-fg-muted uppercase tracking-[1.1px]";
