"use client";

import Image from "next/image";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import { checkYouTubeLink, isIsoDate, publishPrefill } from "@/lib/publish";
import { publishProjectAction } from "./actions";

type PublishDialogProps = {
  project: {
    id: string;
    title: string;
    youtubeLink: string | null;
    publishedOn: string | null;
  };
  /** Called after publishing and on Cancel; the dialog is then removed. */
  onClose: () => void;
};

/**
 * The publish dialog (spec §5.4, Figma A2–A2b): an optional YouTube link
 * and the publish date. Publish moves the project to the Archive; Cancel
 * leaves it where it was.
 */
export function PublishDialog({ project, onClose }: PublishDialogProps) {
  const [initial] = useState(() => publishPrefill(project, new Date()));
  const [link, setLink] = useState(initial.link);
  const [date, setDate] = useState(initial.date);
  const [failed, setFailed] = useState(false);
  const [pending, startTransition] = useTransition();
  const ids = useId();

  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close.current();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const check = checkYouTubeLink(link);
  const dateOk = isIsoDate(date);
  const canPublish = check.ok && dateOk && !pending;

  function publish(e: React.FormEvent) {
    e.preventDefault();
    if (!canPublish) return;
    setFailed(false);
    startTransition(async () => {
      try {
        await publishProjectAction(project.id, {
          youtubeLink: link,
          publishedOn: date,
        });
        onClose();
      } catch {
        setFailed(true);
      }
    });
  }

  const label =
    "font-label font-semibold text-[11px] text-fg-muted uppercase tracking-[1.1px]";
  const field =
    "flex items-center gap-2.5 rounded-xl border bg-surface-2 px-3.5 py-[9px]";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-canvas/75 backdrop-blur-[2px]">
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${ids}-title`}
        onSubmit={publish}
        className="flex w-[440px] flex-col gap-4 rounded-[18px] border border-gold/70 bg-surface-1 p-6 shadow-[0_12px_40px_rgb(0_0_0/0.6)]"
      >
        <div className="flex flex-col gap-2">
          <h2
            id={`${ids}-title`}
            className="flex items-center gap-2.5 font-bold font-heading text-[17px] text-gold"
          >
            <Image
              src="/design/icon-archive-gold.svg"
              alt=""
              width={18}
              height={18}
            />
            Publish to the Archive
          </h2>
          <p className="text-[15px] text-fg-muted">
            “{project.title}” leaves the board. Both fields can be changed later
            in the project header.
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${ids}-link`} className={label}>
            YouTube link
          </label>
          <div
            className={`${field} ${
              !check.ok
                ? "border-danger"
                : check.notYouTube
                  ? "border-amber"
                  : "border-border-strong focus-within:border-accent"
            }`}
          >
            <Image
              src="/design/icon-link-small.svg"
              alt=""
              width={16}
              height={16}
            />
            <input
              id={`${ids}-link`}
              type="url"
              // biome-ignore lint/a11y/noAutofocus: the dialog's first field
              autoFocus
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="https://youtu.be/… (optional)"
              aria-invalid={!check.ok}
              aria-describedby={`${ids}-link-note`}
              className="min-w-0 flex-1 bg-transparent text-[15px] text-fg outline-none placeholder:text-fg-faint"
            />
          </div>
          <p
            id={`${ids}-link-note`}
            className={`text-[13px] ${
              !check.ok
                ? "text-danger"
                : check.notYouTube
                  ? "text-amber"
                  : "text-fg-faint"
            }`}
          >
            {!check.ok
              ? check.error
              : check.notYouTube
                ? "This isn't a YouTube link. It is still accepted."
                : "Optional — you can add it later."}
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${ids}-date`} className={label}>
            Publish date
          </label>
          <div
            className={`${field} ${
              dateOk
                ? "border-border-strong focus-within:border-accent"
                : "border-danger"
            }`}
          >
            <Image
              src="/design/icon-clock-small.svg"
              alt=""
              width={14}
              height={14}
            />
            <input
              id={`${ids}-date`}
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              aria-describedby={`${ids}-date-note`}
              className="min-w-0 flex-1 bg-transparent text-[15px] text-fg outline-none [color-scheme:dark]"
            />
          </div>
          <p id={`${ids}-date-note`} className="text-[13px] text-fg-faint">
            {project.publishedOn
              ? "The date it was published before. Any date is allowed."
              : "Prefilled with today. Any date is allowed."}
          </p>
        </div>

        {failed && (
          <p role="alert" className="text-[13px] text-danger">
            Couldn't publish. Please try again.
          </p>
        )}

        <div className="flex gap-2.5 pt-1">
          <button
            type="submit"
            disabled={!canPublish}
            className="rounded-xl bg-accent px-[18px] py-2.5 font-bold font-heading text-[13px] text-canvas tracking-[0.78px] shadow-[0_0_16px_rgb(157_107_255/0.45)] disabled:opacity-50"
          >
            {pending ? "Publishing…" : "Publish"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-[18px] py-2.5 font-bold font-heading text-[13px] text-accent-glow tracking-[0.78px]"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
