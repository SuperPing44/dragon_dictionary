import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getVideoProject, listTitleOptions } from "@/db";
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
      </div>
    </div>
  );
}
