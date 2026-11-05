"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { startTransition, useEffect, useRef, useState } from "react";
import type { ThumbnailDraft } from "@/db/schema";
import { formatBytes } from "@/lib/format";
import {
  indexAfterDelete,
  pastedImageName,
  stepDraft,
  THUMBNAIL_ACCEPT,
  THUMBNAIL_TYPES,
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
 * order, a dashed drop tile last, and an enlarged view (F2). Images are
 * added by Upload, by dropping them, or by pasting with Ctrl+V anywhere on
 * the Publishing tab. Uploads stream through a Route Handler, since Server
 * Actions cap at 1 MB.
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
  const [viewing, setViewing] = useState<string | null>(null);
  const viewIndex = drafts.findIndex((d) => d.id === viewing);

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

  // Ctrl+V anywhere on the tab adds a pasted image. Text (anything with a
  // text/plain part) still pastes into fields as normal.
  const uploadRef = useRef(upload);
  uploadRef.current = upload;
  useEffect(() => {
    const types: string[] = Object.values(THUMBNAIL_TYPES);
    function onPaste(e: ClipboardEvent) {
      const data = e.clipboardData;
      if (!data || data.types.includes("text/plain")) return;
      const images = [...data.files].filter((f) => types.includes(f.type));
      if (images.length === 0) return;
      e.preventDefault();
      const now = new Date();
      void uploadRef.current(
        images.map(
          (f) => new File([f], pastedImageName(f.type, now), { type: f.type }),
        ),
      );
    }
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, []);

  function deleteDraft(draft: ThumbnailDraft) {
    setConfirming(null);
    if (viewing === draft.id) {
      const rest = drafts.filter((d) => d.id !== draft.id);
      const next = indexAfterDelete(viewIndex, rest.length);
      setViewing(rest[next]?.id ?? null);
    }
    startTransition(() => removeThumbnailDraftAction(draft.id));
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
          PNG, JPEG, WebP or GIF · up to 20 MB · drop or Ctrl+V to add
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
            onOpen={() => setViewing(draft.id)}
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

      {viewIndex >= 0 && (
        <EnlargedView
          drafts={drafts}
          index={viewIndex}
          finalId={finalId}
          paused={confirming !== null}
          onMove={(step) =>
            setViewing(drafts[stepDraft(viewIndex, step, drafts.length)].id)
          }
          onMarkFinal={(id) =>
            startTransition(() => markThumbnailFinalAction(projectId, id))
          }
          onDelete={setConfirming}
          onClose={() => setViewing(null)}
        />
      )}

      {confirming && (
        <DeleteDialog
          draft={confirming}
          onCancel={() => setConfirming(null)}
          onDelete={() => deleteDraft(confirming)}
        />
      )}
    </section>
  );
}

type DraftCardProps = {
  draft: ThumbnailDraft;
  isFinal: boolean;
  onOpen: () => void;
  onMarkFinal: () => void;
  onDelete: () => void;
};

function DraftCard({
  draft,
  isFinal,
  onOpen,
  onMarkFinal,
  onDelete,
}: DraftCardProps) {
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
        <button
          type="button"
          onClick={onOpen}
          aria-label={`Enlarge ${draft.originalName}`}
          className="absolute inset-0 cursor-zoom-in focus-visible:outline-2 focus-visible:outline-accent"
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

type EnlargedViewProps = {
  drafts: ThumbnailDraft[];
  index: number;
  finalId: string | null;
  /** While the delete confirmation is open, the keys are its own. */
  paused: boolean;
  onMove: (step: -1 | 1) => void;
  onMarkFinal: (id: string) => void;
  onDelete: (draft: ThumbnailDraft) => void;
  onClose: () => void;
};

/**
 * A draft over the dimmed page (Figma F2). ← / → move between drafts,
 * stopping at the ends, and Esc closes.
 */
function EnlargedView({
  drafts,
  index,
  finalId,
  paused,
  onMove,
  onMarkFinal,
  onDelete,
  onClose,
}: EnlargedViewProps) {
  const draft = drafts[index];
  const isFinal = draft.id === finalId;
  const warn = thumbnailWarning(draft.width, draft.height);
  const keys = useRef({ onMove, onClose, paused });
  keys.current = { onMove, onClose, paused };

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const { onMove, onClose, paused } = keys.current;
      const target = e.target as HTMLElement | null;
      if (paused || target?.closest("input, textarea")) return;
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        e.preventDefault();
        onMove(e.key === "ArrowLeft" ? -1 : 1);
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const arrow =
    "absolute top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full border border-border-strong bg-surface-1/85 text-[20px] text-fg hover:border-accent disabled:opacity-30";

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-canvas/90 backdrop-blur-[3px]">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Thumbnail draft ${index + 1} of ${drafts.length}`}
        className="flex h-full flex-col gap-4 px-8 py-6"
      >
        <div className="flex items-center gap-4 rounded-[14px] border border-border-soft bg-surface-1 px-4 py-2.5">
          <span className="font-label font-semibold text-[12px] text-fg-muted tabular-nums">
            {index + 1} of {drafts.length}
          </span>
          <span className="min-w-0 truncate font-heading font-semibold text-[15px] text-fg">
            {draft.originalName}
          </span>
          <span
            className={`font-label text-[12px] tabular-nums ${warn ? "text-amber" : "text-fg-faint"}`}
          >
            {draft.width}×{draft.height}
            {warn && " · not 16:9"}
          </span>
          <span className="font-label text-[12px] text-fg-faint">
            {formatBytes(draft.size)}
          </span>
          <span className="flex-1" />
          {isFinal ? (
            <span className="flex items-center gap-1 rounded-md border border-gold/60 bg-gold/10 px-2 py-0.5 font-bold font-label text-[11px] text-gold uppercase tracking-[1px]">
              <span aria-hidden>✦</span> Final
            </span>
          ) : (
            <button
              type="button"
              onClick={() => onMarkFinal(draft.id)}
              className="font-label font-medium text-[13px] text-accent-glow hover:underline"
            >
              Mark as final
            </button>
          )}
          <a
            href={`/api/thumbnails/${draft.id}?download`}
            download={draft.originalName}
            className="rounded-lg border border-border-strong px-3 py-1.5 font-label font-medium text-[13px] text-fg hover:border-accent"
          >
            Download
          </a>
          <button
            type="button"
            onClick={() => onDelete(draft)}
            className="rounded-lg px-3 py-1.5 font-label font-medium text-[13px] text-danger hover:bg-danger/10"
          >
            Delete
          </button>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-full text-fg-muted hover:bg-surface-3 hover:text-fg"
          >
            ✕
          </button>
        </div>

        <div className="relative min-h-0 flex-1">
          <Image
            key={draft.id}
            src={`/api/thumbnails/${draft.id}`}
            alt={draft.note ?? draft.originalName}
            fill
            unoptimized
            sizes="100vw"
            className="object-contain"
          />
          <button
            type="button"
            aria-label="Previous draft"
            disabled={index === 0}
            onClick={() => onMove(-1)}
            className={`${arrow} left-0`}
          >
            ←
          </button>
          <button
            type="button"
            aria-label="Next draft"
            disabled={index === drafts.length - 1}
            onClick={() => onMove(1)}
            className={`${arrow} right-0`}
          >
            →
          </button>
        </div>

        <div className="mx-auto flex w-full max-w-[640px] flex-col">
          <DraftNote key={draft.id} id={draft.id} saved={draft.note ?? ""} />
        </div>
      </div>
    </div>
  );
}

const LABEL =
  "font-label font-semibold text-[11px] text-fg-muted uppercase tracking-[1.1px]";
