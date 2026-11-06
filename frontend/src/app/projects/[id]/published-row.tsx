"use client";

import Image from "next/image";
import { startTransition, useId, useRef, useState } from "react";
import { checkYouTubeLink, isIsoDate } from "@/lib/publish";
import { saveProject } from "../actions";

type PublishedRowProps = {
  id: string;
  youtubeLink: string | null;
  publishedOn: string | null;
};

/**
 * The header's Published row (spec §5.4, Figma A3): the publish date and
 * the YouTube link, both editable, and "Open on YouTube ↗".
 */
export function PublishedRow({
  id,
  youtubeLink,
  publishedOn,
}: PublishedRowProps) {
  const ids = useId();
  const [link, setLink] = useState(youtubeLink ?? "");
  const [savedLink, setSavedLink] = useState(youtubeLink ?? "");
  const check = checkYouTubeLink(link);
  // Escape restores the saved link; the blur that follows mustn't save.
  const cancelled = useRef(false);

  function saveDate(value: string) {
    // Cleared means "No date"; a half-typed date isn't saved.
    if (value !== "" && !isIsoDate(value)) return;
    const next = value === "" ? null : value;
    if (next === publishedOn) return;
    startTransition(() => saveProject(id, { publishedOn: next }));
  }

  function commitLink() {
    if (cancelled.current) {
      cancelled.current = false;
      return;
    }
    if (!check.ok) return;
    const next = check.link ?? "";
    setLink(next);
    if (next === savedLink) return;
    setSavedLink(next);
    startTransition(() => saveProject(id, { youtubeLink: next }));
  }

  const note = !check.ok
    ? { text: check.error, className: "text-danger" }
    : check.notYouTube
      ? {
          text: "This isn't a YouTube link. It is still accepted.",
          className: "text-amber",
        }
      : null;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-3">
        <span className="font-label font-semibold text-[11px] text-gold uppercase tracking-[1.1px]">
          Published
        </span>
        <label className="flex items-center gap-2 rounded-lg border border-border-soft bg-surface-2 px-2.5 py-1 focus-within:border-accent">
          <Image
            src="/design/icon-clock-small.svg"
            alt=""
            width={14}
            height={14}
          />
          <input
            type="date"
            defaultValue={publishedOn ?? ""}
            onChange={(e) => saveDate(e.target.value)}
            aria-label="Publish date"
            className="bg-transparent font-label text-[13px] text-fg outline-none [color-scheme:dark]"
          />
        </label>
        <label
          className={`flex w-[300px] items-center gap-2 rounded-lg border bg-surface-2 px-2.5 py-1 ${
            !check.ok
              ? "border-danger"
              : check.notYouTube
                ? "border-amber"
                : "border-border-soft focus-within:border-accent"
          }`}
        >
          <Image
            src="/design/icon-link-small.svg"
            alt=""
            width={14}
            height={14}
          />
          <input
            type="url"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            onBlur={commitLink}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
              if (e.key === "Escape") {
                cancelled.current = true;
                setLink(savedLink);
                e.currentTarget.blur();
              }
            }}
            placeholder="Add the YouTube link"
            aria-label="YouTube link"
            aria-invalid={!check.ok}
            aria-describedby={note ? `${ids}-note` : undefined}
            className="min-w-0 flex-1 bg-transparent font-label text-[13px] text-fg outline-none placeholder:text-amber"
          />
        </label>
        {savedLink && (
          <a
            href={savedLink}
            target="_blank"
            rel="noopener noreferrer"
            className="font-label font-medium text-[13px] text-accent-glow hover:underline"
          >
            Open on YouTube ↗
          </a>
        )}
      </div>
      {note && (
        <p id={`${ids}-note`} className={`text-[12px] ${note.className}`}>
          {note.text}
        </p>
      )}
    </div>
  );
}
