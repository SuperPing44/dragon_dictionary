/**
 * Browser fullscreen and the screen wake lock, for the teleprompter. Both
 * can be refused or missing; the teleprompter works without them.
 * `http://localhost` counts as a secure context, so the wake lock is
 * available in the daily copy.
 */

type Sentinel = { release: () => Promise<void> };

/** The part of `navigator` the wake lock needs. */
export type WakeLockNavigator = {
  wakeLock?: { request: (type: "screen") => Promise<Sentinel> };
};

/** The part of `document` the visibility handling needs. */
export type VisibilityDoc = {
  visibilityState: DocumentVisibilityState;
  addEventListener: (type: "visibilitychange", fn: () => void) => void;
  removeEventListener: (type: "visibilitychange", fn: () => void) => void;
};

/**
 * Keeps the screen awake until the returned stop function is called. The
 * browser drops the lock when the page is hidden, so it's requested again
 * whenever the page becomes visible.
 */
export function holdScreenAwake(
  nav: WakeLockNavigator,
  doc: VisibilityDoc,
): () => void {
  let sentinel: Sentinel | undefined;
  let stopped = false;

  const release = (s: Sentinel) => void s.release().catch(() => {});

  async function request() {
    if (stopped || doc.visibilityState !== "visible" || !nav.wakeLock) return;
    try {
      const next = await nav.wakeLock.request("screen");
      if (stopped) release(next);
      else sentinel = next;
    } catch {
      // Refused (e.g. battery saver): the teleprompter still works.
    }
  }

  const onVisibility = () => void request();
  doc.addEventListener("visibilitychange", onVisibility);
  void request();

  return () => {
    stopped = true;
    doc.removeEventListener("visibilitychange", onVisibility);
    if (sentinel) release(sentinel);
    sentinel = undefined;
  };
}

/** The part of `document` fullscreen needs. */
export type FullscreenDoc = {
  fullscreenElement: unknown;
  documentElement: { requestFullscreen?: () => Promise<void> };
};

/**
 * Puts the whole page in browser fullscreen. Must run in a user gesture (a
 * click or keydown); a refusal is ignored.
 */
export function enterFullscreen(doc: FullscreenDoc): void {
  if (doc.fullscreenElement) return;
  doc.documentElement.requestFullscreen?.().catch(() => {});
}
