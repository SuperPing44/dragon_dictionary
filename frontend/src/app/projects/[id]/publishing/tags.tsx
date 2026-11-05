"use client";

import { startTransition, useOptimistic, useState } from "react";
import {
  hasTag,
  splitTagInput,
  TAGS_LIMIT,
  type TagUsage,
  tagSuggestions,
  tagsCopyText,
} from "@/lib/tags";
import { addTagsAction, removeTagAction } from "../../actions";

type TagsProps = {
  projectId: string;
  tags: string[];
  /** Tags used on other projects, for suggestions. */
  usage: TagUsage[];
};

type TagChange = { add: string[] } | { remove: string };

/**
 * The Tags card (spec §5.2, Figma F1): chips with suggestions from other
 * projects, and Copy with a check against YouTube's 500 characters.
 */
export function Tags({ projectId, tags, usage }: TagsProps) {
  const [list, change] = useOptimistic(tags, (current, c: TagChange) => {
    if ("remove" in c) {
      const key = c.remove.toLowerCase();
      return current.filter((t) => t.toLowerCase() !== key);
    }
    const next = [...current];
    for (const t of c.add) if (!hasTag(next, t)) next.push(t);
    return next;
  });
  const [text, setText] = useState("");
  const [highlight, setHighlight] = useState(-1);
  const [copied, setCopied] = useState(false);
  const suggestions = tagSuggestions(usage, text, list);
  const copyText = tagsCopyText(list);

  function add(texts: string[]) {
    const fresh = texts
      .map((t) => t.trim())
      .filter((t) => t && !hasTag(list, t));
    if (fresh.length === 0) return;
    startTransition(async () => {
      change({ add: fresh });
      await addTagsAction(projectId, fresh);
    });
  }

  function remove(tag: string) {
    startTransition(async () => {
      change({ remove: tag });
      await removeTagAction(projectId, tag);
    });
  }

  function type(value: string) {
    const { add: complete, rest } = splitTagInput(value);
    add(complete);
    setText(rest);
    setHighlight(-1);
  }

  function enter() {
    const picked = suggestions[highlight];
    add([picked ? picked.text : text]);
    setText("");
    setHighlight(-1);
  }

  function keyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    const keys: Record<string, () => void> = {
      Enter: enter,
      Escape: () => {
        setText("");
        setHighlight(-1);
      },
      ArrowDown: () =>
        setHighlight((h) => Math.min(h + 1, suggestions.length - 1)),
      ArrowUp: () => setHighlight((h) => Math.max(h - 1, -1)),
    };
    if (e.key === "Backspace" && text === "" && list.length > 0) {
      e.preventDefault();
      remove(list[list.length - 1]);
      return;
    }
    const handler = keys[e.key];
    if (!handler) return;
    e.preventDefault();
    handler();
  }

  async function copy() {
    await navigator.clipboard.writeText(copyText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <section
      aria-labelledby="tags-label"
      className="flex flex-col gap-3 rounded-[18px] border border-border-soft bg-surface-1 p-5"
    >
      <div className="flex items-baseline gap-3">
        <h2 id="tags-label" className={LABEL}>
          Tags
        </h2>
        <span className="flex-1" />
        <span className="font-label text-[11px] text-fg-faint">
          Enter or comma adds · Backspace removes the last
        </span>
      </div>

      <div className="relative">
        <div className="flex flex-wrap items-center gap-2 rounded-[10px] border border-border-strong bg-surface-2 p-2.5 transition-shadow focus-within:border-accent focus-within:shadow-[0_0_12px_rgb(158_107_255/0.35)]">
          {list.length > 0 && (
            <ul aria-label="Tags of this project" className="contents">
              {list.map((tag) => (
                <li
                  key={tag.toLowerCase()}
                  className="flex items-center gap-1.5 rounded-lg border border-border-strong bg-surface-3 py-1 pr-2 pl-2.5 font-label text-[13px] text-fg"
                >
                  {tag}
                  <button
                    type="button"
                    aria-label={`Remove ${tag}`}
                    onClick={() => remove(tag)}
                    className="text-fg-muted leading-none hover:text-fg"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
          <input
            value={text}
            onChange={(e) => type(e.target.value)}
            onKeyDown={keyDown}
            onBlur={() => setHighlight(-1)}
            aria-label="Add a tag"
            aria-autocomplete="list"
            placeholder={list.length === 0 ? "Add a tag…" : ""}
            className="min-w-24 flex-1 bg-transparent px-1 py-1 font-label text-[14px] text-fg outline-none placeholder:text-fg-faint placeholder:italic"
          />
        </div>

        {suggestions.length > 0 && (
          <div className="absolute top-full left-0 z-20 mt-1 flex w-64 flex-col gap-0.5 rounded-xl border border-border-strong bg-surface-3 p-1.5 shadow-[0_8px_24px_rgb(0_0_0/0.5)]">
            {suggestions.map((s, i) => (
              <button
                key={s.text}
                type="button"
                tabIndex={-1}
                onMouseDown={(e) => {
                  e.preventDefault();
                  add([s.text]);
                  setText("");
                  setHighlight(-1);
                }}
                className={`flex items-baseline gap-3 rounded-lg px-2.5 py-1.5 text-left font-label text-[14px] text-fg ${
                  i === highlight ? "bg-surface-2" : "hover:bg-surface-2"
                }`}
              >
                <span className="min-w-0 flex-1 truncate">{s.text}</span>
                <span className="shrink-0 text-[11px] text-fg-faint">
                  {s.projects === 1 ? "1 project" : `${s.projects} projects`}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <span
          className={`font-label text-[12px] tabular-nums ${
            copyText.length > TAGS_LIMIT ? "text-amber" : "text-fg-faint"
          }`}
        >
          {copyText.length}/{TAGS_LIMIT} characters
        </span>
        <span className="flex-1" />
        {copied && (
          <output className="font-label text-fg-muted text-xs">Copied ✓</output>
        )}
        <button
          type="button"
          onClick={copy}
          disabled={list.length === 0}
          className="rounded-xl border border-border-strong bg-surface-3 px-[18px] py-2.5 font-bold font-heading text-[13px] text-accent-glow tracking-[0.78px] hover:border-accent disabled:opacity-50"
        >
          Copy
        </button>
      </div>
    </section>
  );
}

const LABEL =
  "font-label font-semibold text-[11px] text-fg-muted uppercase tracking-[1.1px]";
