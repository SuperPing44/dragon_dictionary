import Image from "next/image";
import { Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import { getSpeakingRate, listArchive, listCategories } from "@/db";
import { ArchiveList } from "./archive-list";

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
    <ArchiveList
      title={TITLE}
      projects={projects}
      categories={await listCategories()}
      rate={rate}
    />
  );
}
