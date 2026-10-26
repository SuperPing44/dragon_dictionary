import { Suspense } from "react";
import { listProjectSources, listSources } from "@/db";
import { SourcesTab } from "./sources-tab";

/** The Sources tab. */
export default function SourcesTabPage({
  params,
}: PageProps<"/projects/[id]/sources">) {
  return (
    <Suspense>
      <Sources params={params} />
    </Suspense>
  );
}

async function Sources({
  params,
}: {
  params: PageProps<"/projects/[id]/sources">["params"];
}) {
  const { id } = await params;
  return (
    <SourcesTab
      projectId={id}
      linked={await listProjectSources(id)}
      library={await listSources()}
    />
  );
}
