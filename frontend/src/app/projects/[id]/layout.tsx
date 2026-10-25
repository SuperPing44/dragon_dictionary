import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getVideoProject, listCategories, nextCategoryColour } from "@/db";
import { OriginalIdea } from "./original-idea";
import { ProjectHeader } from "./project-header";
import { ProjectTabs } from "./project-tabs";

export default function ProjectLayout({
  params,
  children,
}: LayoutProps<"/projects/[id]">) {
  return (
    <>
      <Link
        href="/projects"
        className="self-start font-label font-medium text-[13px] text-fg-muted hover:text-fg"
      >
        ← Video projects
      </Link>
      <Suspense>
        <ProjectShell params={params}>{children}</ProjectShell>
      </Suspense>
    </>
  );
}

async function ProjectShell({
  params,
  children,
}: {
  params: LayoutProps<"/projects/[id]">["params"];
  children: React.ReactNode;
}) {
  const { id } = await params;
  const project = await getVideoProject(id);
  if (!project) notFound();
  const hasOriginal =
    project.originalNote !== null || project.originalRating !== null;

  return (
    <>
      <ProjectHeader
        key={project.id}
        project={project}
        allCategories={await listCategories()}
        defaultColour={await nextCategoryColour()}
      />
      {hasOriginal && (
        <OriginalIdea
          note={project.originalNote}
          rating={project.originalRating}
        />
      )}
      <ProjectTabs
        projectId={project.id}
        projectTitle={project.title}
        // Linked sources arrive with the Sources tab.
        sourceCount={0}
      />
      {children}
    </>
  );
}
