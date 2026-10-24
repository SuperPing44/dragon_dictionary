"use client";

// PROTOTYPE — throwaway. Holds the in-memory script (shared across variants, so
// edits survive switching) and renders the chosen variant plus the state panel.

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { PrototypeSwitcher } from "../prototype-switcher";
import { SAMPLE } from "./sample-script";
import { KIND_LABEL, useScript } from "./script-model";
import * as A from "./variant-a";
import * as B from "./variant-b";
import * as C from "./variant-c";

const VARIANTS = [
  { key: "A", name: A.name },
  { key: "B", name: B.name },
  { key: "C", name: C.name },
];

export function Variants() {
  const variant = useSearchParams().get("variant") ?? "A";
  const script = useScript(SAMPLE);

  return (
    <>
      {variant === "A" && <A.VariantA script={script} />}
      {variant === "B" && <B.VariantB script={script} />}
      {variant === "C" && <C.VariantC script={script} />}
      <StatePanel script={script} />
      <PrototypeSwitcher variants={VARIANTS} current={variant} />
    </>
  );
}

// "Surface the state": what would be stored, and what the B-roll list /
// teleprompter could read later.
function StatePanel({ script }: { script: ReturnType<typeof useScript> }) {
  const [open, setOpen] = useState(false);
  const state = {
    totalWords: script.totalWords,
    sections: script.sections.map((s) => ({
      kind: s.kind,
      label: KIND_LABEL[s.kind],
      words: s.words,
      directions: s.directions,
      subsections: s.kind === "main"
        ? s.subsections.map((x) => ({ title: x.title, words: x.words, directions: x.directions }))
        : undefined,
    })),
  };
  return (
    <div className="fixed bottom-4 right-4 z-50 text-xs">
      {open && (
        <pre className="mb-2 max-h-[60vh] w-96 overflow-auto rounded-lg bg-black p-3 text-green-300 shadow-xl">
          {JSON.stringify(state, null, 2)}
        </pre>
      )}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="float-right rounded-full bg-black px-3 py-1.5 text-white ring-2 ring-fuchsia-500"
      >
        {open ? "Hide state" : "Show state"}
      </button>
    </div>
  );
}
