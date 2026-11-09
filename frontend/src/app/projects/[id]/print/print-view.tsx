"use client";

import { useRouter } from "next/navigation";
import { useEffect, useEffectEvent } from "react";
import type { PrintEntry } from "@/lib/script-print";
import { PrintScript } from "@/lib/script-print-render";
import { takeOpenedFromScript } from "@/lib/teleprompter-return";

/** On <html> while the print layout is shown: the print CSS applies. */
const PRINTING_CLASS = "printing-script";

type PrintViewProps = {
  projectId: string;
  /** The project title, on top of the first page. */
  title: string;
  /** The entries with text; none means there's nothing to print. */
  entries: PrintEntry[];
};

/**
 * Shows the print layout over the app as a white page, opens the print
 * dialog once the fonts are in, and goes back to the script after it.
 */
export function PrintView({ projectId, title, entries }: PrintViewProps) {
  const canPrint = entries.length > 0;
  const router = useRouter();

  const leave = useEffectEvent(() => {
    if (takeOpenedFromScript(projectId)) router.back();
    else router.replace(`/projects/${projectId}`);
  });

  // Next keeps a visited page alive but hidden, so this runs on every
  // visit: the effect is cleaned up when the page is hidden. Only then is
  // the print CSS switched on, so Ctrl+P elsewhere prints the app as usual.
  useEffect(() => {
    if (!canPrint) return;
    let cancelled = false;
    const root = document.documentElement;
    root.classList.add(PRINTING_CLASS);
    const afterPrint = () => leave();
    window.addEventListener("afterprint", afterPrint, { once: true });
    // The serif must be loaded, or the PDF falls back to another font.
    void document.fonts.ready.then(() => {
      if (!cancelled) requestAnimationFrame(() => window.print());
    });
    return () => {
      cancelled = true;
      root.classList.remove(PRINTING_CLASS);
      window.removeEventListener("afterprint", afterPrint);
    };
  }, [canPrint]);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-canvas">
      <div className="sticky top-0 z-10 flex items-center gap-3 bg-canvas px-6 py-3 font-label text-[13px]">
        <button
          type="button"
          onClick={() => leave()}
          className="font-medium text-fg-muted hover:text-fg"
        >
          ← Back to the script
        </button>
        <span className="flex-1" />
        {canPrint ? (
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-xl border border-accent/60 bg-accent/10 px-3 py-2 font-bold font-heading text-accent-glow tracking-[0.78px] hover:bg-accent/15"
          >
            Print or save as PDF
          </button>
        ) : (
          <span className="text-fg-muted">
            Nothing to print yet · Write something in any section first
          </span>
        )}
      </div>
      <div className="mx-auto mb-10 w-[210mm] bg-white px-[20mm] py-[18mm] shadow-[0_10px_40px_rgb(0_0_0/0.6)]">
        <PrintScript title={title} entries={entries} />
      </div>
    </div>
  );
}
