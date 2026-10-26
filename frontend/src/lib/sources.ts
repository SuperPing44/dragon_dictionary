import { SOURCE_TYPES, type SourceType } from "@/db/schema";

export const SOURCE_TYPE_LABELS: Record<SourceType, string> = {
  website: "Website",
  book: "Book",
  pdf: "PDF",
  youtube: "YouTube video",
  paper: "Scientific paper",
};

/** Short labels for the library's type filter. */
export const SOURCE_TYPE_SHORT: Record<SourceType, string> = {
  website: "Website",
  book: "Book",
  pdf: "PDF",
  youtube: "YouTube",
  paper: "Paper",
};

/**
 * A date as precise as known, in ISO form: "1220", "1220-05" or
 * "1220-05-03". A full date must exist on the calendar.
 */
export function isPartialDate(value: string): boolean {
  const m = /^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?$/.exec(value);
  if (!m) return false;
  const [, y, mo, d] = m;
  if (mo === undefined) return true;
  const month = Number(mo);
  if (month < 1 || month > 12) return false;
  if (d === undefined) return true;
  const day = Number(d);
  const daysInMonth = new Date(Date.UTC(Number(y), month, 0)).getUTCDate();
  return day >= 1 && day <= daysInMonth;
}

/** A web address the app can open: http or https. */
export function isLink(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * The form of a link used to spot duplicates: http and https, "www.", the
 * host's case and a trailing slash don't make a link different.
 */
export function normalizeLink(value: string): string {
  const trimmed = value.trim();
  try {
    const url = new URL(trimmed);
    const host = url.host.toLowerCase().replace(/^www\./, "");
    const path = url.pathname.replace(/\/+$/, "");
    return `${host}${path}${url.search}${url.hash}`;
  } catch {
    return trimmed.toLowerCase().replace(/\/+$/, "");
  }
}

export type SourceInput = {
  type: string;
  title: string;
  author?: string;
  link?: string;
  publisher?: string;
  date?: string;
  note?: string;
};

export type SourceValues = {
  type: SourceType;
  title: string;
  author: string | null;
  link: string | null;
  publisher: string | null;
  date: string | null;
  note: string | null;
};

export type SourceErrors = Partial<
  Record<"type" | "title" | "link" | "date", string>
>;

const optional = (value: string | undefined) => value?.trim() || null;

/** Checks the form; blank optional fields become empty (null). */
export function validateSource(
  input: SourceInput,
): { ok: true; values: SourceValues } | { ok: false; errors: SourceErrors } {
  const errors: SourceErrors = {};
  if (!SOURCE_TYPES.includes(input.type as SourceType)) {
    errors.type = "Pick a type.";
  }
  const title = input.title.trim();
  if (!title) errors.title = "A source needs a title.";
  const link = optional(input.link);
  if (link && !isLink(link)) {
    errors.link = "Use a full link starting with http:// or https://.";
  }
  const date = optional(input.date);
  if (date && !isPartialDate(date)) {
    errors.date =
      "Use a year, year and month, or a full date: 1220, 1220-05 or 1220-05-03.";
  }
  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    values: {
      type: input.type as SourceType,
      title,
      author: optional(input.author),
      link,
      publisher: optional(input.publisher),
      date,
      // The note keeps its line breaks; only an all-blank note is empty.
      note: input.note?.trim() ? (input.note ?? null) : null,
    },
  };
}
