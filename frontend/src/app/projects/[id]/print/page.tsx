import { Suspense } from "react";
import { getVideoProject, listSections } from "@/db";
import { printEntries } from "@/lib/script-print";
import { PrintView } from "./print-view";

/**
 * The Script PDF (v3 spec §4.3): a print layout of the saved script that
 * opens the browser's print dialog, where it's saved as PDF.
 */
export default function PrintPage({
  params,
}: PageProps<"/projects/[id]/print">) {
  return (
    <Suspense>
      <Print params={params} />
    </Suspense>
  );
}

async function Print({
  params,
}: {
  params: PageProps<"/projects/[id]/print">["params"];
}) {
  const { id } = await params;
  const project = await getVideoProject(id);
  const entries = printEntries(await listSections(id));
  return (
    <PrintView projectId={id} title={project?.title ?? ""} entries={entries} />
  );
}
