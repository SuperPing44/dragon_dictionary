"use client";

import type { Editor, JSONContent } from "@tiptap/react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import {
  startTransition,
  useEffect,
  useOptimistic,
  useRef,
  useState,
} from "react";
import type { Section, SectionKind } from "@/db/schema";
import { directionPosition, scriptItemTarget } from "@/lib/broll";
import { speakingTime, wordsLine } from "@/lib/format";
import { SECTION_KIND_LABELS } from "@/lib/labels";
import { enterFullscreen } from "@/lib/screen";
import {
  countDirections,
  countWords,
  type DocNode,
  hasContent,
  missingKinds,
  moveItem,
  parseDoc,
} from "@/lib/script";
import {
  entryAfterSwitch,
  entryAtTop,
  type ScriptView,
  teleprompterEntry,
} from "@/lib/script-view";
import {
  markOpenedFromScript,
  takeReadingEntry,
} from "@/lib/teleprompter-return";
import { EmphasisToolbar } from "./emphasis-toolbar";
import { EntryEditor } from "./entry-editor";
import { FullScript, ViewToggle } from "./full-script";
import {
  addSectionAction,
  addSubsectionAction,
  removeSectionAction,
  renameSubsectionAction,
  reorderAction,
  saveSection,
  setRateAction,
  setScriptViewAction,
} from "./script-actions";
import { insertStageDirection } from "./stage-direction";

const SAVE_DELAY_MS = 1000;

/** In Full script, the gap between the sticky header and a heading scrolled to. */
const SCROLL_GAP_PX = 16;

/**
 * In Full script, a heading counts as at the top of the screen once it's
 * within this many px below the sticky header (more than the gap above).
 */
const TOP_LINE_SLACK_PX = 40;

/**
 * How far below the top of its scrolling ancestor a sticky `top-0` header
 * ends once it's stuck: the ancestor's top padding plus the header's height.
 */
function stuckHeaderBottom(header: HTMLElement | null): number {
  if (!header) return 0;
  let el = header.parentElement;
  while (el && !/auto|scroll/.test(getComputedStyle(el).overflowY)) {
    el = el.parentElement;
  }
  const padding = el ? Number.parseFloat(getComputedStyle(el).paddingTop) : 0;
  return padding + header.offsetHeight;
}

type ScriptEditorProps = {
  projectId: string;
  /** Words per minute for the speaking-time estimate. */
  rate: number;
  /** Top-level sections by position, each followed by its subsections. */
  sections: Section[];
  /** The view last used, in any project. */
  initialView: ScriptView;
};

/**
 * Saves a section's pending text now, cancelling its scheduled save.
 * Resolves once it's saved.
 */
function flushSave(
  timers: Map<string, ReturnType<typeof setTimeout>>,
  pending: Map<string, string>,
  id: string,
): Promise<void> {
  clearTimeout(timers.get(id));
  timers.delete(id);
  const content = pending.get(id);
  if (content === undefined) return Promise.resolve();
  pending.delete(id);
  return saveSection(id, content).then(() => undefined);
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
 * The Script tab: an outline on the left and a writing area in one of two
 * views. **Sections** shows one entry at a time; **Full script** shows them
 * all in one column, each still its own editor. Text saves about a second
 * after typing stops, and at once when the entry loses focus or another
 * entry is opened.
 */
export function ScriptEditor({
  projectId,
  rate,
  sections: saved,
  initialView,
}: ScriptEditorProps) {
  // Reorders show at once while they save.
  const [sections, showSections] = useOptimistic(saved);
  const [view, setView] = useState(initialView);
  const [selectedId, setSelectedId] = useState(saved[0]?.id);
  // Subsection titles typed in this session, by section ID.
  const [titles, setTitles] = useState<Record<string, string>>({});
  // A just-added subsection, whose title field takes focus.
  const [freshId, setFreshId] = useState<string | null>(null);
  // The live editors, by section ID: one in Sections, all in Full script.
  const [editors, setEditors] = useState<Record<string, Editor>>({});
  // Full script: the entry with the cursor, and the one at the top.
  const [cursorId, setCursorId] = useState<string>();
  const [topId, setTopId] = useState<string>();
  // Full script: an entry to scroll to once it's on screen.
  const [scrollTarget, setScrollTarget] = useState<{
    id: string;
    smooth: boolean;
  }>();
  // Full script: a just-added entry whose text takes the cursor.
  const [focusId, setFocusId] = useState<string>();
  // Live documents typed in this session, by section ID.
  const [docs, setDocs] = useState<Record<string, DocNode>>({});
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const savedTitles = useRef(new Map<string, string>());
  const pending = useRef(new Map<string, string>());
  const column = useRef<HTMLDivElement>(null);
  const header = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const full = view === "full";
  const shown = (s: Section): Section =>
    s.id in titles ? { ...s, title: titles[s.id] } : s;
  const docOf = (s: Section) => docs[s.id] ?? parseDoc(s.content);
  const imagesOf = (s: Section) => countDirections(docOf(s));
  const wordsOf = (s: Section) =>
    docs[s.id] ? countWords(docs[s.id]) : s.wordCount;
  const found = sections.find((s) => s.id === selectedId) ?? sections[0];
  const selected = found ? shown(found) : undefined;
  const cursorEntry = sections.find((s) => s.id === cursorId);
  // The entry the toolbar and Image button act on.
  const editor = full
    ? cursorId
      ? (editors[cursorId] ?? null)
      : null
    : selected
      ? (editors[selected.id] ?? null)
      : null;
  // The outline's highlight: in Full script, where the writer is.
  const currentId = full ? (cursorId ?? topId) : selected?.id;
  const tops = sections.filter((s) => s.parent === null);
  const missing = missingKinds(tops.map((s) => s.kind as SectionKind));
  const totalWords = sections.reduce((n, s) => n + wordsOf(s), 0);
  const canRead = sections.some((s) => hasContent(docOf(s)));
  // An outline row's words: the Main part's row includes its subsections.
  const rowWords = (s: Section) =>
    wordsOf(s) +
    sections
      .filter((x) => x.parent === s.id)
      .reduce((n, x) => n + wordsOf(x), 0);

  const flush = (id: string) => flushSave(timers.current, pending.current, id);

  function registerEditor(id: string, e: Editor | null) {
    setEditors((prev) => {
      if (e) return prev[id] === e ? prev : { ...prev, [id]: e };
      if (!(id in prev)) return prev;
      const { [id]: _gone, ...rest } = prev;
      return rest;
    });
  }

  // From the B-roll list (?entry=…&direction=…): open that entry (or
  // scroll to it in Full script), then scroll to the direction and make it
  // glow briefly. If it's gone, the entry still opens, with no glow.
  const searchParams = useSearchParams();
  const [glow, setGlow] = useState<{ sectionId: string; index: number }>();
  const handledLink = useRef(false);
  useEffect(() => {
    if (handledLink.current) return;
    handledLink.current = true;
    const target = scriptItemTarget(searchParams);
    if (!target || !saved.some((s) => s.id === target.sectionId)) return;
    setSelectedId(target.sectionId);
    if (target.index === undefined) {
      setScrollTarget({ id: target.sectionId, smooth: false });
    } else {
      setGlow({ sectionId: target.sectionId, index: target.index });
    }
    // Drop the parameters, so a reload doesn't jump again.
    router.replace(`/projects/${projectId}`, { scroll: false });
  }, [searchParams, saved, projectId, router]);

  useEffect(() => {
    if (!glow) return;
    if (!full && selected?.id !== glow.sectionId) return;
    const target = editors[glow.sectionId];
    if (!target) return;
    // In Full script, once every entry holds its text, so nothing grows
    // above the direction after scrolling to it.
    if (full && !sections.every((s) => editors[s.id])) return;
    setGlow(undefined);
    const pos = directionPosition(target.state.doc, glow.index);
    const dom = pos === undefined ? null : target.view.nodeDOM(pos);
    if (!(dom instanceof HTMLElement)) {
      // The direction is gone: still show its entry.
      setScrollTarget({ id: glow.sectionId, smooth: false });
      return;
    }
    requestAnimationFrame(() =>
      dom.scrollIntoView({ block: "center", behavior: "smooth" }),
    );
    dom.classList.add("direction-glow");
    setTimeout(() => dom.classList.remove("direction-glow"), 2000);
  }, [glow, editors, full, selected?.id, sections]);

  // Back from the teleprompter: select (or scroll to) the entry that was
  // being read.
  useEffect(() => {
    const id = takeReadingEntry(projectId);
    if (!id || !saved.some((s) => s.id === id)) return;
    setSelectedId(id);
    setScrollTarget({ id, smooth: false });
  }, [projectId, saved]);

  // Full script: scroll to the target entry once its block is there (a
  // just-added one only appears after the save comes back) and every
  // editor holds its text, so nothing above it grows afterwards.
  useEffect(() => {
    if (!scrollTarget || !full) return;
    if (!sections.every((s) => editors[s.id])) return;
    const block = column.current?.querySelector<HTMLElement>(
      `[data-entry-block="${CSS.escape(scrollTarget.id)}"]`,
    );
    if (!block) return;
    setScrollTarget(undefined);
    // Its heading lands just below the sticky header, which may wrap and
    // sticks below the scrolling column's top padding.
    block.style.scrollMarginTop = `${stuckHeaderBottom(header.current) + SCROLL_GAP_PX}px`;
    // After the editors' text is laid out.
    requestAnimationFrame(() =>
      block.scrollIntoView({
        block: "start",
        behavior: scrollTarget.smooth ? "smooth" : "instant",
      }),
    );
  }, [scrollTarget, full, sections, editors]);

  // Full script: a just-added entry takes the cursor once its editor exists.
  useEffect(() => {
    if (!focusId || !editors[focusId]) return;
    editors[focusId].commands.focus();
    setFocusId(undefined);
  }, [focusId, editors]);

  // Full script: keep track of the entry at the top of the screen.
  // biome-ignore lint/correctness/useExhaustiveDependencies: re-measures when the entries change
  useEffect(() => {
    if (!full) return;
    const measure = () => {
      const blocks =
        column.current?.querySelectorAll<HTMLElement>("[data-entry-block]") ??
        [];
      const line =
        (header.current?.getBoundingClientRect().bottom ?? 0) +
        TOP_LINE_SLACK_PX;
      setTopId(
        entryAtTop(
          [...blocks].map((el) => ({
            id: el.dataset.entryBlock ?? "",
            top: el.getBoundingClientRect().top,
          })),
          line,
        ),
      );
    };
    measure();
    // Capture, since the page scrolls inside the app's main column.
    document.addEventListener("scroll", measure, {
      capture: true,
      passive: true,
    });
    window.addEventListener("resize", measure);
    return () => {
      document.removeEventListener("scroll", measure, { capture: true });
      window.removeEventListener("resize", measure);
    };
  }, [full, sections]);

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
      for (const id of [...p.keys()]) void flushSave(t, p, id);
    };
    window.addEventListener("pagehide", flushAll);
    return () => {
      window.removeEventListener("pagehide", flushAll);
      flushAll();
    };
  }, []);

  /** Saves every subsection title typed but not yet saved. */
  function commitTitles() {
    for (const id of Object.keys(titles)) commitTitle(id);
  }

  /** Saves the open entry's text and title before another one opens. */
  function leave() {
    if (!selected) return;
    void flush(selected.id);
    commitTitle(selected.id);
  }

  /** Switches views, keeping the place in the script (v3 spec §4.2). */
  function switchView(to: ScriptView) {
    if (to === view) return;
    const id = entryAfterSwitch(to, {
      selectedId: selected?.id,
      cursorId,
      topId,
    });
    leave();
    commitTitles();
    if (id) setSelectedId(id);
    setScrollTarget(to === "full" && id ? { id, smooth: false } : undefined);
    setCursorId(undefined);
    setView(to);
    startTransition(() => setScriptViewAction(to));
  }

  /**
   * Opens the teleprompter, once all text is saved: at the open entry in
   * Sections, or at the cursor's entry (else the start) in Full script.
   */
  async function openTeleprompter() {
    if (!canRead) return;
    // Fullscreen needs the click itself, so it comes before any waiting.
    enterFullscreen(document);
    commitTitles();
    await Promise.all([...pending.current.keys()].map(flush));
    markOpenedFromScript(projectId);
    const entry = teleprompterEntry(view, {
      selectedId: selected?.id,
      cursorId,
    });
    router.push(
      `/projects/${projectId}/teleprompter${entry ? `?entry=${entry}` : ""}`,
    );
  }

  /**
   * Opens the Script PDF's print layout, once all text is saved: it's
   * rendered from the saved sections and opens the print dialog.
   */
  async function exportPdf() {
    if (!canRead) return;
    commitTitles();
    await Promise.all([...pending.current.keys()].map(flush));
    markOpenedFromScript(projectId);
    router.push(`/projects/${projectId}/print`);
  }

  function open(id: string) {
    if (full) {
      setSelectedId(id);
      setScrollTarget({ id, smooth: true });
      return;
    }
    leave();
    setSelectedId(id);
  }

  async function add(kind: SectionKind) {
    leave();
    const id = await addSectionAction(projectId, kind);
    setSelectedId(id);
    if (full) {
      setScrollTarget({ id, smooth: true });
      setFocusId(id);
    }
  }

  async function addSub(mainId: string) {
    leave();
    const id = await addSubsectionAction(mainId);
    setFreshId(id);
    setSelectedId(id);
    if (full) setScrollTarget({ id, smooth: true });
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
    void flush(s.id);
    if (selected?.id === s.id || selected?.parent === s.id) {
      const rest = sections.filter((x) => x.id !== s.id && x.parent !== s.id);
      setSelectedId(rest[0]?.id);
    }
    if (
      cursorEntry &&
      (cursorEntry.id === s.id || cursorEntry.parent === s.id)
    ) {
      setCursorId(undefined);
    }
    startTransition(() => removeSectionAction(s.id));
  }

  const teleprompterTip = !canRead
    ? "Nothing to read yet · Write something in any section first"
    : full
      ? cursorEntry
        ? `Starts at “${entryName(shown(cursorEntry))}” · Click into another section to start there`
        : "Starts at the beginning · Click into a section to start there"
      : `Starts at “${selected ? entryName(selected) : ""}” · Select another entry in the outline to start there`;

  // The sticky header: toggle, emphasis, ▷ Teleprompter, Export PDF and Image.
  const tools = (
    <>
      <ViewToggle view={view} onChange={switchView} />
      <EmphasisToolbar editor={editor} />
      <span className="group relative shrink-0">
        <button
          type="button"
          aria-disabled={!canRead}
          aria-describedby="teleprompter-tip"
          onMouseDown={(e) => e.preventDefault()}
          onClick={openTeleprompter}
          className={`flex items-center gap-2 rounded-xl border border-accent/60 bg-accent/10 px-3 py-2 font-bold font-heading text-[13px] text-accent-glow tracking-[0.78px] ${
            canRead ? "hover:bg-accent/15" : "cursor-not-allowed opacity-40"
          }`}
        >
          <span aria-hidden className="text-[11px]">
            ▷
          </span>
          Teleprompter
        </button>
        <span
          id="teleprompter-tip"
          role="tooltip"
          className="pointer-events-none absolute top-full right-0 z-20 mt-2 hidden w-max max-w-[300px] rounded-lg border border-border-strong bg-surface-3 px-3 py-2 font-label text-[12px] text-fg-muted leading-snug shadow-[0_10px_30px_rgb(0_0_0/0.55)] group-focus-within:block group-hover:block"
        >
          {teleprompterTip}
        </span>
      </span>
      <span className="group relative shrink-0">
        <button
          type="button"
          aria-disabled={!canRead}
          aria-describedby="export-pdf-tip"
          onMouseDown={(e) => e.preventDefault()}
          onClick={exportPdf}
          className={`flex items-center rounded-xl border border-border-strong bg-surface-2 px-3 py-2 font-bold font-heading text-[13px] text-fg tracking-[0.78px] ${
            canRead ? "hover:bg-surface-3" : "cursor-not-allowed opacity-40"
          }`}
        >
          Export PDF
        </button>
        <span
          id="export-pdf-tip"
          role="tooltip"
          className="pointer-events-none absolute top-full right-0 z-20 mt-2 hidden w-max max-w-[300px] rounded-lg border border-border-strong bg-surface-3 px-3 py-2 font-label text-[12px] text-fg-muted leading-snug shadow-[0_10px_30px_rgb(0_0_0/0.55)] group-focus-within:block group-hover:block"
        >
          {canRead
            ? "Opens the print dialog · Choose “Save as PDF” there"
            : "Nothing to export yet · Write something in any section first"}
        </span>
      </span>
      <button
        type="button"
        disabled={!editor}
        title={editor ? undefined : "Click into a section first"}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => insertStageDirection(editor)}
        className="flex shrink-0 items-center gap-2 rounded-xl border border-amber/60 bg-amber/10 px-3 py-2 font-bold font-heading text-[13px] text-amber tracking-[0.78px] hover:bg-amber/15 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-amber/10"
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
    </>
  );

  return (
    <div className="flex items-start gap-5">
      <Outline
        sections={sections.map(shown)}
        selectedId={currentId}
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
        {!selected ? (
          <p className="pt-4 text-[17px] text-fg-muted italic">
            This script has no sections. Add one from the outline.
          </p>
        ) : full ? (
          <>
            {/* Stays in view while the script scrolls (v3 spec §4.1). */}
            <div
              ref={header}
              className="sticky top-0 z-10 -mx-10 flex flex-wrap items-center justify-end gap-x-3 gap-y-2 bg-surface-1 px-10 pt-2 pb-3.5"
            >
              {tools}
            </div>
            <FullScript
              sections={sections.map(shown)}
              columnRef={column}
              initialOf={(s) => docOf(s) as JSONContent}
              freshId={freshId}
              onFresh={() => setFreshId(null)}
              onChange={change}
              onFlush={(id) => void flush(id)}
              onCursor={setCursorId}
              onEditor={registerEditor}
              onRename={rename}
              onCommitTitle={commitTitle}
            />
          </>
        ) : (
          <>
            {selected.parent && (
              <p className="pb-2 font-label text-[12px] text-fg-muted">
                Main part › subsection
              </p>
            )}
            {/* Stays in view while a long section scrolls (v3 spec §4.1). */}
            <div className="sticky top-0 z-10 -mx-10 flex flex-wrap items-center gap-x-3 gap-y-2 bg-surface-1 px-10 pt-2 pb-3.5">
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
                  className="-mx-1.5 min-w-0 flex-1 basis-[240px] rounded-lg border border-transparent bg-transparent px-1.5 font-semibold text-[34px] text-fg outline-none placeholder:text-fg-faint placeholder:italic hover:border-border-soft focus:border-accent focus:bg-surface-2"
                />
              ) : (
                <h2 className="min-w-0 flex-1 basis-[240px] font-semibold text-[34px] text-fg">
                  {entryName(selected)}
                </h2>
              )}
              {tools}
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
              onBlur={() => void flush(selected.id)}
              onEditor={(e) => registerEditor(selected.id, e)}
            />
          </>
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
