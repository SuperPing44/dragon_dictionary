import { notFound } from "next/navigation";
import { Suspense } from "react";
import {
  getDescriptionFooter,
  getVideoProject,
  listProjectSources,
  listProjectTags,
  listTitleOptions,
  tagUsage,
} from "@/db";
import { Description } from "./description";
import { Tags } from "./tags";
import { TitleOptions } from "./title-options";

/**
 * The Publishing tab: everything that goes to YouTube. Title options and
 * tags sit side by side, then thumbnail drafts and the description at full
 * width (Figma F1).
 */
export default function PublishingTab({
  params,
}: PageProps<"/projects/[id]/publishing">) {
  return (
    <Suspense>
      <Publishing params={params} />
    </Suspense>
  );
}

async function Publishing({
  params,
}: {
  params: PageProps<"/projects/[id]/publishing">["params"];
}) {
  const { id } = await params;
  const project = await getVideoProject(id);
  if (!project) notFound();
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 items-start gap-6">
        <TitleOptions
          projectId={project.id}
          title={project.title}
          options={await listTitleOptions(project.id)}
        />
        <Tags
          projectId={project.id}
          tags={await listProjectTags(project.id)}
          usage={await tagUsage(project.id)}
        />
      </div>
      <Description
        key={project.id}
        projectId={project.id}
        saved={project.description}
        sources={await listProjectSources(project.id)}
        footer={await getDescriptionFooter()}
      />
    </div>
  );
}
