import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import {
  getSpeakingRate,
  getVideoProject,
  listCategories,
  nextCategoryColour,
} from "@/db";
import { projectBackLink } from "@/lib/publish";
import { OriginalIdea } from "./original-idea";
import { ProjectHeader } from "./project-header";
import { ProjectTabs } from "./project-tabs";

export default function ProjectLayout({
  params,
  children,
}: LayoutProps<"/projects/[id]">) {
  return (
    <Suspense fallback={<BackLink stage={null} />}>
      <ProjectShell params={params}>{children}</ProjectShell>
    </Suspense>
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
      <BackLink stage={project.stage} />
      <ProjectHeader
        key={project.id}
        project={project}
        allCategories={await listCategories()}
        defaultColour={await nextCategoryColour()}
        rate={await getSpeakingRate()}
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
        sourceCount={project.sourceCount}
      />
      {children}
    </>
  );
}

/**
 * "← Video projects", or "← Archive" for a published project. While the
 * project loads it holds the space without guessing which one.
 */
function BackLink({ stage }: { stage: string | null }) {
  const className =
    "self-start font-label font-medium text-[13px] text-fg-muted hover:text-fg";
  if (stage === null) {
    return (
      <span aria-hidden className={`${className} invisible`}>
        ←
      </span>
    );
  }
  const { href, label } = projectBackLink(stage);
  return (
    <Link href={href} className={className}>
      {label}
    </Link>
  );
}
