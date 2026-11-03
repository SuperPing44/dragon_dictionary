import { Suspense } from "react";
import { listSections } from "@/db";
import { prompterEntries, startEntryId } from "@/lib/teleprompter";
import { Teleprompter } from "./teleprompter";

/**
 * The teleprompter: a full-window, read-only view of the script, opened
 * from the Script tab at `?entry=<section-id>`.
 */
export default function TeleprompterPage({
  params,
  searchParams,
}: PageProps<"/projects/[id]/teleprompter">) {
  return (
    <Suspense>
      <Prompter params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function Prompter({
  params,
  searchParams,
}: Pick<PageProps<"/projects/[id]/teleprompter">, "params" | "searchParams">) {
  const { id } = await params;
  const { entry } = await searchParams;
  const sections = await listSections(id);
  return (
    <Teleprompter
      projectId={id}
      entries={prompterEntries(sections)}
      startId={startEntryId(
        sections,
        typeof entry === "string" ? entry : undefined,
      )}
    />
  );
}
