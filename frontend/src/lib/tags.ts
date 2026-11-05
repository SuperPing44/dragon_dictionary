/** YouTube's limit for all tags together; the counter turns amber past it. */
export const TAGS_LIMIT = 500;

const MAX_SUGGESTIONS = 6;

/** A tag used on other projects, with how many projects use it. */
export type TagUsage = { text: string; projects: number };

/** What Copy puts on the clipboard: the tags, comma-separated. */
export function tagsCopyText(tags: string[]): string {
  return tags.join(", ");
}

/** Whether a tag is already in the list, ignoring case and surrounding spaces. */
export function hasTag(tags: string[], text: string): boolean {
  const key = text.trim().toLowerCase();
  return tags.some((t) => t.toLowerCase() === key);
}

/**
 * Splits typed or pasted input at commas: every complete part is a tag to
 * add, and the text after the last comma stays in the input.
 */
export function splitTagInput(input: string): { add: string[]; rest: string } {
  const parts = input.split(",");
  const rest = parts.pop() ?? "";
  return { add: parts.map((p) => p.trim()).filter(Boolean), rest };
}

/**
 * Suggestions while typing: tags from other projects that contain the
 * query (ignoring case) and aren't on this project yet, most used first.
 */
export function tagSuggestions(
  usage: TagUsage[],
  query: string,
  current: string[],
): TagUsage[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return usage
    .filter((u) => u.text.toLowerCase().includes(q) && !hasTag(current, u.text))
    .sort((a, b) => b.projects - a.projects || a.text.localeCompare(b.text))
    .slice(0, MAX_SUGGESTIONS);
}
