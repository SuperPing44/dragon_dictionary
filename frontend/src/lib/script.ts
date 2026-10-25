import { SECTION_KINDS, type SectionKind } from "@/db/schema";

/** The subset of Tiptap JSON the script rules need. */
export type DocNode = {
  type?: string;
  text?: string;
  content?: DocNode[];
};

/** Inline nodes that are never spoken, so never counted as words. */
const UNSPOKEN = new Set(["stageDirection"]);

/** Block-level text, with inline breaks and unspoken nodes as spaces. */
function blockTexts(node: DocNode, out: string[] = []): string[] {
  if (!node.content) return out;
  const isTextBlock = node.content.some((c) => c.type === "text");
  if (!isTextBlock) {
    for (const child of node.content) blockTexts(child, out);
    return out;
  }
  out.push(
    node.content
      .map((c) => (c.type === "text" && c.text ? c.text : " "))
      .join(""),
  );
  return out;
}

/**
 * Spoken words in a section: tokens between whitespace that contain a
 * letter or digit. Stage directions don't count.
 */
export function countWords(doc: DocNode): number {
  const pruned = prune(doc);
  return blockTexts(pruned)
    .flatMap((text) => text.split(/\s+/))
    .filter((token) => /[\p{L}\p{N}]/u.test(token)).length;
}

function prune(node: DocNode): DocNode {
  if (!node.content) return node;
  return {
    ...node,
    content: node.content.map((c) =>
      c.type && UNSPOKEN.has(c.type) ? { type: "hardBreak" } : prune(c),
    ),
  };
}

function hasNode(node: DocNode, type: string): boolean {
  return (
    node.type === type || (node.content ?? []).some((c) => hasNode(c, type))
  );
}

/** Text or stage directions: removing it then needs a confirmation. */
export function hasContent(doc: DocNode): boolean {
  return countWords(doc) > 0 || hasNode(doc, "stageDirection");
}

/** Parses stored section content; anything unreadable counts as empty. */
export function parseDoc(content: string): DocNode {
  try {
    const doc = JSON.parse(content);
    return doc && typeof doc === "object" ? doc : { type: "doc" };
  } catch {
    return { type: "doc" };
  }
}

/**
 * Where a re-added section goes among the existing top-level sections (in
 * their current order): right after the nearest preceding canonical kind
 * that exists, otherwise at the top.
 */
export function canonicalInsertIndex(
  existing: SectionKind[],
  kind: SectionKind,
): number {
  for (let rank = SECTION_KINDS.indexOf(kind) - 1; rank >= 0; rank--) {
    const at = existing.indexOf(SECTION_KINDS[rank]);
    if (at !== -1) return at + 1;
  }
  return 0;
}

/** The kinds a script doesn't have yet, in canonical order. */
export function missingKinds(existing: SectionKind[]): SectionKind[] {
  return SECTION_KINDS.filter((k) => !existing.includes(k));
}
