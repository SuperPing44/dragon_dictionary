import type { Section } from "@/db/schema";
import { SECTION_KIND_LABELS } from "./labels";
import { type DocNode, hasContent, parseDoc } from "./script";

/** What the print layout needs of a stored section. */
export type PrintSection = Pick<
  Section,
  "id" | "kind" | "title" | "parent" | "content"
>;

/** One entry of the Script PDF: a heading and, if it has any, its text. */
export type PrintEntry = {
  id: string;
  /** The section kind's name, or the subsection's own title. */
  heading: string;
  /** A subsection of the Main part, set as a smaller heading. */
  sub: boolean;
  /** Undefined for a Main part with no lead-in but subsections with text. */
  doc: DocNode | undefined;
};

/**
 * The entries to print, in script order (`sections` as listSections returns
 * them). Empty entries are left out; the Main part keeps its heading while
 * any of its subsections has text, so they stay grouped under it.
 */
export function printEntries(sections: PrintSection[]): PrintEntry[] {
  const docs = new Map(sections.map((s) => [s.id, parseDoc(s.content)]));
  const filled = (s: PrintSection) => hasContent(docs.get(s.id) ?? {});
  return sections.flatMap((s) => {
    const own = filled(s);
    const children = sections.some((x) => x.parent === s.id && filled(x));
    if (!own && !children) return [];
    return [
      {
        id: s.id,
        heading: s.kind ? SECTION_KIND_LABELS[s.kind] : s.title || "Untitled",
        sub: s.parent !== null,
        doc: own ? docs.get(s.id) : undefined,
      },
    ];
  });
}

/** Whether there's anything to print: the button is disabled otherwise. */
export function canPrint(sections: PrintSection[]): boolean {
  return printEntries(sections).length > 0;
}
