import { and, asc, desc, eq, gte, isNotNull, isNull, sql } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { canonicalInsertIndex, countWords, parseDoc } from "@/lib/script";
import type { Db } from "./connection";
import { EMPTY_DOC } from "./projects";
import {
  SECTION_KINDS,
  type Section,
  type SectionKind,
  section,
  videoProject,
} from "./schema";

function touchProject(db: Pick<Db, "update">, projectId: string, now: Date) {
  db.update(videoProject)
    .set({ updated: now.toISOString() })
    .where(eq(videoProject.id, projectId))
    .run();
}

/**
 * Saves a section's Tiptap JSON together with its word count (stage
 * directions excluded). Returns the stored word count.
 */
export function saveSectionContent(
  db: Db,
  sectionId: string,
  content: string,
  now = new Date(),
): number | undefined {
  const doc = parseDoc(content);
  if (doc.type !== "doc")
    throw new Error("Section content must be a document.");
  const wordCount = countWords(doc);
  const saved = db
    .update(section)
    .set({ content: JSON.stringify(doc), wordCount })
    .where(eq(section.id, sectionId))
    .returning({ project: section.videoProject })
    .get();
  if (!saved) return undefined;
  touchProject(db, saved.project, now);
  return wordCount;
}

/**
 * Adds a missing top-level section at its canonical position: after the
 * nearest preceding canonical kind that exists, otherwise at the top.
 */
export function addSection(
  db: Db,
  projectId: string,
  kind: SectionKind,
  now = new Date(),
): Section {
  if (!SECTION_KINDS.includes(kind)) throw new Error(`Unknown kind: ${kind}`);
  return db.transaction((tx) => {
    const tops = tx
      .select({ kind: section.kind, position: section.position })
      .from(section)
      .where(and(eq(section.videoProject, projectId), isNull(section.parent)))
      .orderBy(asc(section.position))
      .all();
    const kinds = tops.map((t) => t.kind as SectionKind);
    if (kinds.includes(kind)) {
      throw new Error(`This script already has a ${kind} section.`);
    }
    const index = canonicalInsertIndex(kinds, kind);
    // Positions can have gaps, so appending goes after the last one.
    const position =
      index < tops.length
        ? tops[index].position
        : (tops.at(-1)?.position ?? -1) + 1;
    tx.update(section)
      .set({ position: sql`${section.position} + 1` })
      .where(
        and(
          eq(section.videoProject, projectId),
          isNull(section.parent),
          gte(section.position, position),
        ),
      )
      .run();
    const added = tx
      .insert(section)
      .values({
        id: uuidv7(),
        videoProject: projectId,
        kind,
        position,
        content: EMPTY_DOC,
      })
      .returning()
      .get();
    touchProject(tx, projectId, now);
    return added;
  });
}

/** Removes a section; the Main part takes its subsections with it. */
export function removeSection(db: Db, sectionId: string, now = new Date()) {
  const removed = db
    .delete(section)
    .where(eq(section.id, sectionId))
    .returning({ project: section.videoProject })
    .get();
  if (removed) touchProject(db, removed.project, now);
}

/** Adds an empty subsection, titled "Untitled subsection", at the end of the Main part. */
export function addSubsection(
  db: Db,
  mainId: string,
  now = new Date(),
): Section {
  return db.transaction((tx) => {
    const main = tx.select().from(section).where(eq(section.id, mainId)).get();
    if (!main || main.kind !== "main") {
      throw new Error("Only the Main part has subsections.");
    }
    const last = tx
      .select({ position: section.position })
      .from(section)
      .where(eq(section.parent, mainId))
      .orderBy(desc(section.position))
      .get();
    const added = tx
      .insert(section)
      .values({
        id: uuidv7(),
        videoProject: main.videoProject,
        parent: mainId,
        title: "Untitled subsection",
        position: (last?.position ?? -1) + 1,
        content: EMPTY_DOC,
      })
      .returning()
      .get();
    touchProject(tx, main.videoProject, now);
    return added;
  });
}

/** Renames a subsection; an empty title is kept and shows as "Untitled". */
export function renameSubsection(
  db: Db,
  id: string,
  title: string,
  now = new Date(),
): void {
  const renamed = db
    .update(section)
    .set({ title: title.trim() })
    .where(and(eq(section.id, id), isNotNull(section.parent)))
    .returning({ project: section.videoProject })
    .get();
  if (renamed) touchProject(db, renamed.project, now);
}

/**
 * Sets the order of one sibling group: the project's top-level sections
 * (parent null) or the Main part's subsections. `orderedIds` must list
 * exactly the current siblings.
 */
export function reorderSections(
  db: Db,
  projectId: string,
  parent: string | null,
  orderedIds: string[],
  now = new Date(),
): void {
  db.transaction((tx) => {
    const siblings = tx
      .select({ id: section.id })
      .from(section)
      .where(
        and(
          eq(section.videoProject, projectId),
          parent === null ? isNull(section.parent) : eq(section.parent, parent),
        ),
      )
      .all()
      .map((s) => s.id);
    const same =
      siblings.length === orderedIds.length &&
      new Set(orderedIds).size === orderedIds.length &&
      orderedIds.every((id) => siblings.includes(id));
    if (!same) throw new Error("The new order must list exactly the siblings.");
    orderedIds.forEach((id, position) => {
      tx.update(section).set({ position }).where(eq(section.id, id)).run();
    });
    touchProject(tx, projectId, now);
  });
}
