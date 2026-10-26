import { Suspense } from "react";
import { sourceLinkIndex } from "@/db";
import { SourceForm } from "../source-form";

export default function NewSourcePage() {
  return (
    <Suspense>
      <NewSource />
    </Suspense>
  );
}

async function NewSource() {
  return (
    <SourceForm
      links={await sourceLinkIndex()}
      subtitle="Saved once, linked to any number of video projects"
      aside={
        <p className="rounded-[18px] border border-border-strong border-dashed p-5 text-[16px] text-fg-muted italic">
          Save the source first, then add its PDFs here.
        </p>
      }
    />
  );
}
