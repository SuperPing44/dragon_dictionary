/**
 * How the teleprompter hands the reading position back to the Script tab.
 * Session storage, so it works for Esc and for the browser's Back alike;
 * every access is guarded, since storage can be unavailable.
 */

const READING_KEY = "dd:teleprompter-reading";
const OPENED_KEY = "dd:teleprompter-opened-from-script";

/** Notes the entry being read, so the Script tab can select it. */
export function rememberReadingEntry(projectId: string, entryId: string) {
  try {
    sessionStorage.setItem(READING_KEY, JSON.stringify({ projectId, entryId }));
  } catch {}
}

/** The entry last read in this project's teleprompter, once. */
export function takeReadingEntry(projectId: string): string | undefined {
  try {
    const raw = sessionStorage.getItem(READING_KEY);
    if (!raw) return undefined;
    const value = JSON.parse(raw);
    if (value?.projectId !== projectId) return undefined;
    sessionStorage.removeItem(READING_KEY);
    return typeof value.entryId === "string" ? value.entryId : undefined;
  } catch {
    return undefined;
  }
}

/** Notes that the teleprompter was opened from this project's Script tab. */
export function markOpenedFromScript(projectId: string) {
  try {
    sessionStorage.setItem(OPENED_KEY, projectId);
  } catch {}
}

/**
 * Whether the teleprompter was opened from this project's Script tab, so
 * leaving can go back in history instead of adding an entry. Clears it.
 */
export function takeOpenedFromScript(projectId: string): boolean {
  try {
    const opened = sessionStorage.getItem(OPENED_KEY) === projectId;
    sessionStorage.removeItem(OPENED_KEY);
    return opened;
  } catch {
    return false;
  }
}
