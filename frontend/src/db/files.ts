import { once } from "node:events";
import { createWriteStream } from "node:fs";
import { mkdir, rename, rm } from "node:fs/promises";
import path from "node:path";
import type { Readable } from "node:stream";
import { asc, eq } from "drizzle-orm";
import type { Db } from "./connection";
import { type SourceFile, sourceFile } from "./schema";

/** Every PDF file starts with these bytes. */
const PDF_SIGNATURE = Buffer.from("%PDF-");

export class NotAPdfError extends Error {
  constructor() {
    super("Only PDFs can be uploaded.");
  }
}

/** Where a source's PDFs live: <files root>/<source-id>/. */
export function sourceDir(filesRoot: string, sourceId: string): string {
  return path.join(filesRoot, sourceId);
}

export function filePath(
  filesRoot: string,
  sourceId: string,
  fileId: string,
): string {
  return path.join(sourceDir(filesRoot, sourceId), `${fileId}.pdf`);
}

/**
 * Streams an upload to disk without holding it in memory, so a PDF of any
 * size works. It is written under a temporary name and only renamed into
 * place once complete; anything that doesn't start like a PDF is refused
 * and removed. Returns the size in bytes.
 */
export async function storeUpload(
  filesRoot: string,
  sourceId: string,
  fileId: string,
  body: Readable,
): Promise<number> {
  const final = filePath(filesRoot, sourceId, fileId);
  const partial = `${final}.part`;
  await mkdir(path.dirname(final), { recursive: true });
  const out = createWriteStream(partial);
  let size = 0;
  let head = Buffer.alloc(0);
  try {
    for await (const chunk of body) {
      const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      if (head.length < PDF_SIGNATURE.length) {
        head = Buffer.concat([head, bytes]).subarray(0, PDF_SIGNATURE.length);
        if (!PDF_SIGNATURE.subarray(0, head.length).equals(head)) {
          throw new NotAPdfError();
        }
      }
      size += bytes.length;
      if (!out.write(bytes)) {
        await new Promise<void>((resolve) => out.once("drain", resolve));
      }
    }
    if (head.length < PDF_SIGNATURE.length) throw new NotAPdfError();
    await new Promise<void>((resolve, reject) => {
      out.end((err?: Error | null) => (err ? reject(err) : resolve()));
    });
    await rename(partial, final);
    return size;
  } catch (error) {
    // The file is opened asynchronously: wait until the stream has closed,
    // or removing it could happen before it exists and leave it behind.
    out.destroy();
    if (!out.closed) await once(out, "close");
    await rm(partial, { force: true });
    throw error;
  }
}

/** PDFs of a source in upload order. */
export function listSourceFiles(db: Db, sourceId: string): SourceFile[] {
  return db
    .select()
    .from(sourceFile)
    .where(eq(sourceFile.source, sourceId))
    .orderBy(asc(sourceFile.uploaded), asc(sourceFile.id))
    .all();
}

export function getSourceFile(db: Db, id: string): SourceFile | undefined {
  return db.select().from(sourceFile).where(eq(sourceFile.id, id)).get();
}

export function addSourceFile(
  db: Db,
  values: { id: string; source: string; originalName: string; size: number },
  now = new Date(),
): SourceFile {
  return db
    .insert(sourceFile)
    .values({ ...values, uploaded: now.toISOString() })
    .returning()
    .get();
}

/** Removes a PDF's record, then its file on disk. */
export async function removeSourceFile(
  db: Db,
  filesRoot: string,
  id: string,
): Promise<void> {
  const removed = db
    .delete(sourceFile)
    .where(eq(sourceFile.id, id))
    .returning()
    .get();
  if (removed) {
    await rm(filePath(filesRoot, removed.source, removed.id), { force: true });
  }
}
