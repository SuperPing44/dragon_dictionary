/**
 * The Script tab's two views (v3 spec §4.2): **Sections** shows one entry
 * at a time; **Full script** shows every entry in one column.
 */
export type ScriptView = "sections" | "full";

export const DEFAULT_SCRIPT_VIEW: ScriptView = "sections";

export function isScriptView(value: unknown): value is ScriptView {
  return value === "sections" || value === "full";
}

/** Where an entry's heading sits, in px from the top of the screen. */
export type EntryTop = { id: string; top: number };

/**
 * The entry at the top of the screen in Full script: the last one whose
 * heading is at or above `line` (the bottom of the sticky header), or the
 * first entry when none has reached it yet. `tops` is in script order.
 */
export function entryAtTop(tops: EntryTop[], line: number): string | undefined {
  const EPSILON = 1;
  return tops.findLast((t) => t.top <= line + EPSILON)?.id ?? tops[0]?.id;
}

/** Where the writer is in the script when the view switches. */
export type ScriptPlace = {
  /** The entry selected in Sections. */
  selectedId: string | undefined;
  /** In Full script, the entry with the cursor. */
  cursorId: string | undefined;
  /** In Full script, the entry at the top of the screen. */
  topId: string | undefined;
};

/**
 * The entry to keep after switching to `to`: Full script scrolls to the
 * entry that was selected; Sections selects the entry with the cursor, or
 * the one at the top of the screen.
 */
export function entryAfterSwitch(
  to: ScriptView,
  place: ScriptPlace,
): string | undefined {
  if (to === "full") return place.selectedId;
  return place.cursorId ?? place.topId ?? place.selectedId;
}

/**
 * The entry the teleprompter is asked to start at: the selected one in
 * Sections; in Full script the one with the cursor, or none (so it starts
 * at the first entry) when the cursor isn't in the text.
 */
export function teleprompterEntry(
  view: ScriptView,
  place: Pick<ScriptPlace, "selectedId" | "cursorId">,
): string | undefined {
  return view === "full" ? place.cursorId : place.selectedId;
}
