import { notFound } from "next/navigation";
import { Suspense } from "react";
import {
  getSource,
  listQuotes,
  listSourceFiles,
  projectsOfSource,
  sourceLinkIndex,
} from "@/db";
import { formatDay } from "@/lib/format";
import { SOURCE_TYPE_LABELS } from "@/lib/sources";
import { LinkedProjects } from "../linked-projects";
import { SourceForm } from "../source-form";
import { SourcePdfs } from "../source-pdfs";
import { SourceQuotes } from "../source-quotes";

export default function SourcePage({ params }: PageProps<"/sources/[id]">) {
  return (
    <Suspense>
      <SourceDetails params={params} />
    </Suspense>
  );
}

async function SourceDetails({
  params,
}: {
  params: PageProps<"/sources/[id]">["params"];
}) {
  const { id } = await params;
  const source = await getSource(id);
  if (!source) notFound();
  const added = formatDay(source.created);
  return (
    <SourceForm
      key={source.id}
      source={source}
      links={await sourceLinkIndex()}
      subtitle={`${SOURCE_TYPE_LABELS[source.type]} · added ${added === "Today" ? "today" : added}`}
      aside={
        <>
          <SourcePdfs sourceId={source.id} files={await listSourceFiles(id)} />
          <SourceQuotes sourceId={source.id} quotes={await listQuotes(id)} />
          <LinkedProjects projects={await projectsOfSource(id)} />
        </>
      }
    />
  );
}
