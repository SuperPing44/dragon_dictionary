/** The largest thumbnail draft that can be uploaded: 20 MB. */
export const MAX_THUMBNAIL_BYTES = 20 * 1024 * 1024;

/** YouTube's recommended minimum thumbnail size. */
export const MIN_WIDTH = 1280;
export const MIN_HEIGHT = 720;

/** The image types a thumbnail draft can be, by file extension. */
export const THUMBNAIL_TYPES = {
  png: "image/png",
  jpg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
} as const;
export type ThumbnailExt = keyof typeof THUMBNAIL_TYPES;

/** For the file picker's `accept`. */
export const THUMBNAIL_ACCEPT = Object.values(THUMBNAIL_TYPES).join(",");

/**
 * Whether a draft gets the amber "not 16:9" warning: it isn't 16:9 (within
 * a pixel of rounding) or is smaller than 1280×720.
 */
export function thumbnailWarning(width: number, height: number): boolean {
  const widescreen = Math.abs(height - (width * 9) / 16) < 1;
  return !widescreen || width < MIN_WIDTH || height < MIN_HEIGHT;
}

/** Why a file can't be a thumbnail draft, checked before uploading it. */
export function thumbnailRefusal(file: {
  name: string;
  type: string;
  size: number;
}): string | undefined {
  const types: string[] = Object.values(THUMBNAIL_TYPES);
  if (!types.includes(file.type)) {
    return `“${file.name}” isn’t a PNG, JPEG, WebP or GIF.`;
  }
  if (file.size > MAX_THUMBNAIL_BYTES) {
    return `“${file.name}” is over 20 MB.`;
  }
  return undefined;
}

const PASTED_EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};

/** The name of a pasted image, in local time: `pasted-2026-10-27-1432.png`. */
export function pastedImageName(type: string, now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const time = `${pad(now.getHours())}${pad(now.getMinutes())}`;
  return `pasted-${date}-${time}.${PASTED_EXT[type] ?? "png"}`;
}

/**
 * ← / → in the enlarged view: one draft back or forward, stopping at the
 * first and last draft (no wrap-around).
 */
export function stepDraft(index: number, step: -1 | 1, count: number): number {
  return Math.min(Math.max(index + step, 0), count - 1);
}

/**
 * Which draft the enlarged view shows after deleting the one at `index`:
 * the next one (now at the same index), the previous one if it was last,
 * or none (-1) when no draft is left.
 */
export function indexAfterDelete(index: number, countAfter: number): number {
  return countAfter === 0 ? -1 : Math.min(index, countAfter - 1);
}
