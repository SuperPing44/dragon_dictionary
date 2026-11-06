import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { categoryColour } from "@/components/category-chip";
import { PageHeader } from "@/components/page-header";
import {
  getSpeakingRate,
  listVideoProjects,
  type VideoProjectWithCategories,
} from "@/db";
import { boardColumns } from "@/lib/board";
import { boardCountLine, speakingTime } from "@/lib/format";
import { STAGE_LABELS } from "@/lib/labels";

const TITLE = "Video projects";

/** The Kanban board (spec §5.3, Figma K1): one column per stage. */
export default function ProjectsPage() {
  return (
    <Suspense fallback={<PageHeader title={TITLE} />}>
      <Board />
    </Suspense>
  );
}

async function Board() {
  const projects = await listVideoProjects();
  const rate = await getSpeakingRate();
  return (
    <>
      <PageHeader title={TITLE} subtitle={boardCountLine(projects.length)} />
      {projects.length === 0 ? (
        <IdeaListHint />
      ) : (
        <div className="flex min-h-0 flex-1 gap-3">
          {boardColumns(projects).map((column) => (
            <section
              key={column.stage}
              aria-label={STAGE_LABELS[column.stage]}
              className="flex min-w-0 flex-1 flex-col gap-2.5 rounded-[18px] border border-border-soft bg-surface-1 p-2.5"
            >
              <h2 className="flex items-baseline gap-2 px-1.5 pt-1">
                <span className="font-label font-semibold text-[11px] text-fg-muted uppercase tracking-[1.1px]">
                  {STAGE_LABELS[column.stage]}
                </span>
                <span className="font-label text-[12px] text-fg-faint tabular-nums">
                  {column.cards.length}
                </span>
              </h2>
              {column.cards.length === 0 ? (
                <p className="rounded-xl border border-border-strong border-dashed px-3 py-6 text-center text-[14px] text-fg-faint italic">
                  Nothing in {STAGE_LABELS[column.stage]}
                </p>
              ) : (
                <ul className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
                  {column.cards.map((project) => (
                    <li key={project.id}>
                      <BoardCard project={project} rate={rate} />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      )}
    </>
  );
}

/** A Board card: final thumbnail if any, title, category dots, length. */
function BoardCard({
  project,
  rate,
}: {
  project: VideoProjectWithCategories;
  rate: number;
}) {
  const sources = `${project.sourceCount} ${project.sourceCount === 1 ? "source" : "sources"}`;
  return (
    <Link
      href={`/projects/${project.id}`}
      className="flex flex-col gap-2 rounded-xl border border-border-soft bg-surface-2 p-2.5 transition-colors hover:border-border-strong hover:bg-surface-3"
    >
      {project.finalThumbnail && (
        <div className="relative aspect-video overflow-hidden rounded-lg bg-canvas">
          <Image
            src={`/api/thumbnails/${project.finalThumbnail}`}
            alt=""
            fill
            unoptimized
            sizes="240px"
            className="object-contain"
          />
        </div>
      )}
      <p className="line-clamp-3 font-heading font-semibold text-[15px] text-fg leading-snug">
        {project.title}
      </p>
      {project.categories.length > 0 && (
        <ul
          aria-label="Categories"
          className="flex flex-wrap items-center gap-1.5"
        >
          {project.categories.map((c) => (
            <li
              key={c.id}
              title={c.name}
              aria-label={c.name}
              className="size-2.5 rounded-full"
              style={{ backgroundColor: categoryColour(c.colour) }}
            />
          ))}
        </ul>
      )}
      <p className="font-label text-[12px] text-fg-muted">
        {speakingTime(project.wordCount, rate)} · {sources}
      </p>
    </Link>
  );
}

function IdeaListHint() {
  return (
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
  );
}
