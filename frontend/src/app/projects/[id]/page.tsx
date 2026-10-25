import { Suspense } from "react";
import { listSections } from "@/db";
import { ScriptEditor } from "./script-editor";

/** The Script tab. */
export default function ScriptTab({ params }: PageProps<"/projects/[id]">) {
  return (
    <Suspense>
      <Script params={params} />
    </Suspense>
  );
}

async function Script({
  params,
}: {
  params: PageProps<"/projects/[id]">["params"];
}) {
  const { id } = await params;
  return <ScriptEditor projectId={id} sections={await listSections(id)} />;
}
