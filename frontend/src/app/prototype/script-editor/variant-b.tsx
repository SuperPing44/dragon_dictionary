"use client";

// PROTOTYPE — Variant B: outline + focus. A sidebar outline manages the
// structure; the writing pane shows one section at a time. Stage directions are
// inserted with a toolbar button or Alt+I and edited in a popover.

import type { Editor } from "@tiptap/react";
import { useState } from "react";
import { useDragList } from "./drag";
import { type Kind, KIND_LABEL, minutes, type Script } from "./script-model";
import { SectionEditor } from "./section-editor";
import { insertDirection, makeStageDirection } from "./stage-direction";

export const name = "Outline + focus";

const StageDirection = makeStageDirection("pill");

export function VariantB({ script }: { script: Script }) {
  const [selectedId, setSelectedId] = useState(script.sections[0]?.id ?? "");
  const [editor, setEditor] = useState<Editor | null>(null);
  const sections = useDragList(script.moveSection);
  const subs = useDragList(script.moveSubsection);

  const main = script.sections.find((s) => s.kind === "main");
  const selectedSection = script.sections.find((s) => s.id === selectedId);
  const selectedSub = main?.subsections.find((s) => s.id === selectedId);
  const selected = selectedSection ?? selectedSub;

  return (
    <div className="flex min-h-screen w-full">
      <aside className="sticky top-0 flex h-screen w-72 shrink-0 flex-col border-r border-neutral-200 bg-neutral-50 p-3 text-sm dark:border-neutral-800 dark:bg-neutral-950">
        <div className="mb-3 px-2">
          <div className="text-xs uppercase tracking-wide text-neutral-500">Script</div>
          <div className="font-semibold">Fenrir — the bound wolf</div>
        </div>

        <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto">
          {script.sections.map((s, i) => (
            <div key={s.id} {...sections.targetProps(i)}>
              <Row
                drag={sections.handleProps(i)}
                over={sections.isOver(i)}
                active={selectedId === s.id}
                onSelect={() => setSelectedId(s.id)}
                onRemove={() => script.removeSection(s.id)}
                label={KIND_LABEL[s.kind]}
                words={s.words}
              />
              {s.kind === "main" && (
                <div className="ml-4 border-l border-neutral-300 pl-1 dark:border-neutral-700">
                  {s.subsections.map((sub, j) => (
                    <div key={sub.id} {...subs.targetProps(j)}>
                      <Row
                        drag={subs.handleProps(j)}
                        over={subs.isOver(j)}
                        active={selectedId === sub.id}
                        onSelect={() => setSelectedId(sub.id)}
                        onRemove={() => script.removeSubsection(sub.id)}
                        label={sub.title || "Untitled"}
                        words={sub.words}
                        small
                      />
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setSelectedId(script.addSubsection())}
                    className="px-2 py-1 text-xs text-sky-700 hover:underline dark:text-sky-400"
                  >
                    + Subsection
                  </button>
                </div>
              )}
            </div>
          ))}
        </nav>

        {script.missingKinds.length > 0 && (
          <select
            value=""
            onChange={(e) => {
              if (e.target.value) script.addSection(e.target.value as Kind);
            }}
            className="mt-2 rounded border border-neutral-300 bg-white px-2 py-1 dark:border-neutral-700 dark:bg-neutral-900"
          >
            <option value="">+ Add section…</option>
            {script.missingKinds.map((k) => (
              <option key={k} value={k}>
                {KIND_LABEL[k]}
              </option>
            ))}
          </select>
        )}

        <div className="mt-3 border-t border-neutral-200 px-2 pt-2 text-neutral-500 dark:border-neutral-800">
          Total: {script.totalWords} words · ≈ {minutes(script.totalWords)}
        </div>
      </aside>

      <main className="flex-1 pb-32">
        {selected ? (
          <>
            <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-neutral-200 bg-white/90 px-8 py-2 text-sm backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/90">
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => insertDirection(editor)}
                className="rounded-md bg-sky-600 px-3 py-1 font-medium text-white hover:bg-sky-700"
              >
                🖼 Image <span className="opacity-70">Alt+I</span>
              </button>
              <span className="ml-auto text-neutral-500">
                {selected.words} words · ≈ {minutes(selected.words)} ·{" "}
                {selected.directions.length} images
              </span>
            </div>

            <article className="mx-auto max-w-2xl px-8 pt-10">
              {selectedSub ? (
                <input
                  value={selectedSub.title}
                  onChange={(e) => script.renameSubsection(selectedSub.id, e.target.value)}
                  placeholder="Untitled"
                  className="mb-6 w-full bg-transparent font-serif text-3xl font-semibold outline-none"
                />
              ) : (
                <h1 className="mb-6 font-serif text-3xl font-semibold">
                  {selectedSection && KIND_LABEL[selectedSection.kind]}
                </h1>
              )}
              <SectionEditor
                key={selected.id}
                body={selected}
                stageDirection={StageDirection}
                onEditor={setEditor}
                onChange={(b) => script.updateBody(selected.id, b)}
                placeholder={
                  selectedSection?.kind === "main"
                    ? "Lead-in before the subsections (optional)…"
                    : "Start writing…"
                }
                className="min-h-[50vh] font-serif text-xl leading-loose"
              />
            </article>
          </>
        ) : (
          <p className="p-10 text-neutral-500">Pick a section in the outline.</p>
        )}
      </main>
    </div>
  );
}

function Row({
  drag,
  over,
  active,
  onSelect,
  onRemove,
  label,
  words,
  small,
}: {
  drag: object;
  over: boolean;
  active: boolean;
  onSelect: () => void;
  onRemove: () => void;
  label: string;
  words: number;
  small?: boolean;
}) {
  return (
    <div
      {...drag}
      className={`group flex cursor-grab items-center gap-2 rounded-md px-2 py-1.5 ${
        active ? "bg-sky-100 text-sky-900 dark:bg-sky-900/50 dark:text-sky-100" : "hover:bg-neutral-200/60 dark:hover:bg-neutral-800"
      } ${over ? "outline outline-2 outline-sky-500" : ""} ${small ? "text-xs" : ""}`}
    >
      <button type="button" onClick={onSelect} className="flex-1 truncate text-left">
        {label}
      </button>
      <span className="text-xs tabular-nums text-neutral-500">{words}</span>
      <button
        type="button"
        onClick={onRemove}
        aria-label="Remove"
        className="invisible text-neutral-400 hover:text-red-600 group-hover:visible"
      >
        ✕
      </button>
    </div>
  );
}
