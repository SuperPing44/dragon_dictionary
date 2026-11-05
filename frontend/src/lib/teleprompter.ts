import type { Section } from "@/db/schema";
import { SECTION_KIND_LABELS } from "./labels";
import { type DocNode, hasContent, parseDoc } from "./script";

/** Speed levels: level n scrolls 3n lines per minute. */
export const MIN_SPEED_LEVEL = 1;
export const MAX_SPEED_LEVEL = 20;
export const DEFAULT_SPEED_LEVEL = 8;
const LINES_PER_MINUTE_PER_LEVEL = 3;

/** Text size in px. */
export const MIN_TEXT_SIZE = 32;
export const MAX_TEXT_SIZE = 96;
export const DEFAULT_TEXT_SIZE = 56;
export const TEXT_SIZE_STEP = 4;

/** Line height of the teleprompter text, in em. */
export const LINE_HEIGHT = 1.35;

/** The longest frame step, so nothing jumps after Alt+Tab. */
export const MAX_FRAME_MS = 100;

/** What the teleprompter needs of a stored section. */
export type PromptSection = Pick<
  Section,
  "id" | "kind" | "title" | "parent" | "content"
>;

/** One entry the teleprompter shows: a section or subsection with text. */
export type PromptEntry = { id: string; label: string; doc: DocNode };

function labelOf(s: PromptSection, byId: Map<string, PromptSection>): string {
  const own = s.kind ? SECTION_KIND_LABELS[s.kind] : s.title || "Untitled";
  const parent = s.parent ? byId.get(s.parent) : undefined;
  if (!parent) return own;
  return `${labelOf(parent, byId)} · ${s.title || "Untitled"}`;
}

/**
 * The entries to show, in script order (top-level sections, each followed
 * by its subsections). Empty entries are skipped entirely.
 */
export function prompterEntries(sections: PromptSection[]): PromptEntry[] {
  const byId = new Map(sections.map((s) => [s.id, s]));
  return sections.flatMap((s) => {
    const doc = parseDoc(s.content);
    return hasContent(doc) ? [{ id: s.id, label: labelOf(s, byId), doc }] : [];
  });
}

/** Whether there's anything to read: the button is disabled otherwise. */
export function canPrompt(sections: PromptSection[]): boolean {
  return sections.some((s) => hasContent(parseDoc(s.content)));
}

/**
 * Where reading starts: the selected entry, or the next one with text if
 * it's empty. With only empty entries after it, the last one with text
 * before it; with no selection, the first entry with text.
 */
export function startEntryId(
  sections: PromptSection[],
  selectedId: string | undefined,
): string | undefined {
  const filled = sections.map((s) => hasContent(parseDoc(s.content)));
  const at = sections.findIndex((s) => s.id === selectedId);
  const from = Math.max(at, 0);
  const next = filled.indexOf(true, from);
  if (next !== -1) return sections[next].id;
  const before = filled.lastIndexOf(true, from);
  return before === -1 ? undefined : sections[before].id;
}

/** Scroll speed in px per second, so the pace in lines holds at any size. */
export function pixelsPerSecond(level: number, textSize: number): number {
  return (LINES_PER_MINUTE_PER_LEVEL * level * textSize * LINE_HEIGHT) / 60;
}

/** One animation step: elapsed time × speed, capped, stopping at the end. */
export function advance(
  y: number,
  elapsedMs: number,
  pxPerSecond: number,
  endY: number,
): { y: number; ended: boolean } {
  const next = y + (Math.min(elapsedMs, MAX_FRAME_MS) / 1000) * pxPerSecond;
  return next >= endY ? { y: endY, ended: true } : { y: next, ended: false };
}

export function isValidSpeedLevel(level: number): boolean {
  return (
    Number.isInteger(level) &&
    level >= MIN_SPEED_LEVEL &&
    level <= MAX_SPEED_LEVEL
  );
}

export function isValidTextSize(size: number): boolean {
  return (
    Number.isInteger(size) &&
    size >= MIN_TEXT_SIZE &&
    size <= MAX_TEXT_SIZE &&
    (size - MIN_TEXT_SIZE) % TEXT_SIZE_STEP === 0
  );
}

const clamp = (n: number, min: number, max: number) =>
  Math.min(max, Math.max(min, n));

/** One speed level faster (+1) or slower (−1), within 1–20. */
export function stepSpeedLevel(level: number, by: 1 | -1): number {
  return clamp(level + by, MIN_SPEED_LEVEL, MAX_SPEED_LEVEL);
}

/** One step (4 px) bigger (+1) or smaller (−1), within 32–96 px. */
export function stepTextSize(size: number, by: 1 | -1): number {
  return clamp(size + by * TEXT_SIZE_STEP, MIN_TEXT_SIZE, MAX_TEXT_SIZE);
}

/** What a teleprompter key does. */
export type KeyAction =
  | "toggle"
  | "faster"
  | "slower"
  | "bigger"
  | "smaller"
  | "previous"
  | "next"
  | "top"
  | "leave"
  | "fullscreen"
  | "hints";

/** The parts of a keydown event the mapping reads. */
export type KeyInput = Pick<
  KeyboardEvent,
  "code" | "key" | "repeat" | "isComposing" | "ctrlKey" | "metaKey" | "altKey"
>;

const BY_CODE: Record<string, KeyAction> = {
  Space: "toggle",
  ArrowUp: "faster",
  ArrowDown: "slower",
  ArrowLeft: "previous",
  ArrowRight: "next",
  Home: "top",
  Escape: "leave",
  KeyF: "fullscreen",
};

// Matched on the character: layouts put these on different keys (German
// has + on its own key and − on Slash).
const BY_KEY: Record<string, KeyAction> = {
  "+": "bigger",
  "-": "smaller",
  "−": "smaller",
  "?": "hints",
};

/** Actions a held key repeats. */
const REPEATS = new Set<KeyAction>(["faster", "slower", "bigger", "smaller"]);

/**
 * The action for a keydown: null when it isn't a teleprompter key (or comes
 * with a modifier or during IME composition), "none" when it is one but a
 * held-down repeat that shouldn't act again.
 */
export function keyAction(e: KeyInput): KeyAction | "none" | null {
  if (e.isComposing || e.ctrlKey || e.metaKey || e.altKey) return null;
  const action = BY_CODE[e.code] ?? BY_KEY[e.key];
  if (!action) return null;
  return e.repeat && !REPEATS.has(action) ? "none" : action;
}

/**
 * Where ← (−1) or → (+1) goes: the start of the previous or next entry,
 * given the entries' scroll positions; undefined past either end. The
 * previous entry is the one before the current position, so ← from inside
 * an entry goes back to that entry's start first.
 */
export function jumpTarget(
  tops: number[],
  y: number,
  direction: 1 | -1,
): number | undefined {
  const EPSILON = 1;
  return direction > 0
    ? tops.find((top) => top > y + EPSILON)
    : tops.findLast((top) => top < y - EPSILON);
}
