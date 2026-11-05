import { sourceList } from "./sources";

/** YouTube's description limit; the counter turns amber past it. */
export const DESCRIPTION_LIMIT = 5000;

type DescriptionParts = {
  /** Your own text for this video. */
  text: string;
  /** The project's linked sources, in link order. */
  sources: { title: string; link: string | null }[];
  /** The description footer shared by all videos. */
  footer: string;
};

/** Drops blank lines at the start and all trailing whitespace. */
function tidy(part: string): string {
  return part.replace(/^(\s*\n)+/, "").trimEnd();
}

/**
 * What Copy description puts on the clipboard: your text, then `Sources:`
 * with the source list, then the footer, separated by one blank line.
 * Empty parts are skipped; with no linked source that has a link, the
 * `Sources:` heading is left out too.
 */
export function descriptionCopyText({
  text,
  sources,
  footer,
}: DescriptionParts): string {
  const { lines } = sourceList(sources);
  const parts = [
    tidy(text),
    lines.length > 0 ? ["Sources:", ...lines].join("\n") : "",
    tidy(footer),
  ];
  return parts.filter((p) => p.trim() !== "").join("\n\n");
}
