import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { CategoryChip } from "@/components/category-chip";
import { PageHeader } from "@/components/page-header";
import { StagePill } from "@/components/stage-pill";
import { getSpeakingRate, listVideoProjects } from "@/db";
import { editedLine, projectCountLine, speakingTime } from "@/lib/format";

const HEAD =
  "font-label font-semibold text-[11px] text-fg-muted uppercase tracking-[1.1px]";

export default function ProjectsPage() {
  return (
    <Suspense fallback={<PageHeader title="Video Projects" />}>
      <ProjectList />
    </Suspense>
  );
}

async function ProjectList() {
  const projects = await listVideoProjects();
  const rate = await getSpeakingRate();
  const now = new Date();
  return (
    <>
      <PageHeader
        title="Video Projects"
        subtitle={projectCountLine(projects.length)}
      />
      {projects.length === 0 && (
        <p className="text-[17px] text-fg-muted italic">
          No video projects yet.
        </p>
      )}
      {projects.length > 0 && (
        <div className="overflow-hidden rounded-[18px] border border-border-soft bg-surface-1">
          <div className="flex items-center gap-4 bg-surface-2 px-6 py-3.5">
            <p className={`${HEAD} flex-1`}>Title</p>
            <p className={`${HEAD} w-[150px]`}>Stage</p>
            <p className={`${HEAD} w-[300px]`}>Categories</p>
            <p className={`${HEAD} w-[100px]`}>Length</p>
            <p className={`${HEAD} w-[90px]`}>Sources</p>
            <span className="w-[18px]" />
          </div>
          <ul>
            {projects.map((p) => (
              <li key={p.id} className="border-border-soft border-t">
                <Link
                  href={`/projects/${p.id}`}
                  className="group flex items-center gap-4 px-6 py-[18px] transition-colors hover:bg-surface-2"
                >
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <p className="truncate font-semibold text-[21px] text-fg">
                      {p.title}
                    </p>
                    <p className="font-label text-fg-faint text-xs">
                      {editedLine(p.created, p.updated, now)}
                    </p>
                  </div>
                  <div className="w-[150px]">
                    <StagePill stage={p.stage} />
                  </div>
                  <div className="flex w-[300px] flex-wrap gap-1.5">
                    {p.categories.map((c) => (
                      <CategoryChip
                        key={c.id}
                        name={c.name}
                        colour={c.colour}
                      />
                    ))}
                  </div>
                  <p
                    className={`w-[100px] font-label font-medium text-sm ${
                      p.wordCount > 0 ? "text-fg" : "text-fg-faint"
                    }`}
                  >
                    {speakingTime(p.wordCount, rate)}
                  </p>
                  <div className="flex w-[90px] items-center gap-1.5 font-label font-medium text-fg-muted text-sm">
                    <Image
                      src="/design/icon-book-small.svg"
                      alt=""
                      width={16}
                      height={16}
                    />
                    {/* Linked sources arrive with the Sources tab. */}0
                  </div>
                  <Image
                    src="/design/icon-arrow.svg"
                    alt=""
                    width={18}
                    height={18}
                    className="opacity-0 transition-opacity group-hover:opacity-100"
                  />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="flex items-center gap-3 rounded-2xl border border-border-strong border-dashed px-5 py-4">
        <Image
          src="/design/icon-sparkle-hint.svg"
          alt=""
          width={18}
          height={18}
        />
        <p className="flex-1 text-[17px] text-fg-muted italic">
          New video projects are born on the{" "}
          <Link href="/ideas" className="text-accent-glow hover:underline">
            Idea list
          </Link>
          : pick an idea and choose “Make video project”.
        </p>
      </div>
    </>
  );
}
