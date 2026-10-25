"use client";

import { startTransition, useState } from "react";
import { CategoryPicker } from "@/components/category-picker";
import type { VideoProjectWithCategories } from "@/db/projects";
import {
  type Category,
  type CategoryColour,
  VIDEO_STAGES,
  type VideoStage,
} from "@/db/schema";
import { speakingTime, wordsLine } from "@/lib/format";
import { STAGE_LABELS } from "@/lib/labels";
import {
  addCategoryToProject,
  removeCategoryFromProject,
  saveProject,
} from "../actions";

type ProjectHeaderProps = {
  project: VideoProjectWithCategories;
  allCategories: Category[];
  defaultColour: CategoryColour;
  /** Words per minute for the estimated length. */
  rate: number;
};

export function ProjectHeader({
  project,
  allCategories,
  defaultColour,
  rate,
}: ProjectHeaderProps) {
  return (
    <header className="flex items-center gap-4">
      <div className="flex min-w-0 flex-1 flex-col gap-2.5">
        <TitleField id={project.id} saved={project.title} />
        <div className="flex flex-wrap items-center gap-3">
          <CategoryPicker
            variant="inline"
            label="Categories of this project"
            assigned={project.categories}
            all={allCategories}
            defaultColour={defaultColour}
            onAdd={(pick) => addCategoryToProject(project.id, pick)}
            onRemove={(categoryId) =>
              removeCategoryFromProject(project.id, categoryId)
            }
          />
          <p className="whitespace-pre font-label font-medium text-[13px] text-fg-muted">
            {`·   ${speakingTime(project.wordCount, rate)}  ·  ${wordsLine(project.wordCount)}`}
          </p>
        </div>
      </div>
      <StageStars
        stage={project.stage}
        onChange={(stage) =>
          startTransition(() => saveProject(project.id, { stage }))
        }
      />
    </header>
  );
}

/** The title as a heading you can type into; never saved blank. */
function TitleField({ id, saved }: { id: string; saved: string }) {
  const [value, setValue] = useState(saved);

  function commit() {
    const title = value.trim();
    if (!title) return setValue(saved);
    if (title !== saved) startTransition(() => saveProject(id, { title }));
  }

  return (
    <input
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
        if (e.key === "Escape") {
          setValue(saved);
          requestAnimationFrame(() => e.currentTarget?.blur());
        }
      }}
      aria-label="Project title"
      className="-mx-1.5 w-full rounded-lg border border-transparent bg-transparent px-1.5 font-bold font-heading text-[30px] text-fg outline-none hover:border-border-soft focus:border-accent focus:bg-surface-2"
    />
  );
}

/**
 * The stage as a row of seven stars: passed stages gold, the current one a
 * large glowing star, later ones faint. Clicking a star sets the stage.
 */
function StageStars({
  stage,
  onChange,
}: {
  stage: VideoStage;
  onChange: (stage: VideoStage) => void;
}) {
  const current = VIDEO_STAGES.indexOf(stage);
  return (
    <div className="flex shrink-0 flex-col items-end gap-2">
      <p className="font-label font-semibold text-[11px] text-fg-muted uppercase tracking-[1.1px]">
        Stage — click a star to move
      </p>
      <fieldset className="flex items-center">
        <legend className="sr-only">Stage</legend>
        {VIDEO_STAGES.map((s, i) => {
          const state =
            i < current ? "passed" : i === current ? "current" : "future";
          return (
            <div key={s} className="flex items-center">
              {i > 0 && (
                <span
                  aria-hidden
                  className={`h-[1.5px] w-[26px] ${i <= current ? "bg-gold" : "bg-border-strong"}`}
                />
              )}
              <button
                type="button"
                aria-pressed={state === "current"}
                aria-label={`Stage: ${STAGE_LABELS[s]}`}
                onClick={() => onChange(s)}
                className="group flex flex-col items-center gap-1"
              >
                <span className="flex h-[18px] items-center justify-center">
                  {state === "current" ? (
                    // The current star's glow spills past its 18 px box.
                    <span className="relative size-[18px]">
                      {/* biome-ignore lint/performance/noImgElement: decorative glow sprite sized past its box */}
                      <img
                        src="/design/star-current.svg"
                        alt=""
                        className="-inset-[66.67%] absolute size-[42px] max-w-none"
                      />
                    </span>
                  ) : (
                    // biome-ignore lint/performance/noImgElement: tiny decorative star
                    <img
                      src={
                        state === "passed"
                          ? "/design/star-passed.svg"
                          : "/design/star-future.svg"
                      }
                      alt=""
                      width={11}
                      height={11}
                      className="transition-transform group-hover:scale-125"
                    />
                  )}
                </span>
                <span
                  className={`font-label text-[10px] ${
                    state === "current"
                      ? "font-semibold text-accent-glow"
                      : state === "passed"
                        ? "font-medium text-fg-muted"
                        : "font-medium text-fg-faint group-hover:text-fg-muted"
                  }`}
                >
                  {STAGE_LABELS[s]}
                </span>
              </button>
            </div>
          );
        })}
      </fieldset>
    </div>
  );
}
