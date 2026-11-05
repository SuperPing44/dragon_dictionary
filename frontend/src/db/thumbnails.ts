import { mkdir, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { and, asc, eq } from "drizzle-orm";
import { readImageInfo } from "@/lib/image-info";
import { MAX_THUMBNAIL_BYTES } from "@/lib/thumbnails";
import type { Db } from "./connection";
import { type ThumbnailDraft, thumbnailDraft, videoProject } from "./schema";

export class NotAnImageError extends Error {
  constructor() {
    super("Only PNG, JPEG, WebP or GIF images can be uploaded.");
  }
}

export class TooLargeError extends Error {
  constructor() {
    super("Thumbnail drafts can be up to 20 MB.");
  }
}

/** Where a project's drafts live: <files root>/thumbnails/<project-id>/. */
export function thumbnailDir(filesRoot: string, projectId: string): string {
  return path.join(filesRoot, "thumbnails", projectId);
}

export function thumbnailPath(
  filesRoot: string,
  draft: Pick<ThumbnailDraft, "id" | "videoProject" | "ext">,
): string {
  return path.join(
    thumbnailDir(filesRoot, draft.videoProject),
    `${draft.id}.${draft.ext}`,
  );
}

/** Reads an upload into memory, refusing it once it passes 20 MB. */
export async function readUpload(
  body: AsyncIterable<Uint8Array>,
): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of body) {
    size += chunk.length;
    if (size > MAX_THUMBNAIL_BYTES) throw new TooLargeError();
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

/**
 * Stores an uploaded image as a project's thumbnail draft and records it,
 * with its pixel size read from the file. The file is written under a
 * temporary name and renamed into place; if recording fails, it's removed.
 */
export async function addThumbnailDraft(
  db: Db,
  filesRoot: string,
  values: { id: string; videoProject: string; originalName: string },
  bytes: Buffer,
  now = new Date(),
): Promise<ThumbnailDraft> {
  if (bytes.length > MAX_THUMBNAIL_BYTES) throw new TooLargeError();
  const info = readImageInfo(bytes);
  if (!info) throw new NotAnImageError();
  const draft = { ...values, ext: info.ext };
  const final = thumbnailPath(filesRoot, draft);
  await mkdir(path.dirname(final), { recursive: true });
  await writeFile(`${final}.part`, bytes);
  await rename(`${final}.part`, final);
  try {
    return db.transaction((tx) => {
      const row = tx
        .insert(thumbnailDraft)
        .values({
          ...draft,
          size: bytes.length,
          width: info.width,
          height: info.height,
          uploaded: now.toISOString(),
        })
        .returning()
        .get();
      touch(tx, values.videoProject, now);
      return row;
    });
  } catch (error) {
    await rm(final, { force: true });
    throw error;
  }
}

function touch(db: Pick<Db, "update">, projectId: string, now: Date) {
  db.update(videoProject)
    .set({ updated: now.toISOString() })
    .where(eq(videoProject.id, projectId))
    .run();
}

/** A project's drafts in upload order. */
export function listThumbnailDrafts(
  db: Db,
  projectId: string,
): ThumbnailDraft[] {
  return db
    .select()
    .from(thumbnailDraft)
    .where(eq(thumbnailDraft.videoProject, projectId))
    .orderBy(asc(thumbnailDraft.uploaded), asc(thumbnailDraft.id))
    .all();
}

export function getThumbnailDraft(
  db: Db,
  id: string,
): ThumbnailDraft | undefined {
  return db
    .select()
    .from(thumbnailDraft)
    .where(eq(thumbnailDraft.id, id))
    .get();
}

/** Sets a draft's one-line note; a blank note is removed. */
export function setThumbnailNote(
  db: Db,
  id: string,
  note: string,
  now = new Date(),
): void {
  const clean = note.replace(/\s+/g, " ").trim();
  db.transaction((tx) => {
    const draft = tx
      .update(thumbnailDraft)
      .set({ note: clean || null })
      .where(eq(thumbnailDraft.id, id))
      .returning()
      .get();
    if (draft) touch(tx, draft.videoProject, now);
  });
}

/** Makes a draft the project's final thumbnail, moving the badge. */
export function markThumbnailFinal(
  db: Db,
  projectId: string,
  draftId: string,
  now = new Date(),
): void {
  db.transaction((tx) => {
    const draft = tx
      .select({ id: thumbnailDraft.id })
      .from(thumbnailDraft)
      .where(
        and(
          eq(thumbnailDraft.id, draftId),
          eq(thumbnailDraft.videoProject, projectId),
        ),
      )
      .get();
    if (!draft) throw new Error("That draft isn't on this project.");
    tx.update(videoProject)
      .set({ finalThumbnail: draftId, updated: now.toISOString() })
      .where(eq(videoProject.id, projectId))
      .run();
  });
}

/**
 * Deletes a draft's record (clearing the project's final if it was that
 * one), then its file on disk.
 */
export async function removeThumbnailDraft(
  db: Db,
  filesRoot: string,
  id: string,
  now = new Date(),
): Promise<void> {
  const removed = db.transaction((tx) => {
    const draft = tx
      .delete(thumbnailDraft)
      .where(eq(thumbnailDraft.id, id))
      .returning()
      .get();
    if (draft) touch(tx, draft.videoProject, now);
    return draft;
  });
  if (removed) await rm(thumbnailPath(filesRoot, removed), { force: true });
}

/** Removes a deleted project's draft files (after its records are gone). */
export async function removeProjectThumbnails(
  filesRoot: string,
  projectId: string,
): Promise<void> {
  await rm(thumbnailDir(filesRoot, projectId), {
    recursive: true,
    force: true,
  });
}
