import Link from "next/link";
import { StagePill } from "@/components/stage-pill";
import type { LinkedProject } from "@/db/project-sources";

/** The video projects a source is linked to. */
export function LinkedProjects({ projects }: { projects: LinkedProject[] }) {
  return (
    <section
      aria-label="Linked video projects"
      className="flex flex-col gap-2.5 rounded-[18px] border border-border-soft bg-surface-1 p-5"
    >
      <h2 className="font-label font-semibold text-[11px] text-fg-muted uppercase tracking-[1.1px]">
        Linked video projects
      </h2>
      {projects.length === 0 ? (
        <p className="text-[15px] text-fg-muted italic">
          Not linked to any video project yet.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {projects.map((p) => (
            <li key={p.id} className="flex items-center gap-2.5">
              <Link
                href={`/projects/${p.id}/sources`}
                className="min-w-0 flex-1 truncate font-semibold text-[17px] text-fg hover:underline"
              >
                {p.title}
              </Link>
              <StagePill stage={p.stage} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
