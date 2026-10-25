"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import type { Idea } from "@/db/schema";
import { removeIdea, saveIdea } from "./actions";

const SAVE_DELAY_MS = 1000;
const RATINGS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

type IdeaPanelProps = {
  idea: Idea;
  createdLabel: string;
  /** Where to go once the idea is deleted. */
  afterDeleteHref: string;
};

export function IdeaPanel({
  idea,
  createdLabel,
  afterDeleteHref,
}: IdeaPanelProps) {
  const router = useRouter();
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  async function deleteNow() {
    await removeIdea(idea.id);
    router.replace(afterDeleteHref, { scroll: false });
  }

  return (
    <aside
      aria-label="Idea details"
      className="sticky top-0 flex w-[380px] shrink-0 flex-col gap-3.5 self-start rounded-[18px] border border-border-soft bg-surface-1 p-[22px]"
    >
      <div className="flex items-center gap-2">
        <Image
          src="/design/icon-sparkle-panel.svg"
          alt=""
          width={16}
          height={16}
        />
        <p className={LABEL}>Idea · created {createdLabel}</p>
      </div>

      <AutosaveField
        label="Title"
        saved={idea.title}
        required
        onSave={(title) => saveIdea(idea.id, { title })}
      />
      <AutosaveField
        label="Note"
        saved={idea.note ?? ""}
        multiline
        onSave={(note) => saveIdea(idea.id, { note })}
      />

      <div className="flex items-center">
        <p className={LABEL}>Rating</p>
        <span className="flex-1" />
        {idea.rating !== null && (
          <button
            type="button"
            onClick={() => saveIdea(idea.id, { rating: null })}
            className="font-label font-medium text-accent-glow text-xs hover:underline"
          >
            Clear
          </button>
        )}
      </div>
      <fieldset className="flex gap-1">
        <legend className="sr-only">Rating</legend>
        {RATINGS.map((n) => {
          const selected = idea.rating === n;
          return (
            <button
              key={n}
              type="button"
              aria-pressed={selected}
              onClick={() => saveIdea(idea.id, { rating: n })}
              className={`flex h-8 flex-1 items-center justify-center rounded-lg border font-label font-semibold text-[13px] transition-colors ${
                selected
                  ? "border-gold bg-gold text-canvas shadow-[0_0_12px_rgb(232_196_107/0.45)]"
                  : "border-border-strong bg-surface-2 text-fg-muted hover:border-gold/60 hover:text-fg"
              }`}
            >
              {n}
            </button>
          );
        })}
      </fieldset>

      <div className="mt-4 flex items-center justify-end gap-2.5">
        {confirmingDelete ? (
          <>
            <p className="flex-1 text-[15px] text-fg-muted italic">
              Delete this idea for good?
            </p>
            <button
              type="button"
              onClick={() => setConfirmingDelete(false)}
              className={`${BUTTON} border border-border-strong bg-surface-3 text-accent-glow`}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={deleteNow}
              className={`${BUTTON} bg-danger text-canvas`}
            >
              Delete
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmingDelete(true)}
            className={`${BUTTON} text-danger hover:bg-danger/10`}
          >
            Delete
          </button>
        )}
      </div>
    </aside>
  );
}

const LABEL =
  "font-label font-semibold text-[11px] text-fg-muted uppercase tracking-[1.1px]";
const BUTTON =
  "rounded-xl px-[18px] py-2.5 font-bold font-heading text-[13px] tracking-[0.78px]";

type AutosaveFieldProps = {
  label: string;
  saved: string;
  required?: boolean;
  multiline?: boolean;
  onSave: (value: string) => Promise<void>;
};

/**
 * A text field that saves about a second after typing stops, and at once on
 * blur. A required field never saves blank; leaving it blank restores the
 * last saved value.
 */
function AutosaveField({
  label,
  saved,
  required,
  multiline,
  onSave,
}: AutosaveFieldProps) {
  const id = useId();
  const [value, setValue] = useState(saved);
  const lastSaved = useRef(saved);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  function save(next: string) {
    clearTimeout(timer.current);
    if (next === lastSaved.current) return;
    if (required && !next.trim()) return;
    lastSaved.current = next;
    void onSave(next);
  }

  function change(next: string) {
    setValue(next);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => save(next), SAVE_DELAY_MS);
  }

  function blur() {
    save(value);
    if (required && !value.trim()) setValue(lastSaved.current);
  }

  const box =
    "w-full rounded-[10px] border border-border-strong bg-surface-2 px-3.5 py-2.5 text-[17px] text-fg outline-none transition-shadow focus:border-accent focus:shadow-[0_0_12px_rgb(158_107_255/0.35)]";

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className={LABEL}>
        {label}
      </label>
      {multiline ? (
        <textarea
          id={id}
          value={value}
          onChange={(e) => change(e.target.value)}
          onBlur={blur}
          rows={2}
          className={`${box} field-sizing-content resize-none`}
        />
      ) : (
        <input
          id={id}
          value={value}
          onChange={(e) => change(e.target.value)}
          onBlur={blur}
          aria-invalid={required && !value.trim()}
          className={box}
        />
      )}
    </div>
  );
}
