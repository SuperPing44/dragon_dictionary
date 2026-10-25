import Image from "next/image";
import type { VideoStage } from "@/db/schema";
import { STAGE_LABELS } from "@/lib/labels";

export function StagePill({ stage }: { stage: VideoStage }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/10 px-2.5 py-1 font-bold font-heading text-[11px] text-accent-glow tracking-[0.88px]">
      <Image src="/design/stage-spark.svg" alt="" width={9} height={9} />
      {STAGE_LABELS[stage]}
    </span>
  );
}
