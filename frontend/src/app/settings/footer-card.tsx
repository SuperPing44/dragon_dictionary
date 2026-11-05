"use client";

import { useId } from "react";
import { useAutosave } from "@/components/use-autosave";
import { saveDescriptionFooter } from "./actions";

/**
 * The description footer: plain text added after the source list in every
 * project's copied description. Saved as you type.
 */
export function FooterCard({ saved }: { saved: string }) {
  const id = useId();
  const { value, change, blur } = useAutosave(saved, saveDescriptionFooter);

  return (
    <section
      aria-labelledby={`${id}-label`}
      className="flex max-w-[720px] flex-col gap-3 rounded-[18px] border border-border-soft bg-surface-1 p-5"
    >
      <div className="flex items-baseline">
        <label
          id={`${id}-label`}
          htmlFor={id}
          className="font-label font-semibold text-[11px] text-fg-muted uppercase tracking-[1.1px]"
        >
          Description footer
        </label>
        <span className="flex-1" />
        <span className="font-label text-[11px] text-fg-faint">
          Saved as you type
        </span>
      </div>
      <p className="text-[15px] text-fg-muted leading-snug">
        Added after the source list in every video’s description when you copy
        it. Changing it changes the copied description of every project.
      </p>
      <textarea
        id={id}
        value={value}
        onChange={(e) => change(e.target.value)}
        onBlur={blur}
        rows={3}
        placeholder="Channel links, socials, sign-off…"
        className="field-sizing-content min-h-24 w-full resize-none rounded-[10px] border border-border-strong bg-surface-2 px-4 py-3 text-[16px] text-fg leading-relaxed outline-none transition-shadow placeholder:text-fg-faint placeholder:italic focus:border-accent focus:shadow-[0_0_12px_rgb(158_107_255/0.35)]"
      />
    </section>
  );
}
