import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getVideoProject, listBrollItems, listSections } from "@/db";
import { scriptBrollGroups } from "@/lib/broll";
import { BrollList } from "./broll-list";
import { EditingNote } from "./editing-note";

/** The Editing tab: the editing notes, with the B-roll list beside them (F3). */
export default function EditingTab({
  params,
}: PageProps<"/projects/[id]/editing">) {
  return (
    <Suspense>
      <Editing params={params} />
    </Suspense>
  );
}

async function Editing({
  params,
}: {
  params: PageProps<"/projects/[id]/editing">["params"];
}) {
  const { id } = await params;
  const project = await getVideoProject(id);
  if (!project) notFound();
  return (
    <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] items-start gap-6">
      <EditingNote
        key={project.id}
        projectId={project.id}
        saved={project.editingNote}
      />
      <BrollList
        projectId={project.id}
        groups={scriptBrollGroups(await listSections(project.id))}
        extras={(await listBrollItems(project.id)).map(
          ({ id, text, found }) => ({
            id,
            text,
            found,
          }),
        )}
      />
    </div>
  );
}
