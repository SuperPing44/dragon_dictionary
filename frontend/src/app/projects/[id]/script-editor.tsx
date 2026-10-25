"use client";

import type { JSONContent } from "@tiptap/react";
import Image from "next/image";
import { startTransition, useEffect, useRef, useState } from "react";
import type { Section, SectionKind } from "@/db/schema";
import { SECTION_KIND_LABELS } from "@/lib/labels";
import {
  countWords,
  type DocNode,
  hasContent,
  missingKinds,
  parseDoc,
} from "@/lib/script";
import { EntryEditor } from "./entry-editor";
import {
  addSectionAction,
  removeSectionAction,
  saveSection,
} from "./script-actions";

const SAVE_DELAY_MS = 1000;

type ScriptEditorProps = {
  projectId: string;
  /** Top-level sections by position, each followed by its subsections. */
  sections: Section[];
};

/** Saves a section's pending text now, cancelling its scheduled save. */
function flushSave(
  timers: Map<string, ReturnType<typeof setTimeout>>,
  pending: Map<string, string>,
  id: string,
) {
  clearTimeout(timers.get(id));
  timers.delete(id);
  const content = pending.get(id);
  if (content === undefined) return;
  pending.delete(id);
  void saveSection(id, content);
}

const entryName = (s: Section) =>
  s.kind ? SECTION_KIND_LABELS[s.kind] : s.title || "Untitled";

/**
 * The Script tab: an outline on the left and a writing area showing one
 * entry at a time. Text saves about a second after typing stops, and at
 * once when the entry loses focus or another entry is opened.
 */
export function ScriptEditor({ projectId, sections }: ScriptEditorProps) {
  const [selectedId, setSelectedId] = useState(sections[0]?.id);
  // Live documents typed in this session, by section ID.
  const [docs, setDocs] = useState<Record<string, DocNode>>({});
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const pending = useRef(new Map<string, string>());

  const docOf = (s: Section) => docs[s.id] ?? parseDoc(s.content);
  const wordsOf = (s: Section) =>
    docs[s.id] ? countWords(docs[s.id]) : s.wordCount;
  const selected =
    sections.find((s) => s.id === selectedId) ?? sections[0] ?? undefined;
  const tops = sections.filter((s) => s.parent === null);
  const missing = missingKinds(tops.map((s) => s.kind as SectionKind));
  const totalWords = sections.reduce((n, s) => n + wordsOf(s), 0);

  const flush = (id: string) => flushSave(timers.current, pending.current, id);

  function change(id: string, doc: JSONContent) {
    setDocs((prev) => ({ ...prev, [id]: doc as DocNode }));
    pending.current.set(id, JSON.stringify(doc));
    clearTimeout(timers.current.get(id));
    timers.current.set(
      id,
      setTimeout(() => flush(id), SAVE_DELAY_MS),
    );
  }

  // Save whatever is pending when leaving the page or closing the tab.
  useEffect(() => {
    const t = timers.current;
    const p = pending.current;
    const flushAll = () => {
      for (const id of [...p.keys()]) flushSave(t, p, id);
    };
    window.addEventListener("pagehide", flushAll);
    return () => {
      window.removeEventListener("pagehide", flushAll);
      flushAll();
    };
  }, []);

  function open(id: string) {
    if (selected) flush(selected.id);
    setSelectedId(id);
  }

  async function add(kind: SectionKind) {
    const id = await addSectionAction(projectId, kind);
    setSelectedId(id);
  }

  function remove(s: Section) {
    flush(s.id);
    if (selected?.id === s.id || selected?.parent === s.id) {
      const rest = sections.filter((x) => x.id !== s.id && x.parent !== s.id);
      setSelectedId(rest[0]?.id);
    }
    startTransition(() => removeSectionAction(s.id));
  }

  return (
    <div className="flex items-start gap-5">
      <Outline
        sections={sections}
        selectedId={selected?.id}
        missing={missing}
        totalWords={totalWords}
        filled={(s) =>
          hasContent(docOf(s)) ||
          sections.some((x) => x.parent === s.id && hasContent(docOf(x)))
        }
        onOpen={open}
        onAdd={add}
        onRemove={remove}
      />

      <section
        aria-label="Writing area"
        className="min-w-0 flex-1 rounded-[18px] border border-border-soft bg-surface-1 px-10 pt-6 pb-10"
      >
        {selected ? (
          <>
            {selected.parent && (
              <p className="pb-2 font-label text-[12px] text-fg-muted">
                Main part › subsection
              </p>
            )}
            <h2 className="pb-3.5 font-semibold text-[34px] text-fg">
              {entryName(selected)}
            </h2>
            <div className="mb-3.5 flex items-center gap-[18px] rounded-[10px] bg-surface-2 px-3.5 py-2 font-label font-medium text-fg-muted text-xs">
              <span className="flex items-center gap-1.5">
                <Image
                  src="/design/icon-scroll-small.svg"
                  alt=""
                  width={14}
                  height={14}
                />
                {wordsOf(selected).toLocaleString("en")}{" "}
                {wordsOf(selected) === 1 ? "word" : "words"}
              </span>
            </div>
            <EntryEditor
              key={selected.id}
              initial={docOf(selected) as JSONContent}
              placeholder={
                selected.kind === "main"
                  ? "Lead-in before the subsections (optional)…"
                  : "Start writing…"
              }
              onChange={(doc) => change(selected.id, doc)}
              onBlur={() => flush(selected.id)}
            />
          </>
        ) : (
          <p className="pt-4 text-[17px] text-fg-muted italic">
            This script has no sections. Add one from the outline.
          </p>
        )}
      </section>
    </div>
  );
}

type OutlineProps = {
  sections: Section[];
  selectedId: string | undefined;
  missing: SectionKind[];
  totalWords: number;
  filled: (s: Section) => boolean;
  onOpen: (id: string) => void;
  onAdd: (kind: SectionKind) => void;
  onRemove: (s: Section) => void;
};

function Outline({
  sections,
  selectedId,
  missing,
  totalWords,
  filled,
  onOpen,
  onAdd,
  onRemove,
}: OutlineProps) {
  const [confirming, setConfirming] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  return (
    <nav
      aria-label="Outline"
      className="sticky top-0 flex w-[310px] shrink-0 flex-col gap-0.5 rounded-[18px] border border-border-soft bg-surface-1 px-3 py-4"
    >
      <p className="px-2 pb-2.5 font-label font-semibold text-[11px] text-fg-muted uppercase tracking-[1.1px]">
        Outline
      </p>

      <ol className="flex flex-col gap-0.5">
        {sections.map((s) => {
          const active = s.id === selectedId;
          const sub = s.parent !== null;
          if (confirming === s.id) {
            return (
              <li
                key={s.id}
                className="flex flex-col gap-2 rounded-[10px] border border-danger/60 bg-surface-2 px-2.5 py-2"
              >
                <p className="text-[15px] text-fg leading-snug">
                  Remove “{entryName(s)}”?{" "}
                  <span className="text-fg-muted">
                    {s.kind === "main"
                      ? "Its text and subsections will be lost."
                      : "Its text will be lost."}
                  </span>
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setConfirming(null);
                      onRemove(s);
                    }}
                    className="rounded-lg bg-danger px-3 py-1 font-bold font-heading text-[12px] text-canvas"
                  >
                    Remove
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirming(null)}
                    className="rounded-lg px-3 py-1 font-bold font-heading text-[12px] text-accent-glow"
                  >
                    Keep
                  </button>
                </div>
              </li>
            );
          }
          return (
            <li
              key={s.id}
              className={`group flex items-center gap-2 rounded-[10px] border py-0.5 pr-2.5 ${
                sub ? "pl-[30px]" : "pl-2"
              } ${
                active
                  ? "border-accent bg-surface-3 shadow-[0_0_12px_rgb(158_107_255/0.25)]"
                  : "border-transparent hover:bg-surface-2"
              }`}
            >
              {sub && (
                <Image
                  src={
                    active
                      ? "/design/star-sub-active.svg"
                      : "/design/star-sub.svg"
                  }
                  alt=""
                  width={8}
                  height={8}
                />
              )}
              <button
                type="button"
                aria-current={active ? "true" : undefined}
                onClick={() => onOpen(s.id)}
                className={`min-w-0 flex-1 truncate py-2 text-left text-fg ${
                  sub ? "text-[16px]" : "font-semibold text-[17px]"
                } ${!s.kind && !s.title ? "text-fg-faint italic" : ""}`}
              >
                {entryName(s)}
              </button>
              <button
                type="button"
                aria-label={`Remove ${entryName(s)}`}
                onClick={() => (filled(s) ? setConfirming(s.id) : onRemove(s))}
                className="invisible rounded p-0.5 group-hover:visible focus-visible:visible"
              >
                <Image src="/design/icon-x.svg" alt="" width={14} height={14} />
              </button>
            </li>
          );
        })}
      </ol>

      {missing.length > 0 && (
        <div className="relative mt-2">
          <button
            type="button"
            aria-expanded={adding}
            onClick={() => setAdding(!adding)}
            className="flex w-full items-center gap-1.5 rounded-[10px] border border-border-strong border-dashed p-2.5 font-label font-medium text-[13px] text-accent-glow hover:border-accent"
          >
            <Image
              src="/design/icon-plus-small.svg"
              alt=""
              width={14}
              height={14}
            />
            <span className="flex-1 text-left">Add section</span>
            <Image
              src="/design/icon-chevron.svg"
              alt=""
              width={14}
              height={14}
              className={adding ? "rotate-180" : ""}
            />
          </button>
          {adding && (
            <div className="absolute top-full left-3 z-10 mt-1 flex w-[230px] flex-col gap-0.5 rounded-xl border border-border-strong bg-surface-3 p-1.5 shadow-[0_10px_30px_rgb(0_0_0/0.55)]">
              <p className="px-1.5 pb-0.5 font-label text-[11px] text-fg-faint">
                Only missing kinds
              </p>
              {missing.map((kind) => (
                <button
                  key={kind}
                  type="button"
                  onClick={() => {
                    setAdding(false);
                    onAdd(kind);
                  }}
                  className="rounded-lg px-2.5 py-2 text-left font-semibold text-[16px] text-fg hover:bg-surface-2"
                >
                  {SECTION_KIND_LABELS[kind]}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="mt-4 flex items-center border-border-soft border-t px-2 pt-3">
        <p className="font-label font-semibold text-[11px] text-fg-muted uppercase tracking-[1.1px]">
          Script total
        </p>
        <span className="flex-1" />
        <p className="font-label text-fg-muted text-xs">
          {totalWords.toLocaleString("en")}{" "}
          {totalWords === 1 ? "word" : "words"}
        </p>
      </div>
    </nav>
  );
}
