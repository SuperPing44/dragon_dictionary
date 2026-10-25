"use client";

import Image from "next/image";
import { startTransition, useState } from "react";
import { captureIdea } from "./actions";

/** Title-only capture: Enter saves and clears the field at once. */
export function QuickCapture() {
  const [title, setTitle] = useState("");

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!title.trim()) return;
    setTitle("");
    startTransition(() => captureIdea(title));
  }

  return (
    <form
      onSubmit={submit}
      className="flex items-center gap-3 rounded-2xl border border-accent bg-surface-2 px-[18px] py-3.5 shadow-[0_0_22px_rgb(158_107_255/0.28)]"
    >
      <Image
        src="/design/icon-sparkle-capture.svg"
        alt=""
        width={22}
        height={22}
      />
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        aria-label="Idea title"
        placeholder="Capture an idea — just a title, press Enter to keep it"
        autoComplete="off"
        // biome-ignore lint/a11y/noAutofocus: quick capture is the screen's main action
        autoFocus
        className="min-w-0 flex-1 bg-transparent text-[19px] text-fg outline-none placeholder:text-fg-faint"
      />
      <kbd className="rounded-md border border-border-strong bg-surface-3 px-2 py-[3px] font-label font-medium text-fg-muted text-xs">
        Enter ↵
      </kbd>
    </form>
  );
}
