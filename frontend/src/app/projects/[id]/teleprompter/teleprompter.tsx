"use client";

import { useRouter } from "next/navigation";
import {
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {
  advance,
  DEFAULT_SPEED_LEVEL,
  DEFAULT_TEXT_SIZE,
  LINE_HEIGHT,
  type PromptEntry,
  pixelsPerSecond,
} from "@/lib/teleprompter";
import { renderEntry } from "@/lib/teleprompter-render";
import {
  rememberReadingEntry,
  takeOpenedFromScript,
} from "@/lib/teleprompter-return";

type TeleprompterProps = {
  projectId: string;
  /** The entries with text, in script order. */
  entries: PromptEntry[];
  /** Where reading starts; undefined for an empty script. */
  startId: string | undefined;
};

/** The keys, as shown in the key-hint panel (spec §5.1). */
const KEY_HINTS: [string, string][] = [
  ["Space", "pause / resume"],
  ["↑ ↓", "faster / slower"],
  ["← →", "previous / next entry"],
  ["+ −", "text size"],
  ["Home", "back to the top"],
  ["Esc", "pause in fullscreen · leave outside it"],
  ["F", "fullscreen"],
  ["?", "show these keys again"],
];

/**
 * The teleprompter, read straight off the laptop screen ("Broadcast" look).
 * One column moves up with a requestAnimationFrame loop; the line being
 * read sits in a band one third down. Position and speed live in refs, not
 * state, so scrolling never re-renders.
 */
export function Teleprompter({
  projectId,
  entries,
  startId,
}: TeleprompterProps) {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  // The key hints show until scrolling first starts.
  const [started, setStarted] = useState(false);
  const [ended, setEnded] = useState(false);
  const [textSize] = useState(DEFAULT_TEXT_SIZE);
  const speedLevel = useRef(DEFAULT_SPEED_LEVEL);
  const y = useRef(0);
  const reading = useRef(startId);
  const column = useRef<HTMLDivElement>(null);
  const endMarker = useRef<HTMLDivElement>(null);

  const lineHeight = () => textSize * LINE_HEIGHT;

  const entryElements = () =>
    Array.from(
      column.current?.querySelectorAll<HTMLElement>("[data-entry]") ?? [],
    );

  /** The scroll position that puts an entry's first line in the band. */
  const entryTop = (id: string | undefined) =>
    entryElements().find((el) => el.dataset.entry === id)?.offsetTop ?? 0;

  /** The scroll position that centres "— End —" on the reading line. */
  const endY = () => {
    const marker = endMarker.current;
    if (!marker) return 0;
    return marker.offsetTop + marker.offsetHeight / 2 - lineHeight() / 2;
  };

  /** Moves the column and notes which entry is being read. */
  function place(next: number) {
    y.current = next;
    if (column.current) {
      column.current.style.transform = `translate3d(0, ${-next}px, 0)`;
    }
    let current = reading.current;
    for (const el of entryElements()) {
      if (el.offsetTop > next + lineHeight() / 2) break;
      current = el.dataset.entry;
    }
    if (current && current !== reading.current) {
      reading.current = current;
      rememberReadingEntry(projectId, current);
    }
  }

  // Start with the start entry's first line in the band, and again once
  // the font has loaded, since that can change where lines wrap.
  const placeAtStart = useEffectEvent(() => {
    if (startId) rememberReadingEntry(projectId, startId);
    place(entryTop(startId));
  });
  const placeAfterFonts = useEffectEvent(() => {
    if (!started) place(entryTop(reading.current));
  });
  useLayoutEffect(() => {
    placeAtStart();
    void document.fonts?.ready.then(() => placeAfterFonts());
  }, []);

  /** One frame: returns whether the end was reached. */
  const step = useEffectEvent((elapsedMs: number) => {
    const next = advance(
      y.current,
      elapsedMs,
      pixelsPerSecond(speedLevel.current, textSize),
      endY(),
    );
    place(next.y);
    if (next.ended) {
      setRunning(false);
      setEnded(true);
    }
    return next.ended;
  });

  useEffect(() => {
    if (!running) return;
    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const elapsed = now - last;
      last = now;
      if (!step(elapsed)) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [running]);

  function leave() {
    if (reading.current) rememberReadingEntry(projectId, reading.current);
    if (takeOpenedFromScript(projectId)) router.back();
    else router.replace(`/projects/${projectId}`);
  }

  // One keydown listener on window for every teleprompter key.
  const onKey = useEffectEvent((e: KeyboardEvent) => {
    if (e.isComposing || e.ctrlKey || e.metaKey || e.altKey) return;
    switch (e.code) {
      case "Space":
        e.preventDefault();
        if (e.repeat || ended) return;
        setStarted(true);
        setRunning(!running);
        return;
      case "Escape":
        e.preventDefault();
        leave();
        return;
    }
  });
  useEffect(() => {
    const handle = (e: KeyboardEvent) => onKey(e);
    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  }, []);

  return (
    <div
      role="document"
      aria-label="Teleprompter"
      className="fixed inset-0 z-50 overflow-hidden bg-prompter font-label font-semibold text-fg"
      style={{ fontSize: textSize, lineHeight: LINE_HEIGHT }}
    >
      {/* The reading band, one line tall, one third down. */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-[calc(100%/3_-_0.675em)] h-[1.35em] border-accent/40 border-y bg-accent/10"
      />
      <span
        aria-hidden
        className="absolute top-[calc(100%/3)] left-[0.6rem] -translate-y-1/2 text-[18px] text-accent"
      >
        ▶
      </span>
      <span
        aria-hidden
        className="absolute top-[calc(100%/3)] right-[0.6rem] -translate-y-1/2 text-[18px] text-accent"
      >
        ◀
      </span>

      <div className="prompter-fade absolute inset-0">
        <div className="absolute inset-x-0 top-[calc(100%/3_-_0.675em)]">
          <div
            ref={column}
            className="relative mx-auto w-[min(17em,calc(100vw_-_8rem))] will-change-transform"
          >
            {entries.map((entry, i) => (
              <div key={entry.id} className={i > 0 ? "pt-[1.4em]" : ""}>
                <p className="pb-[0.8em] text-[0.32em] text-fg-faint uppercase leading-normal tracking-[0.18em]">
                  {entry.label}
                </p>
                <div data-entry={entry.id} className="prompter-text">
                  {renderEntry(entry.doc)}
                </div>
              </div>
            ))}
            <div
              ref={endMarker}
              className="pt-[2.5em] text-center text-[0.4em] text-fg-faint"
            >
              — End —
            </div>
          </div>
        </div>
      </div>

      {!running && !ended && (
        <p className="absolute top-6 left-1/2 -translate-x-1/2 font-semibold text-[13px] text-fg-muted leading-normal tracking-[0.2em]">
          ❚❚ PAUSED
        </p>
      )}

      {!started && <KeyHints />}
    </div>
  );
}

/** The key-hint panel, shown while paused until scrolling first starts. */
function KeyHints() {
  return (
    <div className="absolute bottom-10 left-1/2 flex -translate-x-1/2 flex-col gap-3 rounded-2xl border border-border-soft bg-surface-1/90 px-6 py-4 font-medium text-[13px] leading-normal">
      <p className="text-center text-fg-muted">
        Press <Kbd>Space</Kbd> to start
      </p>
      <dl className="grid grid-cols-[auto_1fr_auto_1fr] items-center gap-x-4 gap-y-2">
        {KEY_HINTS.map(([key, action]) => (
          <div key={key} className="contents">
            <dt className="justify-self-end">
              <Kbd>{key}</Kbd>
            </dt>
            <dd className="text-fg-faint">{action}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded-[5px] border border-border-strong bg-surface-2 px-1.5 py-0.5 font-label text-[12px] text-fg">
      {children}
    </kbd>
  );
}
