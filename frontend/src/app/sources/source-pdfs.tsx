"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { startTransition, useRef, useState } from "react";
import type { SourceFile } from "@/db/schema";
import { formatBytes } from "@/lib/format";
import { removeFileAction } from "./actions";

type SourcePdfsProps = {
  sourceId: string;
  files: SourceFile[];
};

/**
 * A source's PDFs in upload order. Uploads stream through a Route Handler
 * (Server Actions cap at 1 MB); a PDF opens in the browser's own viewer.
 */
export function SourcePdfs({ sourceId, files }: SourcePdfsProps) {
  const router = useRouter();
  const picker = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState<string[]>([]);
  const [problems, setProblems] = useState<string[]>([]);
  const [confirming, setConfirming] = useState<string | null>(null);

  async function upload(list: FileList | null) {
    const chosen = [...(list ?? [])];
    if (picker.current) picker.current.value = "";
    if (chosen.length === 0) return;
    setProblems([]);
    // One at a time, so they're listed in the order they were picked.
    for (const file of chosen) {
      setUploading((prev) => [...prev, file.name]);
      try {
        const response = await fetch(`/api/sources/${sourceId}/files`, {
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

  return (
    <section
      aria-label="PDFs"
      className="flex flex-col gap-2.5 rounded-[18px] border border-border-soft bg-surface-1 p-5"
    >
      <div className="flex items-center gap-2">
        <Image src="/design/icon-file.svg" alt="" width={18} height={18} />
        <h2 className="font-bold font-heading text-[17px] text-fg">PDFs</h2>
        <span className="flex-1" />
        <button
          type="button"
          onClick={() => picker.current?.click()}
          className="font-label font-medium text-[13px] text-accent-glow hover:underline"
        >
          + Upload PDF
        </button>
        <input
          ref={picker}
          type="file"
          accept="application/pdf,.pdf"
          multiple
          hidden
          aria-label="Choose PDFs to upload"
          onChange={(e) => upload(e.target.files)}
        />
      </div>

      {files.length === 0 && uploading.length === 0 && (
        <p className="text-[15px] text-fg-muted italic">No PDFs yet.</p>
      )}
      <ul className="flex flex-col gap-2">
        {files.map((f) =>
          confirming === f.id ? (
            <li
              key={f.id}
              className="flex items-center gap-2 rounded-[10px] border border-danger/60 bg-surface-2 px-3 py-2"
            >
              <p className="flex-1 text-[15px] text-fg">
                Remove “{f.originalName}”?
              </p>
              <button
                type="button"
                onClick={() => {
                  setConfirming(null);
                  startTransition(() => removeFileAction(f.id));
                }}
                className="rounded-lg bg-danger px-3 py-1 font-bold font-heading text-[12px] text-canvas"
              >
                Remove
              </button>
              <button
                type="button"
                onClick={() => setConfirming(null)}
                className="rounded-lg px-3 py-1 font-bold font-heading text-[12px] text-accent-glow"
              >
                Keep
              </button>
            </li>
          ) : (
            <li
              key={f.id}
              className="flex items-center gap-2.5 rounded-[10px] bg-surface-2 px-3 py-[9px]"
            >
              <Image
                src="/design/icon-file-small.svg"
                alt=""
                width={16}
                height={16}
              />
              <a
                href={`/api/files/${f.id}`}
                target="_blank"
                rel="noopener"
                className="min-w-0 flex-1 truncate font-label font-medium text-[13px] text-fg hover:underline"
              >
                {f.originalName}
              </a>
              <span className="font-label text-fg-faint text-xs">
                {formatBytes(f.size)}
              </span>
              <button
                type="button"
                aria-label={`Remove ${f.originalName}`}
                onClick={() => setConfirming(f.id)}
                className="rounded p-0.5 opacity-70 hover:opacity-100"
              >
                <Image src="/design/icon-x.svg" alt="" width={14} height={14} />
              </button>
            </li>
          ),
        )}
        {uploading.map((name) => (
          <li
            key={`uploading-${name}`}
            className="flex items-center gap-2.5 rounded-[10px] border border-border-strong border-dashed px-3 py-[9px] font-label text-[13px] text-fg-muted"
          >
            Uploading “{name}”…
          </li>
        ))}
      </ul>
      {problems.map((p) => (
        <p key={p} role="alert" className="text-[14px] text-danger italic">
          {p}
        </p>
      ))}
      <p className="text-[14px] text-fg-faint italic">
        Opens in the browser’s PDF viewer. PDFs only.
      </p>
    </section>
  );
}
