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
    />
  );
}
