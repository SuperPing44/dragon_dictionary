import { Suspense } from "react";
import { listSections } from "@/db";
import { SECTION_KIND_LABELS } from "@/lib/labels";

/** The Script tab. The script editor replaces this outline in its own ticket. */
export default function ScriptTab({ params }: PageProps<"/projects/[id]">) {
  return (
    <Suspense>
      <Outline params={params} />
    </Suspense>
  );
}

async function Outline({
  params,
}: {
  params: PageProps<"/projects/[id]">["params"];
}) {
  const { id } = await params;
  const sections = await listSections(id);
  return (
    <section
      aria-label="Script outline"
      className="flex w-[310px] flex-col gap-1 rounded-[18px] border border-border-soft bg-surface-1 p-4"
    >
      <p className="px-2 pb-1 font-label font-semibold text-[11px] text-fg-muted uppercase tracking-[1.1px]">
        Outline
      </p>
      {sections.length === 0 ? (
        <p className="px-2 text-[16px] text-fg-muted italic">
          This script has no sections.
        </p>
      ) : (
        <ol className="flex flex-col gap-0.5">
          {sections.map((s) => (
            <li
              key={s.id}
              className={`rounded-lg px-2 py-1.5 text-[17px] text-fg ${s.parent ? "pl-8" : ""}`}
            >
              {s.kind ? SECTION_KIND_LABELS[s.kind] : s.title || "Untitled"}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
