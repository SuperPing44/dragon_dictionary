"use client";

import { useEffect, useRef, useState } from "react";

/** How long typing has to pause before a free-text field saves (spec §7.1). */
export const SAVE_DELAY_MS = 1000;

type AutosaveOptions = {
  /** Never save a blank value; blurring restores the last saved one. */
  required?: boolean;
};

/**
 * The value of a free-text field that saves about a second after typing
 * stops, at once on blur, and on unmount if a save is still pending.
 */
export function useAutosave(
  saved: string,
  onSave: (value: string) => Promise<void>,
  { required }: AutosaveOptions = {},
) {
  const [value, setValue] = useState(saved);
  const lastSaved = useRef(saved);
  const pending = useRef<string | undefined>(undefined);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const saveRef = useRef(onSave);
  saveRef.current = onSave;

  function save(next: string) {
    clearTimeout(timer.current);
    pending.current = undefined;
    if (next === lastSaved.current) return;
    if (required && !next.trim()) return;
    lastSaved.current = next;
    void saveRef.current(next);
  }

  // Flushes a pending save when the field goes away, e.g. on a tab change.
  // biome-ignore lint/correctness/useExhaustiveDependencies: runs on unmount only
  useEffect(
    () => () => {
      if (pending.current !== undefined) save(pending.current);
    },
    [],
  );

  function change(next: string) {
    setValue(next);
    pending.current = next;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => save(next), SAVE_DELAY_MS);
  }

  function blur() {
    save(value);
    if (required && !value.trim()) setValue(lastSaved.current);
  }

  return { value, change, blur };
}
