import Image from "next/image";
import { Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import { type Idea, listIdeas } from "@/db";
import { formatDay, ideaCountLine } from "@/lib/format";
import { captureIdea } from "./actions";

export default function IdeasPage() {
  return (
    <>
      <PageHeader
        title="Idea List"
        subtitle={
          <Suspense>
            <IdeaCount />
          </Suspense>
        }
      />
      <QuickCapture />
      <Suspense>
        <IdeaRows />
      </Suspense>
    </>
  );
}

function QuickCapture() {
  return (
    <form
      action={captureIdea}
      className="flex items-center gap-3 rounded-2xl border border-accent bg-surface-2 px-[18px] py-3.5 shadow-[0_0_22px_rgb(158_107_255/0.28)]"
    >
      <Image
        src="/design/icon-sparkle-capture.svg"
        alt=""
        width={22}
        height={22}
      />
      <input
        name="title"
        aria-label="Idea title"
        placeholder="Capture an idea — just a title, press Enter to keep it"
        autoComplete="off"
        // biome-ignore lint/a11y/noAutofocus: quick capture is the screen's main action
        autoFocus
        className="min-w-0 flex-1 bg-transparent text-[19px] text-fg outline-none placeholder:text-fg-faint"
      />
      <kbd className="rounded-md border border-border-strong bg-surface-3 px-2 py-[3px] font-label font-medium text-fg-muted text-xs">
        Enter ↵
      </kbd>
    </form>
  );
}

async function IdeaCount() {
  return ideaCountLine((await listIdeas()).length);
}

async function IdeaRows() {
  const ideas = await listIdeas();
  if (ideas.length === 0) {
    return (
      <p className="text-[17px] text-fg-muted italic">
        No ideas yet — capture one above.
      </p>
    );
  }
  const now = new Date();
  return (
    <ul className="flex flex-col gap-2.5">
      {ideas.map((idea) => (
        <IdeaRow key={idea.id} idea={idea} now={now} />
      ))}
    </ul>
  );
}

function IdeaRow({ idea, now }: { idea: Idea; now: Date }) {
  return (
    <li className="flex items-center gap-4 rounded-2xl border border-border-soft bg-surface-1 px-[18px] py-3.5">
      <RatingBadge rating={idea.rating} />
      <div className="flex min-w-0 flex-1 flex-col gap-[5px]">
        <p className="truncate font-semibold text-[21px] text-fg">
          {idea.title}
        </p>
        {idea.note && (
          <p className="truncate text-[15px] text-fg-muted italic">
            {idea.note}
          </p>
        )}
        <p className="font-label text-fg-faint text-xs">
          {formatDay(idea.created, now)}
        </p>
      </div>
    </li>
  );
}

function RatingBadge({ rating }: { rating: number | null }) {
  const rated = rating !== null;
  return (
    <span
      role="img"
      aria-label={rated ? `Rating ${rating}` : "Unrated"}
      className={`flex size-10 shrink-0 items-center justify-center rounded-xl border-[1.2px] font-bold font-heading text-[17px] ${
        rated
          ? "border-gold bg-gold/10 text-gold"
          : "border-border-strong bg-surface-2 text-fg-faint"
      }`}
    >
      {rated ? rating : "–"}
    </span>
  );
}
