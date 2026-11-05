"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { startTransition, useEffect, useRef, useState } from "react";
import type { ThumbnailDraft } from "@/db/schema";
import {
  THUMBNAIL_ACCEPT,
  thumbnailRefusal,
  thumbnailWarning,
} from "@/lib/thumbnails";
import {
  markThumbnailFinalAction,
  removeThumbnailDraftAction,
  setThumbnailNoteAction,
} from "../../actions";

type ThumbnailDraftsProps = {
  projectId: string;
  drafts: ThumbnailDraft[];
  /** The project's final draft, if any. */
  finalId: string | null;
};

/**
 * The Thumbnail drafts card (spec §5.2, Figma F1): a 16:9 grid in upload
 * order, a dashed drop tile last. Uploads stream through a Route Handler,
 * since Server Actions cap at 1 MB.
 */
export function ThumbnailDrafts({
  projectId,
  drafts,
  finalId,
}: ThumbnailDraftsProps) {
  const router = useRouter();
  const picker = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState<string[]>([]);
  const [problems, setProblems] = useState<string[]>([]);
  const [dropping, setDropping] = useState(false);
  const [confirming, setConfirming] = useState<ThumbnailDraft | null>(null);

  async function upload(files: File[]) {
    if (picker.current) picker.current.value = "";
    if (files.length === 0) return;
    const refused = files.flatMap((f) => thumbnailRefusal(f) ?? []);
    const accepted = files.filter((f) => !thumbnailRefusal(f));
    setProblems(refused);
    // One at a time, so they're shown in the order they were added.
    for (const file of accepted) {
      setUploading((prev) => [...prev, file.name]);
      try {
        const response = await fetch(`/api/projects/${projectId}/thumbnails`, {
          method: "POST",
          headers: { "X-File-Name": encodeURIComponent(file.name) },
          body: file,
        });
        if (!response.ok) {
          const { error } = await response.json().catch(() => ({
            error: `“${file.name}” couldn’t be uploaded.`,
          }));
          setProblems((prev) => [...prev, error]);
        }
      } catch {
        setProblems((prev) => [
          ...prev,
          `“${file.name}” couldn’t be uploaded.`,
        ]);
      } finally {
        setUploading((prev) => prev.filter((n) => n !== file.name));
      }
    }
    router.refresh();
  }

  const hasFiles = (e: React.DragEvent) =>
    [...e.dataTransfer.types].includes("Files");

  return (
    <section
      aria-labelledby="thumbnails-label"
      onDragOver={(e) => {
        if (!hasFiles(e)) return;
        e.preventDefault();
        setDropping(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setDropping(false);
        }
      }}
      onDrop={(e) => {
        if (!hasFiles(e)) return;
        e.preventDefault();
        setDropping(false);
        void upload([...e.dataTransfer.files]);
      }}
      className={`flex flex-col gap-4 rounded-[18px] border bg-surface-1 p-5 transition-colors ${
        dropping ? "border-accent" : "border-border-soft"
      }`}
    >
      <div className="flex items-center gap-3">
        <h2 id="thumbnails-label" className={LABEL}>
          Thumbnail drafts
        </h2>
        <span className="flex-1" />
        <span className="font-label text-[11px] text-fg-faint">
          PNG, JPEG, WebP or GIF · up to 20 MB · drop to add
        </span>
        <button
          type="button"
          onClick={() => picker.current?.click()}
          className="rounded-xl border border-border-strong bg-surface-3 px-[18px] py-2.5 font-bold font-heading text-[13px] text-accent-glow tracking-[0.78px] hover:border-accent"
        >
          Upload
        </button>
        <input
          ref={picker}
          type="file"
          accept={THUMBNAIL_ACCEPT}
          multiple
          hidden
          aria-label="Choose images to upload"
          onChange={(e) => void upload([...(e.target.files ?? [])])}
        />
      </div>

      {problems.length > 0 && (
        <ul className="flex flex-col gap-1">
          {problems.map((p) => (
            <li
              key={p}
              className="flex items-center gap-1.5 font-label text-[13px] text-amber"
            >
              <Image
                src="/design/icon-alert-amber.svg"
                alt=""
                width={14}
                height={14}
              />
              {p}
            </li>
          ))}
        </ul>
      )}

      <ul className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4">
        {drafts.map((draft) => (
          <DraftCard
            key={draft.id}
            draft={draft}
            isFinal={draft.id === finalId}
            onMarkFinal={() =>
              startTransition(() =>
                markThumbnailFinalAction(projectId, draft.id),
              )
            }
            onDelete={() => setConfirming(draft)}
          />
        ))}
        {uploading.map((name) => (
          <li
            key={`uploading-${name}`}
            className="flex aspect-video items-center justify-center rounded-xl border border-border-soft bg-canvas px-3 text-center font-label text-[12px] text-fg-faint"
          >
            Uploading {name}…
          </li>
        ))}
        <li>
          <button
            type="button"
            onClick={() => picker.current?.click()}
            className={`flex aspect-video w-full flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed px-3 text-center transition-colors ${
              dropping
                ? "border-accent bg-accent/10"
                : "border-border-strong hover:border-accent"
            }`}
          >
            <Image
              src="/design/tab-upload-inactive.svg"
              alt=""
              width={22}
              height={22}
            />
            <span className="font-heading font-semibold text-[15px] text-fg-muted">
              Drop images here
            </span>
            <span className="font-label text-[11px] text-fg-faint">
              or Upload
            </span>
          </button>
        </li>
      </ul>

      {confirming && (
        <DeleteDialog
          draft={confirming}
          onCancel={() => setConfirming(null)}
          onDelete={() => {
            const id = confirming.id;
            setConfirming(null);
            startTransition(() => removeThumbnailDraftAction(id));
          }}
        />
      )}
    </section>
  );
}

type DraftCardProps = {
  draft: ThumbnailDraft;
  isFinal: boolean;
  onMarkFinal: () => void;
  onDelete: () => void;
};

function DraftCard({ draft, isFinal, onMarkFinal, onDelete }: DraftCardProps) {
  const warn = thumbnailWarning(draft.width, draft.height);
  return (
    <li className="group flex flex-col gap-1.5">
      <div
        className={`relative aspect-video overflow-hidden rounded-xl bg-canvas ${
          isFinal
            ? "shadow-[0_0_0_2px_var(--color-gold),0_0_18px_rgb(233_196_106/0.35)]"
            : "border border-border-soft"
        }`}
      >
        <Image
          src={`/api/thumbnails/${draft.id}`}
          alt={draft.note ?? draft.originalName}
          fill
          unoptimized
          sizes="300px"
          className="object-contain"
        />
        {isFinal ? (
          <span className="absolute top-2 left-2 flex items-center gap-1 rounded-md border border-gold/60 bg-canvas/80 px-2 py-0.5 font-bold font-label text-[11px] text-gold uppercase tracking-[1px]">
            <span aria-hidden>✦</span> Final
          </span>
        ) : (
          <button
            type="button"
            onClick={onMarkFinal}
            className="absolute bottom-2 left-2 rounded-lg border border-border-strong bg-canvas/85 px-2.5 py-1 font-label font-medium text-[12px] text-fg opacity-0 transition-opacity hover:border-accent focus-visible:opacity-100 group-hover:opacity-100"
          >
            Mark as final
          </button>
        )}
        <button
          type="button"
          aria-label={`Delete ${draft.originalName}`}
          onClick={onDelete}
          className="absolute top-2 right-2 flex size-7 items-center justify-center rounded-full bg-canvas/85 text-fg opacity-0 transition-opacity hover:bg-canvas focus-visible:opacity-100 group-hover:opacity-100"
        >
          ✕
        </button>
      </div>
      <p className="flex gap-2 font-label text-[11px] tabular-nums">
        <span className={warn ? "text-amber" : "text-fg-faint"}>
          {draft.width}×{draft.height}
        </span>
        {warn && <span className="text-amber">not 16:9</span>}
      </p>
      <DraftNote id={draft.id} saved={draft.note ?? ""} />
    </li>
  );
}

/** A one-line note, edited by clicking it, saved on Enter or blur. */
function DraftNote({ id, saved }: { id: string; saved: string }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(saved);

  function commit() {
    setEditing(false);
    if (value.trim() !== saved) {
      startTransition(() => setThumbnailNoteAction(id, value));
    }
  }

  if (editing) {
    return (
      <input
        // biome-ignore lint/a11y/noAutofocus: opened by a click on the note
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
          if (e.key === "Escape") {
            setValue(saved);
            setEditing(false);
          }
        }}
        aria-label="Note"
        placeholder="Add a note…"
        className="rounded-md border border-accent bg-surface-2 px-2 py-0.5 text-[15px] text-fg outline-none placeholder:text-fg-faint placeholder:italic"
      />
    );
  }
  return (
    <button
      type="button"
      onClick={() => {
        setValue(saved);
        setEditing(true);
      }}
      className={`truncate text-left text-[15px] ${
        saved ? "text-fg" : "text-fg-faint italic"
      } hover:text-fg-muted`}
    >
      {saved || "Add a note…"}
    </button>
  );
}

function DeleteDialog({
  draft,
  onCancel,
  onDelete,
}: {
  draft: ThumbnailDraft;
  onCancel: () => void;
  onDelete: () => void;
}) {
  const cancel = useRef(onCancel);
  cancel.current = onCancel;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") cancel.current();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-canvas/75 backdrop-blur-[2px]">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-draft-title"
        className="flex w-[420px] flex-col gap-4 rounded-[18px] border border-danger/60 bg-surface-1 p-5 shadow-[0_12px_40px_rgb(0_0_0/0.6)]"
      >
        <div className="relative aspect-video overflow-hidden rounded-xl bg-canvas">
          <Image
            src={`/api/thumbnails/${draft.id}`}
            alt=""
            fill
            unoptimized
            sizes="400px"
            className="object-contain"
          />
        </div>
        <div className="flex flex-col gap-1">
          <h2
            id="delete-draft-title"
            className="font-bold font-heading text-[17px] text-danger"
          >
            Delete this thumbnail draft?
          </h2>
          <p className="text-[15px] text-fg-muted">
            “{draft.originalName}” is deleted for good.
          </p>
        </div>
        <div className="flex justify-end gap-2.5">
          <button
            type="button"
            // biome-ignore lint/a11y/noAutofocus: the safe choice gets focus
            autoFocus
            onClick={onCancel}
            className="rounded-xl px-[18px] py-2.5 font-bold font-heading text-[13px] text-accent-glow tracking-[0.78px]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="rounded-xl bg-danger px-[18px] py-2.5 font-bold font-heading text-[13px] text-canvas tracking-[0.78px]"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

const LABEL =
  "font-label font-semibold text-[11px] text-fg-muted uppercase tracking-[1.1px]";
