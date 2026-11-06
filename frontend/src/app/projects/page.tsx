import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import { getSpeakingRate, listCategories, listVideoProjects } from "@/db";
import { boardCountLine } from "@/lib/format";
import { BoardView } from "./board-view";

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
  if (projects.length === 0) {
    return (
      <>
        <PageHeader title={TITLE} subtitle={boardCountLine(0)} />
        <IdeaListHint />
      </>
    );
  }
  return (
    <BoardView
      title={TITLE}
      projects={projects}
      categories={await listCategories()}
      rate={rate}
    />
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
