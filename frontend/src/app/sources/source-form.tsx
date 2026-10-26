"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useTransition } from "react";
import { PageHeader } from "@/components/page-header";
import { SOURCE_TYPES, type Source, type SourceType } from "@/db/schema";
import {
  normalizeLink,
  SOURCE_TYPE_LABELS,
  type SourceErrors,
  type SourceInput,
} from "@/lib/sources";
import { deleteSourceAction, linkExistingAction, saveSource } from "./actions";

type LinkEntry = { id: string; title: string; link: string };

type SourceFormProps = {
  /** The source being edited; absent for a new one. */
  source?: Source & { projects: number };
  /** Normalized links already in the library, for the duplicate warning. */
  links: LinkEntry[];
  subtitle: string;
  /** Cards beside the form: PDFs, quotes, linked projects. */
  aside: React.ReactNode;
  /** A new source created from a project, which it is linked to on save. */
  linkTo?: { id: string; title: string };
  /** A title to start a new source with, e.g. what was searched for. */
  initialTitle?: string;
};

const LABEL =
  "font-label font-semibold text-[11px] text-fg-muted uppercase tracking-[1.1px]";
const BOX =
  "w-full rounded-[10px] border bg-surface-2 px-3.5 py-2.5 text-[17px] text-fg outline-none transition-shadow focus:border-accent focus:shadow-[0_0_12px_rgb(158_107_255/0.35)]";
const BUTTON =
  "rounded-xl px-[18px] py-2.5 font-bold font-heading text-[13px] tracking-[0.78px]";

const empty = (s?: Source, title = ""): SourceInput => ({
  type: s?.type ?? "website",
  title: s?.title ?? title,
  author: s?.author ?? "",
  link: s?.link ?? "",
  publisher: s?.publisher ?? "",
  date: s?.date ?? "",
  note: s?.note ?? "",
});

/** One form for every type of source, saved with the Save button. */
export function SourceForm({
  source,
  links,
  subtitle,
  aside,
  linkTo,
  initialTitle,
}: SourceFormProps) {
  const [input, setInput] = useState<SourceInput>(() =>
    empty(source, initialTitle),
  );
  const backHref = linkTo ? `/projects/${linkTo.id}/sources` : "/sources";
  const [errors, setErrors] = useState<SourceErrors>({});
  const [saved, setSaved] = useState(false);
  const [keepBoth, setKeepBoth] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [saving, startSaving] = useTransition();

  const set = (field: keyof SourceInput) => (value: string) => {
    setInput((prev) => ({ ...prev, [field]: value }));
    setSaved(false);
  };

  const typedLink = input.link?.trim() ? normalizeLink(input.link) : "";
  const duplicate =
    typedLink && typedLink !== keepBoth
      ? links.find((l) => l.link === typedLink && l.id !== source?.id)
      : undefined;

  function save(event: React.FormEvent) {
    event.preventDefault();
    startSaving(async () => {
      const result = await saveSource(source?.id ?? null, input, linkTo?.id);
      if (result.ok) {
        setErrors({});
        setSaved(true);
      } else setErrors(result.errors);
    });
  }

  return (
    <form onSubmit={save} noValidate className="flex flex-col gap-4">
      <Link
        href={backHref}
        className="self-start font-label font-medium text-[13px] text-accent-glow hover:underline"
      >
        {linkTo ? `← ${linkTo.title}` : "← Source library"}
      </Link>
      <div className="flex items-center gap-3">
        <PageHeader
          title={source ? input.title || source.title : "New Source"}
          subtitle={subtitle}
        />
        <span className="flex-1" />
        {saved && (
          <output className="font-label text-[13px] text-fg-muted">
            Saved ✓
          </output>
        )}
        {source && (
          <button
            type="button"
            onClick={() => setConfirmingDelete(true)}
            className="font-label font-medium text-[13px] text-danger hover:underline"
          >
            Delete source
          </button>
        )}
        <Link href={backHref} className={`${BUTTON} text-accent-glow`}>
          Cancel
        </Link>
        <button
          type="submit"
          disabled={saving}
          className={`${BUTTON} bg-accent text-canvas shadow-[0_4px_9px_rgb(157_107_255/0.45)] disabled:opacity-60`}
        >
          Save source
        </button>
      </div>

      {confirmingDelete && source && (
        <section
          aria-label="Delete source"
          className="flex items-center gap-4 rounded-[18px] border border-danger bg-surface-1 px-5 py-4"
        >
          <div className="flex flex-1 flex-col gap-1">
            <h2 className="font-bold font-heading text-[17px] text-danger">
              Delete “{source.title}”?
            </h2>
            <p className="text-[16px] text-fg-muted">
              {source.projects === 0
                ? "No video project uses it."
                : `${source.projects} video ${source.projects === 1 ? "project uses" : "projects use"} it; ${source.projects === 1 ? "that link is" : "those links are"} removed.`}{" "}
              Its quotes and PDFs are deleted too.
            </p>
          </div>
          <button
            type="button"
            onClick={() => startSaving(() => deleteSourceAction(source.id))}
            className={`${BUTTON} bg-danger text-canvas`}
          >
            Delete
          </button>
          <button
            type="button"
            onClick={() => setConfirmingDelete(false)}
            className={`${BUTTON} text-accent-glow`}
          >
            Cancel
          </button>
        </section>
      )}

      <div className="flex items-start gap-5">
        <div className="flex min-w-0 flex-1 flex-col gap-3.5 rounded-[18px] border border-border-soft bg-surface-1 p-6">
          <p className={LABEL}>Type</p>
          <fieldset className="flex flex-wrap gap-1 self-start rounded-xl border border-border-soft bg-surface-2 p-1">
            <legend className="sr-only">Type</legend>
            {SOURCE_TYPES.map((type: SourceType) => (
              <button
                key={type}
                type="button"
                aria-pressed={input.type === type}
                onClick={() => set("type")(type)}
                className={`rounded-[9px] border px-3 py-1.5 font-label font-medium text-[13px] ${
                  input.type === type
                    ? "border-border-strong bg-surface-3 text-fg"
                    : "border-transparent text-fg-muted hover:text-fg"
                }`}
              >
                {SOURCE_TYPE_LABELS[type]}
              </button>
            ))}
          </fieldset>

          <Field
            label="Title"
            value={input.title}
            onChange={set("title")}
            error={errors.title}
            autoFocus={!source}
          />
          <Field
            label={input.type === "youtube" ? "Author (channel)" : "Author"}
            value={input.author ?? ""}
            onChange={set("author")}
          />
          <Field
            label="Link"
            value={input.link ?? ""}
            onChange={set("link")}
            error={errors.link}
            warn={Boolean(duplicate)}
            placeholder="https://"
          />
          {duplicate && (
            <div
              role="alert"
              className="flex items-center gap-3 rounded-xl border border-gold/60 bg-gold/5 px-3.5 py-2.5"
            >
              <Image
                src="/design/icon-alert.svg"
                alt=""
                width={18}
                height={18}
              />
              <p className="flex-1 text-[16px] text-fg">
                This link is already in the library as “{duplicate.title}”.
              </p>
              {linkTo ? (
                <button
                  type="button"
                  onClick={() =>
                    startSaving(() =>
                      linkExistingAction(linkTo.id, duplicate.id),
                    )
                  }
                  className={`${BUTTON} border border-border-strong bg-surface-3 text-accent-glow`}
                >
                  Link existing instead
                </button>
              ) : (
                <Link
                  href={`/sources/${duplicate.id}`}
                  className={`${BUTTON} border border-border-strong bg-surface-3 text-accent-glow`}
                >
                  Open existing
                </Link>
              )}
              <button
                type="button"
                onClick={() => setKeepBoth(typedLink)}
                className="font-label font-medium text-fg-muted text-xs hover:text-fg"
              >
                Keep both
              </button>
            </div>
          )}
          <div className="flex gap-3.5">
            <div className="flex-1">
              <Field
                label={
                  input.type === "paper" ? "Publisher (journal)" : "Publisher"
                }
                value={input.publisher ?? ""}
                onChange={set("publisher")}
              />
            </div>
            <div className="flex flex-1 flex-col gap-1">
              <Field
                label="Date"
                value={input.date ?? ""}
                onChange={set("date")}
                error={errors.date}
                placeholder="1220, 1220-05 or 1220-05-03"
              />
              {!errors.date && (
                <p className="font-label text-[11px] text-fg-faint">
                  Year, year and month, or a full date
                </p>
              )}
            </div>
          </div>
          <Field
            label="Note"
            value={input.note ?? ""}
            onChange={set("note")}
            multiline
          />
        </div>
        <div className="flex w-[420px] shrink-0 flex-col gap-4">{aside}</div>
      </div>
    </form>
  );
}

type FieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  warn?: boolean;
  placeholder?: string;
  multiline?: boolean;
  autoFocus?: boolean;
};

function Field({
  label,
  value,
  onChange,
  error,
  warn,
  placeholder,
  multiline,
  autoFocus,
}: FieldProps) {
  const id = `source-${label.split(" ")[0].toLowerCase()}`;
  const border = error
    ? "border-danger"
    : warn
      ? "border-gold focus:border-gold!"
      : "border-border-strong";
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className={LABEL}>
        {label}
      </label>
      {multiline ? (
        <textarea
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          className={`${BOX} ${border} field-sizing-content resize-none`}
        />
      ) : (
        <input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          autoComplete="off"
          // biome-ignore lint/a11y/noAutofocus: passed through on purpose
          autoFocus={autoFocus}
          className={`${BOX} ${border} placeholder:text-fg-faint`}
        />
      )}
      {error && (
        <p id={`${id}-error`} className="text-[14px] text-danger italic">
          {error}
        </p>
      )}
    </div>
  );
}
