"use client";

import type { Editor, JSONContent } from "@tiptap/react";
import type { Ref } from "react";
import type { Section } from "@/db/schema";
import { SECTION_KIND_LABELS } from "@/lib/labels";
import type { ScriptView } from "@/lib/script-view";
import { EntryEditor } from "./entry-editor";

type FullScriptProps = {
  /** Entries in outline order, with subsection titles as typed. */
  sections: Section[];
  /** The column, whose `[data-entry-block]` children are the entries. */
  columnRef: Ref<HTMLDivElement>;
  initialOf: (s: Section) => JSONContent;
  /** A just-added subsection, whose title field takes focus. */
  freshId: string | null;
  onFresh: () => void;
  onChange: (id: string, doc: JSONContent) => void;
  /** Saves an entry's pending text (its editor lost focus). */
  onFlush: (id: string) => void;
  /** The entry the cursor is in, or undefined once it leaves the text. */
  onCursor: (id: string | undefined) => void;
  onEditor: (id: string, editor: Editor | null) => void;
  onRename: (id: string, title: string) => void;
  onCommitTitle: (id: string) => void;
};

/**
 * Full script: every entry one after another in a centred reading-width
 * column (v3 spec §4.2). Each entry keeps its own editor and saves on its
 * own; its heading is the kind's name, or the subsection's editable title.
 */
export function FullScript({
  sections,
  columnRef,
  initialOf,
  freshId,
  onFresh,
  onChange,
  onFlush,
  onCursor,
  onEditor,
  onRename,
  onCommitTitle,
}: FullScriptProps) {
  return (
    <div ref={columnRef} className="mx-auto max-w-[720px] pt-2">
      {sections.map((s) => (
        <div key={s.id} data-entry-block={s.id} className="pb-6">
          {s.kind ? (
            <h2 className="pb-1 font-semibold text-[28px] text-fg">
              {SECTION_KIND_LABELS[s.kind]}
            </h2>
          ) : (
            <input
              value={s.title ?? ""}
              onChange={(e) => onRename(s.id, e.target.value)}
              onBlur={() => onCommitTitle(s.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.currentTarget.blur();
              }}
              onFocus={(e) => {
                if (freshId !== s.id) return;
                e.currentTarget.select();
                onFresh();
              }}
              // biome-ignore lint/a11y/noAutofocus: a new subsection is named first
              autoFocus={freshId === s.id}
              placeholder="Untitled"
              aria-label="Subsection title"
              className="-mx-1.5 mb-1 w-[calc(100%+0.75rem)] rounded-lg border border-transparent bg-transparent px-1.5 font-semibold text-[23px] text-fg outline-none placeholder:text-fg-faint placeholder:italic hover:border-border-soft focus:border-accent focus:bg-surface-2"
            />
          )}
          {/* biome-ignore lint/a11y/noStaticElementInteractions: only listens for focus moving in and out of the editor */}
          <div
            onFocus={() => onCursor(s.id)}
            onBlur={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget)) {
                onCursor(undefined);
              }
            }}
          >
            <EntryEditor
              initial={initialOf(s)}
              compact
              placeholder={
                // Short: a placeholder takes no height of its own here.
                s.kind === "main" ? "Lead-in (optional)…" : "Start writing…"
              }
              onChange={(doc) => onChange(s.id, doc)}
              onBlur={() => onFlush(s.id)}
              onEditor={(editor) => onEditor(s.id, editor)}
            />
          </div>
        </div>
      ))}
      {/* Room to scroll the last entry's heading up to the top. */}
      <div aria-hidden className="h-[50vh]" />
    </div>
  );
}

const VIEWS: { view: ScriptView; label: string }[] = [
  { view: "sections", label: "Sections" },
  { view: "full", label: "Full script" },
];

/** The two-option Sections | Full script toggle. */
export function ViewToggle({
  view,
  onChange,
}: {
  view: ScriptView;
  onChange: (view: ScriptView) => void;
}) {
  return (
    <fieldset
      aria-label="Script view"
      className="flex shrink-0 items-center gap-0.5 rounded-xl border border-border-soft bg-surface-2 p-0.5"
    >
      {VIEWS.map((v) => (
        <button
          key={v.view}
          type="button"
          aria-pressed={view === v.view}
          // Keeps the cursor in the text, so the place is known.
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onChange(v.view)}
          className={`rounded-[10px] px-3 py-1.5 font-label font-medium text-[13px] ${
            view === v.view
              ? "bg-accent/20 text-accent-glow"
              : "text-fg-muted hover:bg-surface-3 hover:text-fg"
          }`}
        >
          {v.label}
        </button>
      ))}
    </fieldset>
  );
}
