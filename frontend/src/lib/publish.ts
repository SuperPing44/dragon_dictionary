/** Publishing a video project (spec §5.4). Client-safe. */

export type LinkCheck =
  | { ok: true; link: string | null; notYouTube: boolean }
  | { ok: false; error: string };

const YOUTUBE_HOSTS = ["youtube.com", "youtu.be"];

/** True for youtube.com, youtu.be and their subdomains (www., m.). */
function isYouTubeHost(host: string): boolean {
  const h = host.toLowerCase();
  return YOUTUBE_HOSTS.some((y) => h === y || h.endsWith(`.${y}`));
}

/**
 * Checks a YouTube link as typed. Blank means no link yet. Anything else
 * must be an http(s) URL; a link off YouTube is accepted with a hint.
 */
export function checkYouTubeLink(text: string): LinkCheck {
  const link = text.trim();
  if (!link) return { ok: true, link: null, notYouTube: false };
  let url: URL;
  try {
    url = new URL(link);
  } catch {
    return { ok: false, error: "Enter a full link starting with https://." };
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { ok: false, error: "Enter a full link starting with https://." };
  }
  return { ok: true, link, notYouTube: !isYouTubeHost(url.hostname) };
}

/** A real calendar date as `YYYY-MM-DD`. */
export function isIsoDate(text: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return false;
  const d = new Date(`${text}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(text);
}

/** Today in local time as `YYYY-MM-DD`, for the date input. */
export function localIsoDate(now: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** The dialog's starting values: the kept link and date, else today. */
export function publishPrefill(
  project: { youtubeLink: string | null; publishedOn: string | null },
  now: Date,
): { link: string; date: string } {
  return {
    link: project.youtubeLink ?? "",
    date: project.publishedOn ?? localIsoDate(now),
  };
}
