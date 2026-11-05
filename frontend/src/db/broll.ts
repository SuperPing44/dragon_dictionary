import { asc, eq } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { withDirectionFound } from "@/lib/broll";
import { parseDoc } from "@/lib/script";
import type { Db } from "./connection";
import { type BrollItem, brollItem, section, videoProject } from "./schema";
import { saveSectionContent } from "./sections";

function touch(db: Pick<Db, "update">, projectId: string, now: Date) {
  db.update(videoProject)
    .set({ updated: now.toISOString() })
    .where(eq(videoProject.id, projectId))
    .run();
}

/**
 * Ticks or unticks a script item: the `found` attribute on the section's
 * index-th stage direction (ADR 0003), saving that section. Returns false
 * when the direction isn't there any more.
 */
export function setScriptItemFound(
  db: Db,
  sectionId: string,
  index: number,
  found: boolean,
  now = new Date(),
): boolean {
  // better-sqlite3 is synchronous, so nothing can save the section between
  // this read and the write.
  const row = db
    .select({ content: section.content })
    .from(section)
    .where(eq(section.id, sectionId))
    .get();
  if (!row) return false;
  const doc = withDirectionFound(parseDoc(row.content), index, found);
  if (!doc) return false;
  saveSectionContent(db, sectionId, JSON.stringify(doc), now);
  return true;
}

/** A project's extra items, in the order they were added. */
export function listBrollItems(db: Db, projectId: string): BrollItem[] {
  return db
    .select()
    .from(brollItem)
    .where(eq(brollItem.videoProject, projectId))
    .orderBy(asc(brollItem.created), asc(brollItem.id))
    .all();
}

/** Adds an extra item at the end; blank text is ignored. */
export function addBrollItem(
  db: Db,
  projectId: string,
  text: string,
  now = new Date(),
): BrollItem | undefined {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return undefined;
  return db.transaction((tx) => {
    const item = tx
      .insert(brollItem)
      .values({
        id: uuidv7(),
        videoProject: projectId,
        text: clean,
        created: now.toISOString(),
      })
      .returning()
      .get();
    touch(tx, projectId, now);
    return item;
  });
}

function changeItem(
  db: Db,
  id: string,
  values: Partial<Pick<BrollItem, "text" | "found">>,
  now: Date,
): void {
  db.transaction((tx) => {
    const item = tx
      .update(brollItem)
      .set(values)
      .where(eq(brollItem.id, id))
      .returning()
      .get();
    if (item) touch(tx, item.videoProject, now);
  });
}

/** Changes an extra item's text; blank text is ignored. */
export function editBrollItem(
  db: Db,
  id: string,
  text: string,
  now = new Date(),
): void {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean) changeItem(db, id, { text: clean }, now);
}

export function setBrollItemFound(
  db: Db,
  id: string,
  found: boolean,
  now = new Date(),
): void {
  changeItem(db, id, { found }, now);
}

export function deleteBrollItem(db: Db, id: string, now = new Date()): void {
  db.transaction((tx) => {
    const item = tx
      .delete(brollItem)
      .where(eq(brollItem.id, id))
      .returning()
      .get();
    if (item) touch(tx, item.videoProject, now);
  });
}
