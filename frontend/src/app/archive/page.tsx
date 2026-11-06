import Image from "next/image";
import { Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import { getSpeakingRate, listArchive } from "@/db";
import { archiveCountLine } from "@/lib/format";
import { ArchiveRow } from "./archive-row";

const TITLE = "Archive";

/** The Archive (spec §5.4, Figma A1): published projects, newest first. */
export default function ArchivePage() {
  return (
    <Suspense fallback={<PageHeader title={TITLE} />}>
      <Archive />
    </Suspense>
  );
}

async function Archive() {
  const projects = await listArchive();
  const rate = await getSpeakingRate();
  if (projects.length === 0) {
    return (
      <>
        <PageHeader title={TITLE} />
        <div className="flex items-center gap-3 rounded-2xl border border-border-strong border-dashed px-5 py-4">
          <Image src="/design/icon-archive.svg" alt="" width={20} height={20} />
          <p className="flex-1 text-[17px] text-fg-muted italic">
            Published videos appear here
          </p>
        </div>
      </>
    );
  }
  return (
    <>
      <PageHeader title={TITLE} subtitle={archiveCountLine(projects.length)} />
      <div className="flex min-h-0 flex-1 flex-col gap-2">
        <div
          aria-hidden
          className="flex items-center gap-5 px-3 font-label font-semibold text-[11px] text-fg-muted uppercase tracking-[1.1px]"
        >
          <span className="w-24 shrink-0" />
          <span className="flex-1">Video</span>
          <span className="w-32 shrink-0">Published</span>
          <span className="w-20 shrink-0">Length</span>
          <span className="w-52 shrink-0">YouTube</span>
        </div>
        <ul className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
          {projects.map((project) => (
            <ArchiveRow key={project.id} project={project} rate={rate} />
          ))}
        </ul>
      </div>
    </>
  );
}
