"use client";

import { useTransition } from "react";
import { backUpNowAction } from "@/app/backup-actions";

export function BackUpNowButton() {
  const [busy, start] = useTransition();
  return (
    <button
      type="button"
      disabled={busy}
      onClick={() =>
        start(async () => {
          await backUpNowAction();
        })
      }
      className="w-full rounded-xl border border-border-strong bg-surface-3 px-[18px] py-2.5 font-bold font-heading text-[13px] text-accent-glow tracking-[0.78px] disabled:opacity-60"
    >
      {busy ? "Backing up…" : "Back up now"}
    </button>
  );
}
