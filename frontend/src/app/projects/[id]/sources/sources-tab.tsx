"use client";

import Image from "next/image";
import Link from "next/link";
import { startTransition, useState } from "react";
import type { Source } from "@/db/schema";
import type { SourceWithProjects } from "@/db/sources";
import { SOURCE_TYPE_SHORT, sourceList } from "@/lib/sources";
import { linkSourceAction, unlinkSourceAction } from "../../actions";

const MAX_MATCHES = 6;

type SourcesTabProps = {
  projectId: string;
  /** Linked sources in the order they were linked. */
  linked: Source[];
  /** The whole library, for the picker. */
  library: SourceWithProjects[];
};

const meta = (s: Source) =>
  [SOURCE_TYPE_SHORT[s.type], s.author, s.publisher, s.date]
    .filter(Boolean)
    .join(" · ");

/**
 * The project's Sources tab: search the library and link in one click,
 * create a new source and link it, unlink, and copy the source list.
 */
export function SourcesTab({ projectId, linked, library }: SourcesTabProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const linkedIds = new Set(linked.map((s) => s.id));
  const q = query.trim().toLowerCase();
  const matches = library
    .filter((s) => !linkedIds.has(s.id))
    .filter(
      (s) =>
        !q ||
        s.title.toLowerCase().includes(q) ||
        (s.author ?? "").toLowerCase().includes(q),
    )
    .slice(0, MAX_MATCHES);
  const createHref = `/sources/new?project=${projectId}${
    query.trim() ? `&title=${encodeURIComponent(query.trim())}` : ""
  }`;

  function link(sourceId: string) {
    setQuery("");
    setOpen(false);
    startTransition(() => linkSourceAction(projectId, sourceId));
  }

  return (
    <div className="flex items-start gap-5">
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="flex items-center gap-3">
          <div className="relative min-w-0 flex-1">
            <label className="flex items-center gap-2.5 rounded-xl border border-border-strong bg-surface-2 px-3.5 py-2.5 focus-within:border-accent focus-within:shadow-[0_0_14px_rgb(158_107_255/0.3)]">
              <Image
                src="/design/icon-search.svg"
                alt=""
                width={18}
                height={18}
              />
              <input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setOpen(true);
                }}
                onFocus={() => setOpen(true)}
                onClick={() => setOpen(true)}
                onBlur={() => setOpen(false)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") setOpen(false);
                  if (e.key === "Enter" && matches[0]) link(matches[0].id);
                }}
                placeholder="Find a source in the library to link"
                aria-label="Find a source to link"
                className="min-w-0 flex-1 bg-transparent text-[18px] text-fg outline-none placeholder:text-fg-faint"
              />
            </label>
            {open && (
              <div className="absolute top-full left-0 z-20 mt-1.5 flex w-[540px] max-w-full flex-col gap-0.5 rounded-[14px] border border-border-strong bg-surface-3 p-2 shadow-[0_10px_30px_rgb(0_0_0/0.55)]">
                <p className="px-2 pb-1 font-label font-semibold text-[11px] text-fg-faint uppercase tracking-[0.88px]">
                  From the source library
                </p>
                {matches.length === 0 && (
                  <p className="px-3 py-2 text-[15px] text-fg-muted italic">
                    {library.length === linked.length
                      ? "Every library source is already linked."
                      : "No matching source in the library."}
                  </p>
                )}
                {matches.map((s, i) => (
                  <div
                    key={s.id}
                    className={`group flex items-center gap-3 rounded-[10px] px-3 py-[9px] hover:bg-surface-2 ${i === 0 && q ? "bg-surface-2" : ""}`}
                  >
                    <div className="flex min-w-0 flex-1 flex-col">
                      <p className="truncate font-semibold text-[17px] text-fg">
                        {s.title}
                      </p>
                      <p className="truncate font-label text-fg-faint text-xs">
                        {[s.author, SOURCE_TYPE_SHORT[s.type]]
                          .filter(Boolean)
                          .join(" · ")}{" "}
                        ·{" "}
                        {s.projects === 0
                          ? "Not linked yet"
                          : `Linked to ${s.projects} ${s.projects === 1 ? "project" : "projects"}`}
                      </p>
                    </div>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => link(s.id)}
                      aria-label={`Link ${s.title}`}
                      className="rounded-xl px-[18px] py-2.5 font-bold font-heading text-[13px] text-accent-glow tracking-[0.78px] group-hover:bg-accent group-hover:text-canvas"
                    >
                      Link
                    </button>
                  </div>
                ))}
                <Link
                  href={createHref}
                  onMouseDown={(e) => e.preventDefault()}
                  className="flex items-center gap-2 px-3 py-2.5 font-label font-medium text-[13px] text-accent-glow hover:underline"
                >
                  <Image
                    src="/design/icon-plus.svg"
                    alt=""
                    width={16}
                    height={16}
                  />
                  {query.trim()
                    ? `Create new source “${query.trim()}” and link it`
                    : "Create a new source and link it"}
                </Link>
              </div>
            )}
          </div>
          <Link
            href={`/sources/new?project=${projectId}`}
            className="rounded-xl border border-border-strong bg-surface-3 px-[18px] py-2.5 font-bold font-heading text-[13px] text-accent-glow tracking-[0.78px]"
          >
            + New source
          </Link>
        </div>

        {linked.length === 0 ? (
          <p className="text-[17px] text-fg-muted italic">
            No sources linked yet. Find one in the library above, or create a
            new one.
          </p>
        ) : (
          <ul
            aria-label="Linked sources"
            className="overflow-hidden rounded-[18px] border border-border-soft bg-surface-1"
          >
            {linked.map((s) => (
              <li
                key={s.id}
                className="flex items-center gap-3.5 border-border-soft border-t px-[18px] py-[13px] first:border-t-0"
              >
                <span className="rounded-[10px] bg-surface-3 p-2">
                  <Image
                    src={`/design/type-${s.type}.svg`}
                    alt=""
                    width={18}
                    height={18}
                  />
                </span>
                <Link
                  href={`/sources/${s.id}`}
                  className="flex min-w-0 flex-1 flex-col gap-px hover:underline"
                >
                  <span className="truncate font-semibold text-[18px] text-fg">
                    {s.title}
                  </span>
                  <span className="truncate font-label text-fg-faint text-xs">
                    {meta(s)}
                  </span>
                </Link>
                <button
                  type="button"
                  onClick={() =>
                    startTransition(() => unlinkSourceAction(projectId, s.id))
                  }
                  aria-label={`Unlink ${s.title}`}
                  className="font-label font-medium text-fg-muted text-xs hover:text-fg"
                >
                  Unlink
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <SourceListCard linked={linked} />
    </div>
  );
}

/** "Title – link" lines for the video description, with a Copy button. */
function SourceListCard({ linked }: { linked: Source[] }) {
  const { text, lines, leftOut } = sourceList(linked);
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex w-[420px] shrink-0 flex-col gap-4">
      <section
        aria-label="Source list"
        className="flex flex-col gap-3 rounded-[18px] border border-border-soft bg-surface-1 p-5"
      >
        <div className="flex items-center gap-2">
          <Image
            src="/design/icon-source-list.svg"
            alt=""
            width={18}
            height={18}
          />
          <h2 className="font-bold font-heading text-[18px] text-fg">
            Source list
          </h2>
          <span className="flex-1" />
          {copied && (
            <output className="font-label text-fg-muted text-xs">
              Copied ✓
            </output>
          )}
          <button
            type="button"
            onClick={copy}
            disabled={lines.length === 0}
            className="rounded-xl bg-accent px-[18px] py-2.5 font-bold font-heading text-[13px] text-canvas tracking-[0.78px] shadow-[0_4px_9px_rgb(157_107_255/0.45)] disabled:opacity-50"
          >
            Copy
          </button>
        </div>
        <p className="text-[15px] text-fg-muted italic leading-[19px]">
          For the video description. Linked sources with a link, in the order
          you linked them.
        </p>
        {lines.length > 0 ? (
          <div className="flex flex-col gap-2 break-words rounded-xl border border-border-soft bg-canvas p-3.5 font-label text-[12.5px] text-fg leading-[18px]">
            {lines.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
        ) : (
          <p className="text-[15px] text-fg-faint italic">
            Nothing to list yet.
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
            {leftOut === 1
              ? "1 linked source has no link and is left out."
              : `${leftOut} linked sources have no link and are left out.`}
          </p>
        )}
      </section>
      <p className="flex items-center gap-2.5 rounded-[14px] border border-border-strong border-dashed px-4 py-3.5 text-[16px] text-fg-muted italic">
        <Image
          src="/design/icon-sparkle-panel.svg"
          alt=""
          width={16}
          height={16}
        />
        Always current — no regenerate step.
      </p>
    </div>
  );
}
