"use client";

// PROTOTYPE — Variant A: one long document. Every section is a card in a single
// scrolling page; stage directions are typed as "[Image: …]" and become chips.

import { useDragList } from "./drag";
import { type Kind, KIND_LABEL, minutes, type Script } from "./script-model";
import { SectionEditor } from "./section-editor";
import { makeStageDirection } from "./stage-direction";

export const name = "One long document";

const StageDirection = makeStageDirection("chip");

export function VariantA({ script }: { script: Script }) {
  const sections = useDragList(script.moveSection);
  const subs = useDragList(script.moveSubsection);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 pb-32">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Fenrir — the bound wolf</h1>
        <p className="text-sm text-neutral-500">
          {script.totalWords} words · ≈ {minutes(script.totalWords)} · Type{" "}
          <code className="rounded bg-neutral-200 px-1 dark:bg-neutral-800">
            [Image: …]
          </code>{" "}
          to add a stage direction, click one to edit it.
        </p>
      </header>

      <div className="flex flex-col gap-4">
        {script.sections.map((s, i) => (
          <section
            key={s.id}
            {...sections.targetProps(i)}
            className={`rounded-xl border bg-white p-4 shadow-sm dark:bg-neutral-900 ${
              sections.isOver(i)
                ? "border-blue-500"
                : "border-neutral-200 dark:border-neutral-800"
            } ${sections.dragging === i ? "opacity-40" : ""}`}
          >
            <div className="mb-2 flex items-center gap-2 text-sm">
              <span
                {...sections.handleProps(i)}
                className="cursor-grab select-none text-neutral-400"
                title="Drag to reorder"
              >
                ⠿
              </span>
              <h2 className="font-semibold">{KIND_LABEL[s.kind]}</h2>
              <span className="text-neutral-500">
                {s.words} words · ≈ {minutes(s.words)}
              </span>
              <span className="ml-auto flex gap-1">
                <IconButton
                  label="Move up"
                  disabled={i === 0}
                  onClick={() => script.moveSection(i, i - 1)}
                >
                  ↑
                </IconButton>
                <IconButton
                  label="Move down"
                  disabled={i === script.sections.length - 1}
                  onClick={() => script.moveSection(i, i + 1)}
                >
                  ↓
                </IconButton>
                <IconButton label="Remove" onClick={() => script.removeSection(s.id)}>
                  ✕
                </IconButton>
              </span>
            </div>

            <SectionEditor
              body={s}
              stageDirection={StageDirection}
              onChange={(b) => script.updateBody(s.id, b)}
              placeholder={s.kind === "main" ? "Lead-in (optional)…" : "Start writing…"}
              className="min-h-[2lh] text-[1.05rem] leading-relaxed"
            />

            {s.kind === "main" && (
              <div className="mt-4 flex flex-col gap-3 border-l-2 border-neutral-200 pl-4 dark:border-neutral-800">
                {s.subsections.map((sub, j) => (
                  <div
                    key={sub.id}
                    {...subs.targetProps(j)}
                    className={`rounded-lg p-2 ${subs.isOver(j) ? "bg-blue-50 dark:bg-blue-950" : ""} ${subs.dragging === j ? "opacity-40" : ""}`}
                  >
                    <div className="mb-1 flex items-center gap-2 text-sm">
                      <span
                        {...subs.handleProps(j)}
                        className="cursor-grab select-none text-neutral-400"
                      >
                        ⠿
                      </span>
                      <input
                        value={sub.title}
                        onChange={(e) => script.renameSubsection(sub.id, e.target.value)}
                        placeholder="Untitled"
                        className="flex-1 bg-transparent font-medium outline-none"
                      />
                      <span className="text-neutral-500">{sub.words} words</span>
                      <IconButton label="Remove" onClick={() => script.removeSubsection(sub.id)}>
                        ✕
                      </IconButton>
                    </div>
                    <SectionEditor
                      body={sub}
                      stageDirection={StageDirection}
                      onChange={(b) => script.updateBody(sub.id, b)}
                      className="min-h-[2lh] text-[1.05rem] leading-relaxed"
                    />
                  </div>
                ))}
                <button
                  type="button"
                  onClick={script.addSubsection}
                  className="self-start text-sm text-blue-600 hover:underline"
                >
                  + Add subsection
                </button>
              </div>
            )}
          </section>
        ))}
      </div>

      {script.sections.length === 0 && (
        <p className="py-8 text-center text-neutral-500">The script is empty.</p>
      )}

      {script.missingKinds.length > 0 && (
        <AddSection kinds={script.missingKinds} onAdd={script.addSection} />
      )}
    </div>
  );
}

function AddSection({ kinds, onAdd }: { kinds: readonly Kind[]; onAdd: (k: Kind) => void }) {
  return (
    <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
      <span className="text-neutral-500">Add section:</span>
      {kinds.map((k) => (
        <button
          key={k}
          type="button"
          onClick={() => onAdd(k)}
          className="rounded-full border border-dashed border-neutral-400 px-3 py-1 hover:border-blue-500 hover:text-blue-600"
        >
          + {KIND_LABEL[k]}
        </button>
      ))}
    </div>
  );
}

function IconButton({
  label,
  children,
  ...props
}: { label: string } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      className="rounded px-1.5 text-neutral-500 hover:bg-neutral-100 disabled:opacity-30 dark:hover:bg-neutral-800"
      {...props}
    >
      {children}
    </button>
  );
}
