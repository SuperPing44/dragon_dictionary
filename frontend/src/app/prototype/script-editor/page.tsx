// PROTOTYPE — throwaway, lives only on the prototype/script-editor branch.
// Three variants of the script editor, switchable via ?variant=A|B|C, answering
// "Script editor interaction and stage-direction input" (#6).

import { Suspense } from "react";
import "./prototype.css";
import { Variants } from "./variants";

export default function Page() {
  return (
    <Suspense fallback={<p className="p-8 text-neutral-500">Loading prototype…</p>}>
      <Variants />
    </Suspense>
  );
}
