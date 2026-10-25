"use client";

import Image from "next/image";
import { useState } from "react";

/** The idea the project came from: a read-only strip, collapsed at first. */
export function OriginalIdea({
  note,
  rating,
}: {
  note: string | null;
  rating: number | null;
}) {
  const [open, setOpen] = useState(false);
  return (
    <section
      aria-label="Original idea"
      className="flex items-start gap-2.5 rounded-xl border border-gold/35 bg-gold/5 px-3.5 py-[9px]"
    >
      <Image
        src="/design/icon-sparkle-gold.svg"
        alt=""
        width={15}
        height={15}
        className="mt-px"
      />
      <p className="mt-px shrink-0 font-label font-semibold text-[11px] text-gold uppercase tracking-[1.1px]">
        Original idea
      </p>
      <p className="shrink-0 font-label font-semibold text-gold text-xs">
        {rating === null ? "Unrated" : `Rated ${rating}`}
      </p>
      <p
        className={`min-w-0 flex-1 text-[16px] text-fg-muted italic leading-tight ${
          open ? "whitespace-pre-wrap" : "truncate"
        }`}
      >
        {note ? `“${note}”` : "No note"}
      </p>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="shrink-0 font-label font-medium text-fg-faint text-xs hover:text-fg-muted"
      >
        Read-only · {open ? "hide ▴" : "show ▾"}
      </button>
    </section>
  );
}
