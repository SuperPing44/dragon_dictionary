"use client";

// PROTOTYPE — Variant C: timeline + margin. A bar at the top shows the
// sections sized by length and is where you reorder them; the text reads as
// one continuous script, with stage directions as small markers in the text
// and their descriptions in a right-hand margin (like a two-column A/V script).

import type { Editor } from "@tiptap/react";
import { useRef } from "react";
import { useDragList } from "./drag";
import {
  type Body,
  type Kind,
  KIND_LABEL,
  minutes,
  type Script,
} from "./script-model";
import { SectionEditor } from "./section-editor";
import { makeStageDirection, setDirectionAt } from "./stage-direction";

export const name = "Timeline + margin";

const StageDirection = makeStageDirection("marker");

const KIND_COLOR: Record<Kind, string> = {
  opening: "bg-emerald-500",
  hook: "bg-rose-500",
  intro: "bg-amber-500",
  main: "bg-indigo-500",
  outro: "bg-orange-500",
  closing: "bg-teal-500",
};

export function VariantC({ script }: { script: Script }) {
  const timeline = useDragList(script.moveSection);
  const editors = useRef<Record<string, Editor>>({});

  function block(id: string, body: Body, heading: React.ReactNode) {
    return (
      <div key={id} className="grid grid-cols-[1fr_16rem] gap-8">
        <div>
          {heading}
          <SectionEditor
            body={body}
            stageDirection={StageDirection}
            onEditor={(ed) => {
              editors.current[id] = ed;
            }}
            onChange={(b) => script.updateBody(id, b)}
            placeholder="…"
            className="min-h-[1lh] font-serif text-lg leading-loose"
          />
        </div>
        <ol className="flex flex-col gap-1.5 border-l border-violet-200 pl-3 pt-6 text-sm dark:border-violet-900">
          {body.directions.map((d, n) => (
            <li key={`${id}-${n}`} className="flex items-start gap-1.5">
              <span className="mt-1 rounded bg-violet-600 px-1 text-[0.65em] text-white">▣</span>
              <input
                value={d}
                autoFocus={d === ""}
                onChange={(e) => {
                  const ed = editors.current[id];
                  if (ed) setDirectionAt(ed, n, e.target.value);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") editors.current[id]?.commands.focus();
                }}
                placeholder="describe the image…"
                className="flex-1 bg-transparent text-violet-900 outline-none placeholder:text-violet-400 dark:text-violet-200"
              />
            </li>
          ))}
        </ol>
      </div>
    );
  }

  return (
    <div className="w-full pb-32">
      <div className="sticky top-0 z-10 border-b border-neutral-200 bg-white/95 px-6 py-3 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/95">
        <div className="mb-2 flex items-baseline gap-3">
          <h1 className="font-semibold">Fenrir — the bound wolf</h1>
          <span className="text-sm text-neutral-500">
            ≈ {minutes(script.totalWords)} · {script.totalWords} words · type{" "}
            <code className="rounded bg-neutral-200 px-1 dark:bg-neutral-800">/img</code> + space
            for a stage direction
          </span>
        </div>
        <div className="flex h-12 items-stretch gap-1">
          {script.sections.map((s, i) => {
            const words = s.words + s.subsections.reduce((n, x) => n + x.words, 0);
            return (
              <a
                key={s.id}
                href={`#c-${s.id}`}
                {...timeline.handleProps(i)}
                {...timeline.targetProps(i)}
                style={{ flexGrow: Math.max(words, 15) }}
                className={`flex min-w-16 cursor-grab flex-col justify-center overflow-hidden rounded-md px-2 text-xs text-white ${KIND_COLOR[s.kind]} ${timeline.isOver(i) ? "ring-4 ring-black/40 dark:ring-white/60" : ""} ${timeline.dragging === i ? "opacity-40" : ""}`}
              >
                <span className="truncate font-medium">{KIND_LABEL[s.kind]}</span>
                <span className="truncate opacity-80">
                  {minutes(words)}
                  {s.kind === "main" && s.subsections.length > 0 && ` · ${s.subsections.length} parts`}
                </span>
              </a>
            );
          })}
          {script.missingKinds.length > 0 && (
            <select
              value=""
              onChange={(e) => {
                if (e.target.value) script.addSection(e.target.value as Kind);
              }}
              className="w-10 shrink-0 cursor-pointer appearance-none rounded-md border-2 border-dashed border-neutral-300 bg-transparent text-center text-lg text-neutral-400 dark:border-neutral-700"
              title="Add section"
            >
              <option value="">+</option>
              {script.missingKinds.map((k) => (
                <option key={k} value={k}>
                  {KIND_LABEL[k]}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      <div className="mx-auto flex max-w-5xl flex-col gap-10 px-6 pt-8">
        {script.sections.map((s) => (
          <section key={s.id} id={`c-${s.id}`} className="scroll-mt-32">
            {block(
              s.id,
              s,
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-neutral-400">
                <span className={`h-2 w-2 rounded-full ${KIND_COLOR[s.kind]}`} />
                {KIND_LABEL[s.kind]}
                <button
                  type="button"
                  onClick={() => script.removeSection(s.id)}
                  className="font-normal normal-case tracking-normal text-neutral-400 hover:text-red-600"
                >
                  remove
                </button>
              </div>,
            )}

            {s.kind === "main" && (
              <div className="mt-6 flex flex-col gap-6">
                {s.subsections.map((sub, j) =>
                  block(
                    sub.id,
                    sub,
                    <div className="flex items-center gap-2">
                      <input
                        value={sub.title}
                        onChange={(e) => script.renameSubsection(sub.id, e.target.value)}
                        placeholder="Untitled"
                        className="flex-1 bg-transparent font-serif text-xl font-semibold outline-none"
                      />
                      <span className="flex gap-1 text-xs text-neutral-400">
                        <button
                          type="button"
                          disabled={j === 0}
                          onClick={() => script.moveSubsection(j, j - 1)}
                          className="disabled:opacity-30"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          disabled={j === s.subsections.length - 1}
                          onClick={() => script.moveSubsection(j, j + 1)}
                          className="disabled:opacity-30"
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          onClick={() => script.removeSubsection(sub.id)}
                          className="hover:text-red-600"
                        >
                          ✕
                        </button>
                      </span>
                    </div>,
                  ),
                )}
                <button
                  type="button"
                  onClick={script.addSubsection}
                  className="self-start text-sm text-indigo-600 hover:underline"
                >
                  + Add subsection
                </button>
              </div>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
