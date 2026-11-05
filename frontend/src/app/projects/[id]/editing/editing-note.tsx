"use client";

import { useId } from "react";
import { useAutosave } from "@/components/use-autosave";
import { saveProject } from "../../actions";

type EditingNoteProps = { projectId: string; saved: string };

/** One plain note per project, saved as you type, like the idea note. */
export function EditingNote({ projectId, saved }: EditingNoteProps) {
  const id = useId();
  const { value, change, blur } = useAutosave(saved, (editingNote) =>
    saveProject(projectId, { editingNote }),
  );

  return (
    <section
      aria-labelledby={`${id}-label`}
      className="flex flex-col gap-3 rounded-[18px] border border-border-soft bg-surface-1 p-5"
    >
      <div className="flex items-baseline">
        <label
          id={`${id}-label`}
          htmlFor={id}
          className="font-label font-semibold text-[11px] text-fg-muted uppercase tracking-[1.1px]"
        >
          Editing notes
        </label>
        <span className="flex-1" />
        <span className="font-label text-[11px] text-fg-faint">
          Saved as you type
        </span>
      </div>
      <textarea
        id={id}
        value={value}
        onChange={(e) => change(e.target.value)}
        onBlur={blur}
        rows={6}
        placeholder="Cuts, music, pacing notes…"
        className="field-sizing-content min-h-40 w-full resize-none rounded-[10px] border border-border-strong bg-surface-2 px-4 py-3 text-[16px] text-fg leading-relaxed outline-none transition-shadow placeholder:text-fg-faint placeholder:italic focus:border-accent focus:shadow-[0_0_12px_rgb(158_107_255/0.35)]"
      />
    </section>
  );
}
