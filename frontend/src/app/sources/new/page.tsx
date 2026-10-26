import { Suspense } from "react";
import { v7 as uuidv7 } from "uuid";
import { getVideoProject, sourceLinkIndex } from "@/db";
import { SourceForm } from "../source-form";

export default function NewSourcePage({
  searchParams,
}: PageProps<"/sources/new">) {
  return (
    <Suspense>
      <NewSource searchParams={searchParams} />
    </Suspense>
  );
}

const first = (v: string | string[] | undefined) =>
  Array.isArray(v) ? v[0] : v;

async function NewSource({
  searchParams,
}: {
  searchParams: PageProps<"/sources/new">["searchParams"];
}) {
  const params = await searchParams;
  const projectId = first(params.project);
  const project = projectId ? await getVideoProject(projectId) : undefined;
  return (
    <SourceForm
      // A fresh form on every visit: Next keeps visited pages alive, and an
      // abandoned new source would otherwise come back half filled in.
      key={uuidv7()}
      links={await sourceLinkIndex()}
      linkTo={project && { id: project.id, title: project.title }}
      initialTitle={first(params.title)?.trim()}
      subtitle={
        project
          ? `Will be linked to “${project.title}” when saved`
          : "Saved once, linked to any number of video projects"
      }
      aside={
        <p className="rounded-[18px] border border-border-strong border-dashed p-5 text-[16px] text-fg-muted italic">
          Save the source first, then add its PDFs and quotes here.
        </p>
      }
    />
  );
}
