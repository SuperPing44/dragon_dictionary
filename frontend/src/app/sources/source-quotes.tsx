"use client";

import Image from "next/image";
import { startTransition, useState } from "react";
import type { Quote } from "@/db/schema";
import { removeQuoteAction, saveQuoteAction } from "./actions";

type SourceQuotesProps = {
  sourceId: string;
  quotes: Quote[];
};

/** A source's quotes: click one to edit it; "+ Add quote" adds one. */
export function SourceQuotes({ sourceId, quotes }: SourceQuotesProps) {
  // "new" while adding, a quote's ID while editing it.
  const [editing, setEditing] = useState<string | null>(null);

  return (
    <section
      aria-label="Quotes"
      className="flex flex-col gap-2.5 rounded-[18px] border border-border-soft bg-surface-1 p-5"
    >
      <div className="flex items-center gap-2">
        <Image src="/design/icon-quote.svg" alt="" width={18} height={18} />
        <h2 className="font-bold font-heading text-[17px] text-fg">Quotes</h2>
        <span className="flex-1" />
        {editing !== "new" && (
          <button
            type="button"
            onClick={() => setEditing("new")}
            className="font-label font-medium text-[13px] text-accent-glow hover:underline"
          >
            + Add quote
          </button>
        )}
      </div>

      {quotes.length === 0 && editing !== "new" && (
        <p className="text-[15px] text-fg-muted italic">No quotes yet.</p>
      )}
      <ul className="flex flex-col gap-2.5">
        {quotes.map((q) =>
          editing === q.id ? (
            <li key={q.id}>
              <QuoteEditor
                sourceId={sourceId}
                quote={q}
                onDone={() => setEditing(null)}
              />
            </li>
          ) : (
            <li key={q.id}>
              <button
                type="button"
                onClick={() => setEditing(q.id)}
                aria-label={`Edit quote: ${q.text}`}
                className="flex w-full flex-col gap-1.5 rounded-[10px] border-gold border-l-2 bg-surface-2 px-3.5 py-2.5 text-left hover:bg-surface-3"
              >
                <span className="whitespace-pre-wrap text-[16px] text-fg italic leading-[21px]">
                  “{q.text}”
                </span>
                {q.location && (
                  <span className="font-label font-medium text-[11px] text-gold">
                    {q.location}
                  </span>
                )}
              </button>
            </li>
          ),
        )}
      </ul>
      {editing === "new" && (
        <QuoteEditor sourceId={sourceId} onDone={() => setEditing(null)} />
      )}
    </section>
  );
}

function QuoteEditor({
  sourceId,
  quote,
  onDone,
}: {
  sourceId: string;
  quote?: Quote;
  onDone: () => void;
}) {
  const [text, setText] = useState(quote?.text ?? "");
  const [location, setLocation] = useState(quote?.location ?? "");
  const [confirmingRemove, setConfirmingRemove] = useState(false);

  function save() {
    if (!text.trim()) return;
    startTransition(async () => {
      await saveQuoteAction(sourceId, quote?.id ?? null, { text, location });
      onDone();
    });
  }

  const box =
    "w-full rounded-[10px] border border-border-strong bg-canvas/40 px-3 py-2 text-fg outline-none focus:border-accent";

  return (
    <fieldset
      aria-label={quote ? "Edit quote" : "New quote"}
      className="flex flex-col gap-2 rounded-[10px] border-gold border-l-2 bg-surface-2 p-3"
      onKeyDown={(e) => {
        if (e.key === "Escape") onDone();
        if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) save();
      }}
    >
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        // biome-ignore lint/a11y/noAutofocus: opened on purpose to type a quote
        autoFocus
        placeholder="The quote"
        aria-label="Quote"
        className={`${box} field-sizing-content resize-none text-[16px] italic placeholder:text-fg-faint`}
      />
      <input
        value={location}
        onChange={(e) => setLocation(e.target.value)}
        placeholder="Where: p. 42, st. 57, 12:30 (optional)"
        aria-label="Location"
        className={`${box} font-label text-[13px] placeholder:text-fg-faint`}
      />
      {confirmingRemove ? (
        <div className="flex items-center gap-2">
          <p className="flex-1 text-[15px] text-fg">Remove this quote?</p>
          <button
            type="button"
            onClick={() =>
              quote &&
              startTransition(async () => {
                await removeQuoteAction(quote.id);
                onDone();
              })
            }
            className="rounded-lg bg-danger px-3 py-1 font-bold font-heading text-[12px] text-canvas"
          >
            Remove
          </button>
          <button
            type="button"
            onClick={() => setConfirmingRemove(false)}
            className="rounded-lg px-3 py-1 font-bold font-heading text-[12px] text-accent-glow"
          >
            Keep
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={save}
            disabled={!text.trim()}
            className="rounded-lg bg-accent px-3 py-1.5 font-bold font-heading text-[12px] text-canvas disabled:opacity-50"
          >
            {quote ? "Save" : "Add quote"}
          </button>
          <button
            type="button"
            onClick={onDone}
            className="rounded-lg px-3 py-1.5 font-bold font-heading text-[12px] text-accent-glow"
          >
            Cancel
          </button>
          <span className="flex-1" />
          {quote && (
            <button
              type="button"
              onClick={() => setConfirmingRemove(true)}
              className="font-label font-medium text-danger text-xs hover:underline"
            >
              Remove
            </button>
          )}
        </div>
      )}
    </fieldset>
  );
}
