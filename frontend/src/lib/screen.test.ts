import { describe, expect, it, vi } from "vitest";
import {
  enterFullscreen,
  type FullscreenDoc,
  holdScreenAwake,
  type VisibilityDoc,
  type WakeLockNavigator,
} from "./screen";

/** Lets pending promise callbacks run. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

function fakeDoc(visible = true) {
  const listeners = new Set<() => void>();
  const doc: VisibilityDoc & { fire: (state: string) => void } = {
    visibilityState: visible ? "visible" : "hidden",
    addEventListener: (_type: string, fn: () => void) => listeners.add(fn),
    removeEventListener: (_type: string, fn: () => void) =>
      listeners.delete(fn),
    fire(state: string) {
      doc.visibilityState = state as DocumentVisibilityState;
      for (const fn of listeners) fn();
    },
  };
  return doc;
}

function fakeWakeLock(fail = false) {
  const released: number[] = [];
  let count = 0;
  const nav: WakeLockNavigator = {
    wakeLock: {
      request: vi.fn(async () => {
        if (fail) throw new Error("NotAllowedError");
        const id = ++count;
        return {
          release: async () => {
            released.push(id);
          },
        };
      }),
    },
  };
  return { nav, released, requests: () => count };
}

describe("holdScreenAwake", () => {
  it("requests a screen wake lock and releases it on stop", async () => {
    const { nav, released } = fakeWakeLock();
    const stop = holdScreenAwake(nav, fakeDoc());
    await settle();
    expect(nav.wakeLock?.request).toHaveBeenCalledWith("screen");
    stop();
    await settle();
    expect(released).toEqual([1]);
  });

  it("requests it again when the page becomes visible again", async () => {
    const { nav, requests } = fakeWakeLock();
    const doc = fakeDoc();
    const stop = holdScreenAwake(nav, doc);
    await settle();
    doc.fire("hidden");
    doc.fire("visible");
    await settle();
    expect(requests()).toBe(2);
    stop();
    doc.fire("visible");
    await settle();
    expect(requests()).toBe(2);
  });

  it("releases a lock that arrives after stopping", async () => {
    const { nav, released } = fakeWakeLock();
    const stop = holdScreenAwake(nav, fakeDoc());
    stop();
    await settle();
    expect(released).toEqual([1]);
  });

  it("keeps working when the lock is refused or unsupported", async () => {
    const refused = fakeWakeLock(true);
    expect(() => holdScreenAwake(refused.nav, fakeDoc())()).not.toThrow();
    expect(() => holdScreenAwake({}, fakeDoc())()).not.toThrow();
    await settle();
  });
});

describe("enterFullscreen", () => {
  const fakeFullscreen = (inFullscreen: boolean, reject = false) => {
    const requestFullscreen = vi.fn(() =>
      reject ? Promise.reject(new Error("denied")) : Promise.resolve(),
    );
    const doc: FullscreenDoc = {
      fullscreenElement: inFullscreen ? {} : null,
      documentElement: { requestFullscreen },
    };
    return { doc, requestFullscreen };
  };

  it("asks the browser for fullscreen on the whole page", () => {
    const { doc, requestFullscreen } = fakeFullscreen(false);
    enterFullscreen(doc);
    expect(requestFullscreen).toHaveBeenCalledOnce();
  });

  it("does nothing when already in fullscreen", () => {
    const { doc, requestFullscreen } = fakeFullscreen(true);
    enterFullscreen(doc);
    expect(requestFullscreen).not.toHaveBeenCalled();
  });

  it("swallows a refusal", async () => {
    const { doc } = fakeFullscreen(false, true);
    expect(() => enterFullscreen(doc)).not.toThrow();
    await settle();
  });
});
