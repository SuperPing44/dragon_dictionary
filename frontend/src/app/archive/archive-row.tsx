import Image from "next/image";
import Link from "next/link";
import { categoryColour } from "@/components/category-chip";
import type { VideoProjectWithCategories } from "@/db/projects";
import { formatPublishDate, shortLink, speakingTime } from "@/lib/format";

type ArchiveRowProps = {
  project: VideoProjectWithCategories;
  /** Words per minute for the estimated length. */
  rate: number;
};

/**
 * An Archive row (spec §5.4, Figma A1): thumbnail, title and categories,
 * publish date, length, and the YouTube link or an amber "Add link".
 * The whole row opens the project; the YouTube link opens in a new tab.
 */
export function ArchiveRow({ project, rate }: ArchiveRowProps) {
  return (
    <li className="relative flex items-center gap-5 rounded-2xl border border-border-soft bg-surface-1 p-2 pr-3 transition-colors hover:border-border-strong hover:bg-surface-2">
      <div className="relative flex aspect-video w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-surface-2">
        {project.finalThumbnail ? (
          <Image
            src={`/api/thumbnails/${project.finalThumbnail}`}
            alt=""
            fill
            unoptimized
            sizes="96px"
            className="object-cover"
          />
        ) : (
          <Image
            src="/design/emblem.svg"
            alt=""
            width={26}
            height={26}
            className="opacity-30 grayscale"
          />
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <Link
          href={`/projects/${project.id}`}
          // The link covers the row, so clicking anywhere opens the project.
          className="truncate font-heading font-semibold text-[17px] text-fg after:absolute after:inset-0 after:rounded-2xl"
        >
          {project.title}
        </Link>
        {project.categories.length > 0 && (
          <ul
            aria-label="Categories"
            className="flex flex-wrap items-center gap-x-3 gap-y-1"
          >
            {project.categories.map((c) => (
              <li
                key={c.id}
                className="flex items-center gap-1.5 font-label text-[13px] text-fg-muted"
              >
                <span
                  aria-hidden
                  className="size-2 rounded-full"
                  style={{ backgroundColor: categoryColour(c.colour) }}
                />
                {c.name}
              </li>
            ))}
          </ul>
        )}
      </div>

      <p
        className={`w-32 shrink-0 font-label text-[14px] ${
          project.publishedOn ? "text-fg" : "text-fg-faint italic"
        }`}
      >
        {formatPublishDate(project.publishedOn)}
      </p>
      <p className="w-20 shrink-0 font-label text-[14px] text-fg-muted">
        {speakingTime(project.wordCount, rate)}
      </p>
      <div className="w-52 shrink-0">
        {project.youtubeLink ? (
          <a
            href={project.youtubeLink}
            target="_blank"
            rel="noopener noreferrer"
            className="relative z-10 flex max-w-full items-center gap-2 font-label text-[14px] text-accent-glow hover:underline"
          >
            <Image
              src="/design/icon-link-accent.svg"
              alt=""
              width={16}
              height={16}
            />
            <span className="truncate">{shortLink(project.youtubeLink)}</span>
          </a>
        ) : (
          <span className="inline-flex rounded-full bg-amber px-3.5 py-1 font-label font-semibold text-[13px] text-canvas">
            Add link
          </span>
        )}
      </div>
    </li>
  );
}
