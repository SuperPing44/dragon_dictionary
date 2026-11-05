"use client";

import Image from "next/image";
import Link from "next/link";
import { useId, useState } from "react";
import { useAutosave } from "@/components/use-autosave";
import { DESCRIPTION_LIMIT, descriptionCopyText } from "@/lib/description";
import { leftOutNote, sourceList } from "@/lib/sources";
import { saveProject } from "../../actions";

type DescriptionProps = {
  projectId: string;
  saved: string;
  /** The project's linked sources, in link order. */
  sources: { title: string; link: string | null }[];
  footer: string;
};

/**
 * The Description card (spec §5.2, Figma F1): your text, a read-only
 * preview of what Copy adds (source list and footer), and Copy description
 * with a counter against YouTube's 5,000 characters.
 */
export function Description({
  projectId,
  saved,
  sources,
  footer,
}: DescriptionProps) {
  const id = useId();
  const { value, change, blur } = useAutosave(saved, (description) =>
    saveProject(projectId, { description }),
  );
  const [copied, setCopied] = useState(false);
  const { lines, leftOut } = sourceList(sources);
  const copyText = descriptionCopyText({ text: value, sources, footer });
  const over = copyText.length > DESCRIPTION_LIMIT;

  async function copy() {
    await navigator.clipboard.writeText(copyText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <section
      aria-labelledby={`${id}-label`}
      className="flex flex-col gap-4 rounded-[18px] border border-border-soft bg-surface-1 p-5"
    >
      <div className="flex items-center gap-3">
        <label id={`${id}-label`} htmlFor={id} className={LABEL}>
          Description
        </label>
        <span className="flex-1" />
        {copied && (
          <output className="font-label text-fg-muted text-xs">Copied ✓</output>
        )}
        <span
          className={`font-label text-[12px] tabular-nums ${over ? "text-amber" : "text-fg-faint"}`}
        >
          {copyText.length.toLocaleString("en")}/
          {DESCRIPTION_LIMIT.toLocaleString("en")}
        </span>
        <button
          type="button"
          onClick={copy}
          disabled={copyText === ""}
          className="rounded-xl bg-accent px-[18px] py-2.5 font-bold font-heading text-[13px] text-canvas tracking-[0.78px] shadow-[0_4px_9px_rgb(157_107_255/0.45)] disabled:opacity-50"
        >
          Copy description
        </button>
      </div>

      <textarea
        id={id}
        value={value}
        onChange={(e) => change(e.target.value)}
        onBlur={blur}
        rows={5}
        placeholder="What the video is about, chapters, links…"
        className="field-sizing-content min-h-32 w-full resize-none rounded-[10px] border border-border-strong bg-surface-2 px-4 py-3 text-[16px] text-fg leading-relaxed outline-none transition-shadow placeholder:text-fg-faint placeholder:italic focus:border-accent focus:shadow-[0_0_12px_rgb(158_107_255/0.35)]"
      />

      <section
        aria-label="Added when you copy"
        className="flex flex-col gap-3 rounded-[12px] border border-border-strong border-dashed px-4 py-3.5"
      >
        <div className="flex items-baseline">
          <h3 className={LABEL}>Added when you copy</h3>
          <span className="flex-1" />
          <span className="font-label text-[11px] text-fg-faint">
            read-only · always current
          </span>
        </div>

        {lines.length > 0 ? (
          <div className="flex flex-col gap-1 break-words text-[15px] text-fg-muted">
            <p className="font-semibold text-fg">Sources:</p>
            {lines.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
        ) : (
          <p className="text-[15px] text-fg-faint italic">
            No linked sources with a link, so no source list.
          </p>
        )}
        {leftOut > 0 && (
          <p className="flex items-center gap-2 font-label text-fg-faint text-xs">
            <Image
              src="/design/icon-alert-small.svg"
              alt=""
              width={14}
              height={14}
            />
            {leftOutNote(leftOut)}
          </p>
        )}

        <div className="flex flex-col gap-1.5 border-border-soft border-t pt-3">
          <div className="flex items-baseline gap-2">
            <h3 className={LABEL}>Footer</h3>
            <span className="font-label text-[11px] text-fg-faint">
              · shared by all videos
            </span>
            <span className="flex-1" />
            <Link
              href="/settings"
              className="font-label font-medium text-[13px] text-accent-glow hover:underline"
            >
              Edit in Settings →
            </Link>
          </div>
          {footer.trim() ? (
            <p className="whitespace-pre-wrap break-words text-[15px] text-fg-muted">
              {footer.trimEnd()}
            </p>
          ) : (
            <p className="text-[15px] text-fg-faint italic">No footer yet.</p>
          )}
        </div>
      </section>
    </section>
  );
}

const LABEL =
  "font-label font-semibold text-[11px] text-fg-muted uppercase tracking-[1.1px]";
