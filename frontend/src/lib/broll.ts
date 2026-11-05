import type { Section } from "@/db/schema";
import { type DocNode, entryLabel, parseDoc } from "./script";

/**
 * A B-roll item from the script: one stage direction. It's found by its
 * entry plus its position among that entry's directions (counting every
 * direction, so the position matches the editor's).
 */
export type ScriptBrollItem = {
  sectionId: string;
  index: number;
  description: string;
  found: boolean;
};

/** The script items of one entry, under its heading. */
export type BrollGroup = {
  sectionId: string;
  label: string;
  items: ScriptBrollItem[];
};

/** An extra item, with no spot in the script. */
export type ExtraBrollItem = { id: string; text: string; found: boolean };

type ScriptSection = Pick<
  Section,
  "id" | "kind" | "title" | "parent" | "content"
>;

/** A section's stage-direction nodes, in document order. */
function directions(node: DocNode, out: DocNode[] = []): DocNode[] {
  if (node.type === "stageDirection") out.push(node);
  for (const child of node.content ?? []) directions(child, out);
  return out;
}

/** Whether a stage-direction node is ticked; a missing attribute isn't. */
export function isFound(node: DocNode): boolean {
  return node.attrs?.found === true;
}

/**
 * The script's B-roll items, grouped under their entry's heading in script
 * order (`sections` as listSections returns them). Directions with an empty
 * description are left out, and entries with none are skipped.
 */
export function scriptBrollGroups(sections: ScriptSection[]): BrollGroup[] {
  const byId = new Map(sections.map((s) => [s.id, s]));
  return sections.flatMap((s) => {
    const items = directions(parseDoc(s.content)).flatMap((node, index) => {
      const description = String(node.attrs?.description ?? "").trim();
      return description
        ? [{ sectionId: s.id, index, description, found: isFound(node) }]
        : [];
    });
    return items.length > 0
      ? [{ sectionId: s.id, label: entryLabel(s, byId), items }]
      : [];
  });
}

/**
 * The section document with its index-th direction ticked or unticked.
 * Unticking removes the attribute, so it reads as before. Returns undefined
 * when there's no such direction (the script changed).
 */
export function withDirectionFound(
  doc: DocNode,
  index: number,
  found: boolean,
): DocNode | undefined {
  let seen = -1;
  let hit = false;
  function visit(node: DocNode): DocNode {
    if (node.type === "stageDirection") {
      seen += 1;
      if (seen === index) {
        hit = true;
        const { found: _old, ...attrs } = node.attrs ?? {};
        return { ...node, attrs: found ? { ...attrs, found: true } : attrs };
      }
      return node;
    }
    return node.content ? { ...node, content: node.content.map(visit) } : node;
  }
  const next = visit(doc);
  return hit ? next : undefined;
}

/** "n/m found" across script and extra items. */
export function brollProgress(
  groups: BrollGroup[],
  extras: ExtraBrollItem[],
): { found: number; total: number } {
  const all = [...groups.flatMap((g) => g.items), ...extras];
  return { found: all.filter((i) => i.found).length, total: all.length };
}

/**
 * What Copy list puts on the clipboard: `Hook: wolf eye close-up` for a
 * script item, `Extra: drone shot of a fjord` for an extra item.
 */
export function brollCopyText(
  groups: BrollGroup[],
  extras: ExtraBrollItem[],
): string {
  return [
    ...groups.flatMap((g) =>
      g.items.map((i) => `${g.label}: ${i.description}`),
    ),
    ...extras.map((e) => `Extra: ${e.text}`),
  ].join("\n");
}

/** The Script tab, opened at a B-roll item's entry and direction. */
export function scriptItemHref(
  projectId: string,
  item: Pick<ScriptBrollItem, "sectionId" | "index">,
): string {
  return `/projects/${projectId}?entry=${encodeURIComponent(item.sectionId)}&direction=${item.index}`;
}

/** Reads a Script tab link's target; undefined without a valid one. */
export function scriptItemTarget(params: {
  get(name: string): string | null;
}): { sectionId: string; index: number | undefined } | undefined {
  const sectionId = params.get("entry");
  if (!sectionId) return undefined;
  const raw = params.get("direction");
  const index = raw !== null && /^\d+$/.test(raw) ? Number(raw) : undefined;
  return { sectionId, index };
}

/** The bit of a ProseMirror node the direction lookup needs. */
type PmNode = {
  descendants(f: (node: { type: { name: string } }, pos: number) => void): void;
};

/**
 * The document position of the index-th stage direction (counting every
 * direction, as the B-roll list does), or undefined if there's no such one.
 */
export function directionPosition(
  doc: PmNode,
  index: number,
): number | undefined {
  let seen = -1;
  let found: number | undefined;
  doc.descendants((node, pos) => {
    if (found !== undefined) return;
    if (node.type.name === "stageDirection") {
      seen += 1;
      if (seen === index) found = pos;
    }
  });
  return found;
}
