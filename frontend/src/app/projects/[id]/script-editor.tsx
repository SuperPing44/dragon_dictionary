"use client";

import type { Editor, JSONContent } from "@tiptap/react";
import Image from "next/image";
import {
  startTransition,
  useEffect,
  useOptimistic,
  useRef,
  useState,
} from "react";
import type { Section, SectionKind } from "@/db/schema";
import { speakingTime, wordsLine } from "@/lib/format";
import { SECTION_KIND_LABELS } from "@/lib/labels";
import {
  countDirections,
  countWords,
  type DocNode,
  hasContent,
  missingKinds,
  moveItem,
  parseDoc,
} from "@/lib/script";
import { EntryEditor } from "./entry-editor";
import {
  addSectionAction,
  addSubsectionAction,
  removeSectionAction,
  renameSubsectionAction,
  reorderAction,
  saveSection,
  setRateAction,
} from "./script-actions";
import { insertStageDirection } from "./stage-direction";

const SAVE_DELAY_MS = 1000;

type ScriptEditorProps = {
  projectId: string;
  /** Words per minute for the speaking-time estimate. */
  rate: number;
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

/** A sibling group: "top" for top-level sections, else the parent's ID. */
const groupOf = (s: Section) => s.parent ?? "top";

/** The flat list with one sibling group put in a new order. */
function withGroupOrder(
  sections: Section[],
  group: string,
  orderedIds: string[],
): Section[] {
  const byId = new Map(sections.map((s) => [s.id, s]));
  const pick = (ids: string[]) =>
    ids.flatMap((id) => {
      const s = byId.get(id);
      return s ? [s] : [];
    });
  const tops =
    group === "top" ? pick(orderedIds) : sections.filter((s) => !s.parent);
  return tops.flatMap((top) => [
    top,
    ...(group === top.id
      ? pick(orderedIds)
      : sections.filter((s) => s.parent === top.id)),
  ]);
}

/**
 * The Script tab: an outline on the left and a writing area showing one
 * entry at a time. Text saves about a second after typing stops, and at
 * once when the entry loses focus or another entry is opened.
 */
export function ScriptEditor({
  projectId,
  rate,
  sections: saved,
}: ScriptEditorProps) {
  // Reorders show at once while they save.
  const [sections, showSections] = useOptimistic(saved);
  const [selectedId, setSelectedId] = useState(saved[0]?.id);
  // Subsection titles typed in this session, by section ID.
  const [titles, setTitles] = useState<Record<string, string>>({});
  // A just-added subsection, whose title field takes focus.
  const [freshId, setFreshId] = useState<string | null>(null);
  const [editor, setEditor] = useState<Editor | null>(null);
  // Live documents typed in this session, by section ID.
  const [docs, setDocs] = useState<Record<string, DocNode>>({});
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const savedTitles = useRef(new Map<string, string>());
  const pending = useRef(new Map<string, string>());

  const shown = (s: Section): Section =>
    s.id in titles ? { ...s, title: titles[s.id] } : s;
  const docOf = (s: Section) => docs[s.id] ?? parseDoc(s.content);
  const imagesOf = (s: Section) => countDirections(docOf(s));
  const wordsOf = (s: Section) =>
    docs[s.id] ? countWords(docs[s.id]) : s.wordCount;
  const found = sections.find((s) => s.id === selectedId) ?? sections[0];
  const selected = found ? shown(found) : undefined;
  const tops = sections.filter((s) => s.parent === null);
  const missing = missingKinds(tops.map((s) => s.kind as SectionKind));
  const totalWords = sections.reduce((n, s) => n + wordsOf(s), 0);
  // An outline row's words: the Main part's row includes its subsections.
  const rowWords = (s: Section) =>
    wordsOf(s) +
    sections
      .filter((x) => x.parent === s.id)
      .reduce((n, x) => n + wordsOf(x), 0);

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

  /** Saves the open entry's text and title before another one opens. */
  function leave() {
    if (!selected) return;
    flush(selected.id);
    commitTitle(selected.id);
  }

  function open(id: string) {
    leave();
    setSelectedId(id);
  }

  async function add(kind: SectionKind) {
    leave();
    const id = await addSectionAction(projectId, kind);
    setSelectedId(id);
  }

  async function addSub(mainId: string) {
    leave();
    const id = await addSubsectionAction(mainId);
    setFreshId(id);
    setSelectedId(id);
  }

  function rename(id: string, title: string) {
    setTitles((prev) => ({ ...prev, [id]: title }));
  }

  function commitTitle(id: string) {
    if (!(id in titles)) return;
    const title = titles[id];
    if (savedTitles.current.get(id) === title) return;
    savedTitles.current.set(id, title);
    startTransition(() => renameSubsectionAction(id, title));
  }

  function reorder(group: string, from: number, to: number) {
    const siblings = sections.filter((s) => groupOf(s) === group);
    if (to < 0 || to >= siblings.length || from === to) return;
    const orderedIds = moveItem(siblings, from, to).map((s) => s.id);
    startTransition(async () => {
      showSections(withGroupOrder(sections, group, orderedIds));
      await reorderAction(
        projectId,
        group === "top" ? null : group,
        orderedIds,
      );
    });
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
        sections={sections.map(shown)}
        selectedId={selected?.id}
        missing={missing}
        totalWords={totalWords}
        rate={rate}
        timeOf={(s) => speakingTime(rowWords(s), rate)}
        filled={(s) =>
          hasContent(docOf(s)) ||
          sections.some((x) => x.parent === s.id && hasContent(docOf(x)))
        }
        onOpen={open}
        onAdd={add}
        onAddSubsection={addSub}
        onRemove={remove}
        onMove={reorder}
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
            <div className="flex items-center gap-3 pb-3.5">
              {selected.parent ? (
                <input
                  key={`title-${selected.id}`}
                  value={selected.title ?? ""}
                  onChange={(e) => rename(selected.id, e.target.value)}
                  onBlur={() => commitTitle(selected.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") e.currentTarget.blur();
                  }}
                  onFocus={(e) => {
                    if (freshId !== selected.id) return;
                    e.currentTarget.select();
                    setFreshId(null);
                  }}
                  // biome-ignore lint/a11y/noAutofocus: a new subsection is named first
                  autoFocus={freshId === selected.id}
                  placeholder="Untitled"
                  aria-label="Subsection title"
                  className="-mx-1.5 min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-1.5 font-semibold text-[34px] text-fg outline-none placeholder:text-fg-faint placeholder:italic hover:border-border-soft focus:border-accent focus:bg-surface-2"
                />
              ) : (
                <h2 className="min-w-0 flex-1 font-semibold text-[34px] text-fg">
                  {entryName(selected)}
                </h2>
              )}
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => insertStageDirection(editor)}
                className="flex shrink-0 items-center gap-2 rounded-xl border border-amber/60 bg-amber/10 px-3 py-2 font-bold font-heading text-[13px] text-amber tracking-[0.78px] hover:bg-amber/15"
              >
                <Image
                  src="/design/icon-image-button.svg"
                  alt=""
                  width={17}
                  height={17}
                />
                Image
                <kbd className="rounded-[5px] bg-canvas px-1.5 py-0.5 font-label font-medium text-[11px] text-fg-muted tracking-normal">
                  Alt+I
                </kbd>
              </button>
            </div>
            <div className="mb-3.5 flex items-center gap-[18px] rounded-[10px] bg-surface-2 px-3.5 py-2 font-label font-medium text-fg-muted text-xs">
              <span className="flex items-center gap-1.5">
                <Image
                  src="/design/icon-scroll-small.svg"
                  alt=""
                  width={14}
                  height={14}
                />
                {wordsLine(wordsOf(selected))}
              </span>
              <span className="flex items-center gap-1.5">
                <Image
                  src="/design/icon-clock-small.svg"
                  alt=""
                  width={14}
                  height={14}
                />
                {speakingTime(wordsOf(selected), rate)}
              </span>
              <span className="flex items-center gap-1.5">
                <Image
                  src="/design/icon-image-small.svg"
                  alt=""
                  width={14}
                  height={14}
                />
                {imagesOf(selected)}{" "}
                {imagesOf(selected) === 1 ? "image" : "images"}
              </span>
              <span className="flex-1" />
              <span className="font-body font-normal text-[13px] text-fg-faint italic">
                Images aren’t counted
              </span>
            </div>
            <EntryEditor
              key={`editor-${selected.id}`}
              initial={docOf(selected) as JSONContent}
              placeholder={
                selected.kind === "main"
                  ? "Lead-in before the subsections (optional)…"
                  : "Start writing…"
              }
              onChange={(doc) => change(selected.id, doc)}
              onBlur={() => flush(selected.id)}
              onEditor={setEditor}
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
  rate: number;
  /** An outline row's estimated speaking time. */
  timeOf: (s: Section) => string;
  filled: (s: Section) => boolean;
  onOpen: (id: string) => void;
  onAdd: (kind: SectionKind) => void;
  onAddSubsection: (mainId: string) => void;
  onRemove: (s: Section) => void;
  /** Moves an entry within its sibling group ("top" or the parent's ID). */
  onMove: (group: string, from: number, to: number) => void;
};

type DragPoint = { group: string; index: number };

function Outline({
  sections,
  selectedId,
  missing,
  totalWords,
  rate,
  timeOf,
  filled,
  onOpen,
  onAdd,
  onAddSubsection,
  onRemove,
  onMove,
}: OutlineProps) {
  const [confirming, setConfirming] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  // Drag handles are separate from drop targets: a draggable ancestor
  // around an editor breaks text selection (prototype lesson).
  const [dragging, setDragging] = useState<DragPoint | null>(null);
  const [over, setOver] = useState<DragPoint | null>(null);
  const indexIn = (s: Section) =>
    sections
      .filter((x) => groupOf(x) === groupOf(s))
      .findIndex((x) => x.id === s.id);
  const main = sections.find((s) => s.kind === "main");
  const lastOfMain = main
    ? (sections.filter((x) => x.parent === main.id).at(-1)?.id ?? main.id)
    : undefined;

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
          const group = groupOf(s);
          const index = indexIn(s);
          const isOver =
            over?.group === group &&
            over.index === index &&
            dragging?.index !== index;
          const row = (
            <li
              key={s.id}
              onDragOver={(e) => {
                if (dragging?.group !== group) return;
                e.preventDefault();
                setOver({ group, index });
              }}
              onDrop={(e) => {
                if (dragging?.group !== group) return;
                e.preventDefault();
                onMove(group, dragging.index, index);
                setDragging(null);
                setOver(null);
              }}
              className={`group flex items-center gap-2 rounded-[10px] border py-0.5 pr-2.5 ${
                sub ? "pl-[30px]" : "pl-2"
              } ${
                active
                  ? "border-accent bg-surface-3 shadow-[0_0_12px_rgb(158_107_255/0.25)]"
                  : "border-transparent hover:bg-surface-2"
              } ${isOver ? "outline-2 outline-accent" : ""} ${
                dragging?.group === group && dragging.index === index
                  ? "opacity-50"
                  : ""
              }`}
            >
              <button
                type="button"
                draggable
                aria-label={`Move ${entryName(s)}`}
                title="Drag to reorder, or focus and use the arrow keys"
                onDragStart={(e) => {
                  e.dataTransfer.effectAllowed = "move";
                  e.dataTransfer.setData("text/plain", s.id);
                  setDragging({ group, index });
                }}
                onDragEnd={() => {
                  setDragging(null);
                  setOver(null);
                }}
                onKeyDown={(e) => {
                  const step =
                    e.key === "ArrowUp" ? -1 : e.key === "ArrowDown" ? 1 : 0;
                  if (!step) return;
                  e.preventDefault();
                  onMove(group, index, index + step);
                }}
                className="cursor-grab rounded p-0.5 focus-visible:outline-1 focus-visible:outline-accent active:cursor-grabbing"
              >
                <Image
                  src={
                    active
                      ? "/design/icon-grip-active.svg"
                      : "/design/icon-grip.svg"
                  }
                  alt=""
                  width={14}
                  height={14}
                />
              </button>
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
              <span
                className={`shrink-0 font-label font-medium text-xs ${active ? "text-accent-glow" : "text-fg-muted"}`}
              >
                {timeOf(s)}
              </span>
              <button
                type="button"
                aria-label={`Remove ${entryName(s)}`}
                onClick={() => (filled(s) ? setConfirming(s.id) : onRemove(s))}
                className="hidden rounded p-0.5 group-hover:block focus-visible:block"
              >
                <Image src="/design/icon-x.svg" alt="" width={14} height={14} />
              </button>
            </li>
          );
          if (!main || s.id !== lastOfMain) return row;
          return [
            row,
            <li key="add-subsection">
              <button
                type="button"
                onClick={() => onAddSubsection(main.id)}
                className="flex items-center gap-1.5 py-[7px] pr-2.5 pl-[30px] font-label font-medium text-[13px] text-accent-glow hover:underline"
              >
                <Image
                  src="/design/icon-plus-small.svg"
                  alt=""
                  width={14}
                  height={14}
                />
                Subsection
              </button>
            </li>,
          ];
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

      <div className="mt-4 flex flex-col gap-1 border-border-soft border-t px-2 pt-3">
        <div className="flex items-center">
          <p className="font-label font-semibold text-[11px] text-fg-muted uppercase tracking-[1.1px]">
            Script total
          </p>
          <span className="flex-1" />
          <p className="font-bold font-heading text-[18px] text-gold">
            {speakingTime(totalWords, rate)}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <p className="font-label text-fg-muted text-xs">
            {wordsLine(totalWords)}
          </p>
          <span className="flex-1" />
          <RateEditor rate={rate} />
        </div>
      </div>
    </nav>
  );
}

/** "at 150 wpm": click to change the app-wide rate (60–300). */
function RateEditor({ rate }: { rate: number }) {
  const [draft, setDraft] = useState<string | null>(null);
  const value = Number(draft);
  const valid = Number.isInteger(value) && value >= 60 && value <= 300;

  function save() {
    if (draft === null) return;
    if (!valid) return;
    setDraft(null);
    if (value !== rate) startTransition(() => setRateAction(value));
  }

  if (draft === null) {
    return (
      <button
        type="button"
        onClick={() => setDraft(String(rate))}
        className="flex items-center gap-1.5 font-label font-medium text-accent-glow text-xs underline underline-offset-2"
      >
        at {rate} wpm
        <Image src="/design/icon-pen-small.svg" alt="" width={12} height={12} />
      </button>
    );
  }

  return (
    <span className="flex flex-col items-end gap-1">
      <span className="flex items-center gap-1 font-label text-fg-muted text-xs">
        at
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") setDraft(null);
          }}
          onBlur={() => (valid ? save() : setDraft(null))}
          inputMode="numeric"
          aria-label="Speaking rate in words per minute"
          aria-invalid={!valid}
          // biome-ignore lint/a11y/noAutofocus: opened on purpose to type a rate
          autoFocus
          className={`w-12 rounded-md border bg-surface-2 px-1.5 py-0.5 text-right text-fg outline-none ${
            valid ? "border-accent" : "border-danger"
          }`}
        />
        wpm
      </span>
      {!valid && (
        <span className="font-label text-[11px] text-danger">
          A whole number from 60 to 300
        </span>
      )}
    </span>
  );
}
