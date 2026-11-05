"use client";

import Image from "next/image";
import { startTransition, useOptimistic, useState } from "react";
import {
  type BrollGroup,
  brollCopyText,
  brollProgress,
  type ExtraBrollItem,
} from "@/lib/broll";
import {
  addBrollItemAction,
  deleteBrollItemAction,
  editBrollItemAction,
  setBrollItemFoundAction,
  setScriptItemFoundAction,
} from "../../actions";

type BrollListProps = {
  projectId: string;
  groups: BrollGroup[];
  extras: ExtraBrollItem[];
};

/** A tick waiting for the server: a script item's key or an extra's ID. */
type Tick = { key: string; found: boolean };

const scriptKey = (sectionId: string, index: number) => `${sectionId}:${index}`;

/**
 * The B-roll list (spec §5.2, Figma F3): the script's stage directions,
 * live and in script order, then the Extra items. Every item can be ticked
 * as found; script ticks are saved on the stage direction (ADR 0003).
 */
export function BrollList({ projectId, groups, extras }: BrollListProps) {
  const [ticks, tick] = useOptimistic(
    new Map<string, boolean>(),
    (current, t: Tick) => new Map(current).set(t.key, t.found),
  );
  const [copied, setCopied] = useState(false);

  const shownGroups = groups.map((g) => ({
    ...g,
    items: g.items.map((i) => ({
      ...i,
      found: ticks.get(scriptKey(i.sectionId, i.index)) ?? i.found,
    })),
  }));
  const shownExtras = extras.map((e) => ({
    ...e,
    found: ticks.get(e.id) ?? e.found,
  }));
  const { found, total } = brollProgress(shownGroups, shownExtras);

  function setFound(key: string, value: boolean, save: () => Promise<void>) {
    startTransition(async () => {
      tick({ key, found: value });
      await save();
    });
  }

  async function copy() {
    await navigator.clipboard.writeText(
      brollCopyText(shownGroups, shownExtras),
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <section
      aria-labelledby="broll-label"
      className="flex flex-col gap-4 rounded-[18px] border border-border-soft bg-surface-1 p-5"
    >
      <div className="flex items-center gap-4">
        <h2 id="broll-label" className={LABEL}>
          B-roll list
        </h2>
        <div
          role="progressbar"
          aria-label="Found"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={found}
          className="h-1.5 w-32 overflow-hidden rounded-full bg-surface-3"
        >
          <div
            className="h-full rounded-full bg-accent transition-[width]"
            style={{ width: total ? `${(found / total) * 100}%` : 0 }}
          />
        </div>
        <span className="font-label text-[13px] text-fg-muted tabular-nums">
          {found}/{total} found
        </span>
        <span className="flex-1" />
        {copied && (
          <output className="font-label text-fg-muted text-xs">Copied ✓</output>
        )}
        <button
          type="button"
          onClick={copy}
          disabled={total === 0}
          className="rounded-xl border border-border-strong bg-surface-3 px-[18px] py-2.5 font-bold font-heading text-[13px] text-accent-glow tracking-[0.78px] hover:border-accent disabled:opacity-50"
        >
          Copy list
        </button>
      </div>

      <p className="text-[14px] text-fg-faint italic">
        Collected live from the script’s image directions, in script order.
        Descriptions are edited in the script.
      </p>

      {shownGroups.length === 0 && (
        <p className="text-[15px] text-fg-muted italic">
          No image directions in the script yet.
        </p>
      )}
      {shownGroups.map((group) => (
        <div key={group.sectionId} className="flex flex-col gap-1">
          <h3 className="font-heading font-semibold text-[15px] text-fg">
            {group.label}
          </h3>
          <ul className="flex flex-col">
            {group.items.map((item) => (
              <li key={item.index}>
                <ItemRow
                  icon="/design/icon-image-chip.svg"
                  label={item.description}
                  found={item.found}
                  onFound={(value) =>
                    setFound(scriptKey(item.sectionId, item.index), value, () =>
                      setScriptItemFoundAction(
                        item.sectionId,
                        item.index,
                        value,
                      ),
                    )
                  }
                />
              </li>
            ))}
          </ul>
        </div>
      ))}

      <div className="flex flex-col gap-1 border-border-soft border-t pt-4">
        <div className="flex items-baseline gap-2">
          <h3 className={LABEL}>Extra</h3>
          <span className="font-label text-[11px] text-fg-faint">
            · not in the script
          </span>
        </div>
        <ul className="flex flex-col">
          {shownExtras.map((extra) => (
            <li key={extra.id}>
              <ExtraRow
                item={extra}
                onFound={(value) =>
                  setFound(extra.id, value, () =>
                    setBrollItemFoundAction(extra.id, value),
                  )
                }
              />
            </li>
          ))}
        </ul>
        <AddExtra projectId={projectId} />
      </div>
    </section>
  );
}

type ItemRowProps = {
  icon: string;
  label: string;
  found: boolean;
  onFound: (found: boolean) => void;
  children?: React.ReactNode;
};

/** A checkbox row; ticked items are dimmed. */
function ItemRow({ icon, label, found, onFound, children }: ItemRowProps) {
  return (
    <div className="group flex items-center gap-3 rounded-[10px] border border-transparent px-2.5 py-2 hover:border-border-soft hover:bg-surface-2">
      <input
        type="checkbox"
        checked={found}
        onChange={(e) => onFound(e.target.checked)}
        aria-label={`Found: ${label}`}
        className="size-[18px] shrink-0 cursor-pointer accent-accent"
      />
      <Image src={icon} alt="" width={15} height={15} className="shrink-0" />
      <div
        className={`min-w-0 flex-1 text-[16px] ${found ? "text-fg-faint" : "text-fg"}`}
      >
        {children ?? label}
      </div>
    </div>
  );
}

function ExtraRow({
  item,
  onFound,
}: {
  item: ExtraBrollItem;
  onFound: (found: boolean) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item.text);

  function commit() {
    setEditing(false);
    const clean = draft.trim();
    if (!clean) return setDraft(item.text);
    if (clean !== item.text) {
      startTransition(() => editBrollItemAction(item.id, clean));
    }
  }

  return (
    <ItemRow
      icon="/design/icon-plus-small.svg"
      label={item.text}
      found={item.found}
      onFound={onFound}
    >
      <div className="flex items-center gap-2">
        {editing ? (
          <input
            // biome-ignore lint/a11y/noAutofocus: opened by a click on the text
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
              if (e.key === "Escape") {
                setDraft(item.text);
                setEditing(false);
              }
            }}
            aria-label="Extra item"
            className="min-w-0 flex-1 rounded-md border border-accent bg-surface-2 px-2 py-0.5 text-[16px] text-fg outline-none"
          />
        ) : (
          <button
            type="button"
            onClick={() => {
              setDraft(item.text);
              setEditing(true);
            }}
            className="min-w-0 flex-1 cursor-text truncate text-left"
          >
            {item.text}
          </button>
        )}
        <button
          type="button"
          aria-label={`Delete ${item.text}`}
          onClick={() => startTransition(() => deleteBrollItemAction(item.id))}
          className="shrink-0 rounded p-0.5 opacity-0 transition-opacity hover:bg-surface-3 focus-visible:opacity-100 group-hover:opacity-100"
        >
          <Image src="/design/icon-x.svg" alt="" width={14} height={14} />
        </button>
      </div>
    </ItemRow>
  );
}

function AddExtra({ projectId }: { projectId: string }) {
  const [text, setText] = useState("");
  return (
    <div className="mt-1 flex items-center gap-2.5 rounded-[10px] border border-border-strong bg-surface-2 px-3.5 transition-shadow focus-within:border-accent focus-within:shadow-[0_0_12px_rgb(158_107_255/0.35)]">
      <Image src="/design/icon-plus-small.svg" alt="" width={14} height={14} />
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key !== "Enter") return;
          e.preventDefault();
          const clean = text.trim();
          if (!clean) return;
          setText("");
          startTransition(() => addBrollItemAction(projectId, clean));
        }}
        aria-label="Add an extra item"
        placeholder="Add an extra item… (clip, music, map to make)"
        className="min-w-0 flex-1 bg-transparent py-2.5 text-[16px] text-fg outline-none placeholder:text-fg-faint placeholder:italic"
      />
    </div>
  );
}

const LABEL =
  "font-label font-semibold text-[11px] text-fg-muted uppercase tracking-[1.1px]";
