/** YouTube's title limit; the counter turns amber past it. */
export const TITLE_LIMIT = 100;

/**
 * Whether an option's text is the project title: surrounding spaces are
 * ignored, otherwise it must match exactly.
 */
export function matchesTitle(text: string, title: string): boolean {
  return text.trim() === title.trim();
}

/** The final option: the first one whose text matches the project title. */
export function finalOption<T extends { text: string }>(
  options: T[],
  title: string,
): T | undefined {
  return options.find((o) => matchesTitle(o.text, title));
}

/** Whether another option already has this text, ignoring case. */
export function isDuplicateOption(
  options: { id: string; text: string }[],
  text: string,
  exceptId?: string,
): boolean {
  const key = text.trim().toLowerCase();
  return options.some(
    (o) => o.id !== exceptId && o.text.trim().toLowerCase() === key,
  );
}
